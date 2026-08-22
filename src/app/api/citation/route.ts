import { NextRequest } from 'next/server'
import { requireAuth, requireToolAccess, assertQuotaAvailable, AuthError, refundUsage } from '@/lib/auth'
import { callLLM, extractJSON } from '@/lib/llm'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'

export const runtime = 'nodejs'
/**
 * One half per request.
 *
 * Both halves in one request cannot work on the current Groq plan. Each reserves its
 * prompt plus max_tokens (2,000 plus a 1,200 reasoning allowance) against an 8,000/min
 * bucket, so a grounded pair is ~9,400 tokens and cannot fit inside one minute however
 * it is ordered. Measured 2026-08-22: the second half was refused for capacity at 19.9s
 * and the run 503'd. Promise.all made it worse rather than better — the limiter already
 * serialised the two, so concurrency only added a race against the queue deadline.
 *
 * Split, each request reserves ~4,700 and the bucket refills between them while the
 * client does the waiting rather than a serverless function. That also puts each request
 * well inside Clerk's 61s session token, which a 90s ceiling never could.
 */
export const maxDuration = 60

/**
 * The AI Visibility tool: a citation plan and a query map, from one request.
 *
 * These were two routes, /api/citation and /api/queries, which the dashboard fired in
 * parallel with an identical body. Each independently called fetchKeywordGrounding() on
 * the *same* keyword, so one click cost six DataForSEO calls to obtain two copies of the
 * same three answers — and, once the missing cost weights were added, four billed units
 * for one user action.
 *
 * They were never separable in practice: one page, one button, one keyword. So the
 * grounding is fetched once here and fed to both prompts. The crawl is enabled because the
 * citation half needs competitor schema types; the query half needs only related keywords
 * and intent, which the same fetch already returns.
 */

const CITATION_SYSTEM = `You are an AI citation strategy expert. Analyse the content and return ONLY valid JSON:
{"summary":"","plan":[{"title":"","action":"","why":"","impact":"high|medium|low","effort":"low|medium|high"}]}
Rules: 8 specific citation-building actions. All strings concise. Always return this exact JSON schema, never plain text — if real competitor signals are provided but turn out thin or irrelevant (e.g. navigation/boilerplate from a video platform instead of substantive content), base your plan on general citation best practices for the topic instead, but still return valid JSON matching the schema.`

const QUERIES_SYSTEM = `You are an AI search query strategist. Return ONLY valid JSON:
{"summary":"","queries":[{"query":"","intent":"informational|commercial|navigational","coverage":"strong|partial|weak","why":"","fix":""}]}
Rules: 10 specific AI search queries this content should answer. All strings concise.`

/**
 * One model call, with the ungrounded retry both halves already had.
 *
 * Grounding failing must never make this tool less reliable than it was before grounding
 * existed: if the grounded prompt produces something unparseable, we retry once on the
 * bare prompt and report the result as ungrounded rather than surfacing an error.
 */
async function generate(
  system: string,
  basePrompt: string,
  realLines: string
): Promise<{ parsed: Record<string, unknown>; grounded: boolean }> {
  const raw = await callLLM(system, basePrompt + (realLines ? `\n\n${realLines}` : ''), 2000)
  try {
    return { parsed: extractJSON(raw), grounded: !!realLines }
  } catch (parseErr) {
    if (!realLines) throw parseErr
    const rawRetry = await callLLM(system, basePrompt, 2000)
    return { parsed: extractJSON(rawRetry), grounded: false }
  }
}

/** The two halves, in the order the client walks them. The last one bills. */
const HALVES = ['citation', 'queries'] as const
type Half = typeof HALVES[number]

/**
 * What the first request hands to the second so the keyword is grounded only once.
 *
 * The derived prompt lines travel rather than the raw grounding: it is all the second half
 * needs, and it keeps the payload small. It comes back via the client, so every field is
 * length-capped on arrival - an unbounded citationLines would go straight into a prompt and
 * blow the very token budget this split exists to respect.
 */
type Grounding = {
  citationLines: string
  queriesLines: string
  comparedDomains: string[]
  serpFeaturesReal: boolean
  competitorSchemaTypesReal: boolean
  relatedKeywordsReal: boolean
  searchIntentReal: boolean
}

const EMPTY_GROUNDING: Grounding = {
  citationLines: '', queriesLines: '', comparedDomains: [],
  serpFeaturesReal: false, competitorSchemaTypesReal: false,
  relatedKeywordsReal: false, searchIntentReal: false,
}

