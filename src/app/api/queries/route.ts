import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'

export const runtime = 'nodejs'
// Was previously unset (pure Claude call) — a keyword-grounded run also fires real
// DataForSEO lookups before the Claude call.
export const maxDuration = 60

const SYSTEM = `You are an AI search query strategist. Return ONLY valid JSON:
{"summary":"","queries":[{"query":"","intent":"informational|commercial|navigational","coverage":"strong|partial|weak","why":"","fix":""}]}
Rules: 10 specific AI search queries this content should answer. All strings concise.`

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('queries')
    clerkId = user.clerkId
    const { content, summary, keyword } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }

    // Optional — grounds the query map in real related keywords/search intent
    // instead of Claude inventing plausible-sounding queries from scratch. No
    // crawl needed here (this tool's real signal is query candidates, not named
    // competitor pages). Absent/failed grounding falls back to today's exact
    // pure-AI behavior.
    const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
    const grounding = kw
      ? await fetchKeywordGrounding(kw, { crawl: false }).catch(() => null)
      : null
    const realRelated = grounding?.related && grounding.related.length > 0 ? grounding.related : null
    const realIntent = grounding?.intent ?? null

    const realLines = [
      realRelated ? `Real related search queries people actually use for "${kw}" (use these as strong candidates for the queries list, phrased naturally as an AI-search question where needed — don't only invent your own): ${realRelated.map(r => `${r.keyword} (vol ${r.volume}, kd ${r.difficulty})`).join('; ')}` : null,
      realIntent ? `Real primary search intent for "${kw}": ${realIntent}` : null,
    ].filter(Boolean).join('\n')

    const prompt = `Map AI search queries.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>` +
      (realLines ? `\n\n${realLines}` : '')

    const raw = await callClaude(SYSTEM, prompt, 2000)
    return apiSuccess({
      ...extractJSON(raw),
      userPlan: user.plan,
      dataQuality: {
        grounded: !!realRelated || !!realIntent,
        relatedKeywordsReal: !!realRelated,
        searchIntentReal: !!realIntent,
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/queries' })
    return apiError(e)
  }
}
