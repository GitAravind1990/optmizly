import { NextRequest } from 'next/server'
import { requireAuth, refundUsage, AuthError } from '@/lib/auth'
import { callLLM, extractJSON } from '@/lib/llm'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
/**
 * Model calls only. The SERP lookup and five-page crawl now live in /api/gap/ground.
 *
 * This route was at 90 because it did all of it in one POST, and had been measured hitting a
 * real "Task timed out" past 60. That is worse than a timeout: Clerk's session token expires
 * 61s after minting and a POST cannot be refreshed, so the rejection can land after the work
 * finished — charging the user for a run whose response says "Not authenticated", where the
 * route cannot see the 401 and so cannot refund it.
 *
 * What is left is one model call, plus one retry when the grounded prompt comes back
 * unparseable. Grounding is never fetched here: the client calls /api/gap/ground first and
 * passes the block in. Re-deriving it on this route would restore the long request and pay
 * DataForSEO twice for one click.
 */
export const maxDuration = 60

const SYSTEM = `You are a content gap analyst. Return ONLY valid JSON:
{"summary":"","gaps":[{"title":"","why":"","opportunity":"high|medium|low","suggested_section":""}]}
Rules: 8 specific content gaps vs what top-ranking competitors cover. All strings concise. Always return this exact JSON schema, never plain text — if real competitor excerpts are provided but turn out thin, irrelevant, or non-substantive (e.g. navigation/boilerplate from a video platform), base your gaps on general best practices for the topic instead, but still return valid JSON matching the schema.`

/** What /api/gap/ground hands back, bounded because it arrives via the client. */
type Grounding = { block: string; comparedDomains: string[]; grounded: boolean }

const EMPTY_GROUNDING: Grounding = { block: '', comparedDomains: [], grounded: false }

/** Mirrors the cap in /api/gap/ground; five competitors at 1,500 chars is ~8.2k. */
const MAX_BLOCK_CHARS = 10_000

function capGrounding(v: unknown): Grounding {
  if (!v || typeof v !== 'object') return EMPTY_GROUNDING
  const g = v as Record<string, unknown>
  return {
    block: typeof g.block === 'string' ? g.block.slice(0, MAX_BLOCK_CHARS) : '',
    comparedDomains: Array.isArray(g.comparedDomains)
      ? (g.comparedDomains.filter(d => typeof d === 'string') as string[]).slice(0, 20)
      : [],
    grounded: !!g.grounded,
  }
}

export async function POST(req: NextRequest) {
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const user = await requireAuth('gap')
    clerkId = user.clerkId
    charged = user.userId
    const { content, summary, keyword, grounding } = await req.json()

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }

    // Comes back through the client from /api/gap/ground, so every field is bounded on
    // arrival. An uncapped block would go straight into a prompt, and Groq charges the
    // per-minute bucket prompt + max_tokens on acceptance — an unbounded field here is a
    // way to make someone else's run 429.
    const g = capGrounding(grounding)
    const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
    const groundingBlock = g.block || null
    const comparedDomains = g.comparedDomains

    const basePrompt = `Find content gaps.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`
    const prompt = basePrompt + (groundingBlock ? `\n\n${groundingBlock}` : '')

    const raw = await callLLM(SYSTEM, prompt, 2000)
    let grounded = !!groundingBlock
    let parsed
    try {
      parsed = extractJSON(raw)
    } catch (parseErr) {
      // A prompt instruction alone doesn't reliably stop the model from responding
      // with plain-text commentary instead of JSON when the real crawled excerpts
      // turn out to be irrelevant/boilerplate (observed live: real SERP results
      // for an edge-case keyword were video-platform nav content, and the model
      // narrated about that instead of forcing the schema). Real-data grounding
      // failing must never make this tool LESS reliable than before it existed —
      // retry once, ungrounded, rather than surfacing a hard failure to a user
      // who just happened to type a keyword.
      if (!groundingBlock) throw parseErr
      const rawRetry = await callLLM(SYSTEM, basePrompt, 2000)
      parsed = extractJSON(rawRetry)
      grounded = false
    }

    return apiSuccess({
      ...parsed,
      userPlan: user.plan,
      dataQuality: {
        grounded,
        keywordProvided: !!kw,
        comparedDomains: grounded ? comparedDomains : [],
      },
    })
  } catch (e) {
    // requireAuth charged before any work happened, so a run that ends here
    // never delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'gap')

    await captureServerException(clerkId, e, { route: '/api/gap' })
    return apiError(e)
  }
}