function capGrounding(v: unknown): Grounding {
  if (!v || typeof v !== 'object') return EMPTY_GROUNDING
  const g = v as Record<string, unknown>
  const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 4_000) : '')
  return {
    citationLines: str(g.citationLines),
    queriesLines: str(g.queriesLines),
    comparedDomains: Array.isArray(g.comparedDomains)
      ? (g.comparedDomains.filter(d => typeof d === 'string') as string[]).slice(0, 20)
      : [],
    serpFeaturesReal: !!g.serpFeaturesReal,
    competitorSchemaTypesReal: !!g.competitorSchemaTypesReal,
    relatedKeywordsReal: !!g.relatedKeywordsReal,
    searchIntentReal: !!g.searchIntentReal,
  }
}

/** The paid part: one SERP lookup plus competitor crawl, done once for both halves. */
async function buildGrounding(keyword: unknown): Promise<Grounding> {
  const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
  if (!kw) return EMPTY_GROUNDING

  const grounding = await fetchKeywordGrounding(kw, { crawl: true }).catch(() => null)
  if (!grounding) return EMPTY_GROUNDING

  const realFeatures = grounding.serp && grounding.serp.features.length > 0 ? grounding.serp.features : null
  const realSchemaTypes = grounding.competitorPages
    ? [...new Set([...grounding.competitorPages.values()].flatMap(s => s.schemaTypes))]
    : []
  const realRelated = grounding.related && grounding.related.length > 0 ? grounding.related : null
  const realIntent = grounding.intent ?? null

  return {
    citationLines: [
      realFeatures ? `Real SERP features currently live for "${kw}": ${realFeatures.join(', ')} - only recommend targeting a feature (e.g. AI Overview) if it is actually present here; do not assume features that aren't listed.` : null,
      realSchemaTypes.length > 0 ? `Real structured-data (schema.org) types actually found on today's top-ranking pages for this keyword: ${realSchemaTypes.join(', ')} - ground your schema-markup recommendations in what's genuinely being used, not a generic list.` : null,
    ].filter(Boolean).join('\n'),
    queriesLines: [
      realRelated ? `Real related search queries people actually use for "${kw}" (use these as strong candidates for the queries list, phrased naturally as an AI-search question where needed - don't only invent your own): ${realRelated.map(r => `${r.keyword} (vol ${r.volume}, kd ${r.difficulty})`).join('; ')}` : null,
      realIntent ? `Real primary search intent for "${kw}": ${realIntent}` : null,
    ].filter(Boolean).join('\n'),
    comparedDomains: grounding.serp?.items.map(i => i.domain) ?? [],
    serpFeaturesReal: !!realFeatures,
    competitorSchemaTypesReal: realSchemaTypes.length > 0,
    relatedKeywordsReal: !!realRelated,
    searchIntentReal: !!realIntent,
  }
}

export async function POST(req: NextRequest) {
  // Set once requireAuth has taken the units, so the catch can hand them back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const { half, content, summary, keyword, grounding } = await req.json()

    if (!HALVES.includes(half as Half)) throw new AuthError(400, 'Unknown half')
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }

    // Billed once, on the half that completes the run, so abandoning it after the first
    // costs nothing. The first half checks the allowance without spending it, so someone
    // already out of allowance is refused before the paid SERP lookup rather than after it.
    const isLast = half === HALVES[HALVES.length - 1]
    const user = isLast ? await requireAuth('citation') : await requireToolAccess('citation')
    clerkId = user.clerkId
    if (isLast) charged = user.userId
    else await assertQuotaAvailable(user, 'citation')

    // Grounded once per run: the first half pays for the SERP lookup and crawl and hands the
    // derived lines to the second. Re-fetching here would double a paid call for one click -
    // the exact bug that merging the old /api/citation and /api/queries routes fixed, and it
    // must not come back with the split.
    const g = grounding !== undefined ? capGrounding(grounding) : await buildGrounding(keyword)

    const topic = `<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`

    if (half === 'citation') {
      const r = await generate(CITATION_SYSTEM, `Build AI citation plan.\n${topic}`, g.citationLines)
      return apiSuccess({
        half,
        userPlan: user.plan,
        // Handed back for the second request, so the keyword is grounded only once.
        grounding: g,
        result: {
          ...r.parsed,
          dataQuality: {
            grounded: r.grounded,
            serpFeaturesReal: r.grounded && g.serpFeaturesReal,
            competitorSchemaTypesReal: r.grounded && g.competitorSchemaTypesReal,
            comparedDomains: g.comparedDomains,
          },
        },
      })
    }

    const r = await generate(QUERIES_SYSTEM, `Map AI search queries.\n${topic}`, g.queriesLines)
    return apiSuccess({
      half,
      userPlan: user.plan,
      result: {
        ...r.parsed,
        dataQuality: {
          grounded: r.grounded,
          relatedKeywordsReal: r.grounded && g.relatedKeywordsReal,
          searchIntentReal: r.grounded && g.searchIntentReal,
        },
      },
    })
  } catch (e) {
    // Only the second half charges, so this only ever refunds that one. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'citation')

    await captureServerException(clerkId, e, { route: '/api/citation' })
    return apiError(e)
  }
}
