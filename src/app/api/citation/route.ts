import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { callLLM, extractJSON } from '@/lib/llm'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'

export const runtime = 'nodejs'
// A keyword-grounded run fires a real SERP lookup + competitor crawl before the model
// calls, and on a parse failure retries with a second model call — same 90s headroom as
// /api/gap, confirmed live that crawl + 2 sequential model calls can exceed 60s. The two
// model chains below run in parallel, so this ceiling covers the slower of the two rather
// than their sum.
export const maxDuration = 90

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

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // Charged once, against 'citation'. Previously this action billed twice — once here
    // and once on /api/queries — for work that overlapped almost entirely.
    const user = await requireAuth('citation')
    clerkId = user.clerkId
    const { content, summary, keyword } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }

    // Optional — grounds both halves in real SERP features, real schema types found on
    // today's top-ranking pages, and real related keywords/intent, instead of the model
    // inventing plausible-sounding advice. Absent or failed grounding falls back to the
    // exact pure-AI behaviour, for both halves independently.
    const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
    const grounding = kw
      ? await fetchKeywordGrounding(kw, { crawl: true }).catch(() => null)
      : null

    const realFeatures = grounding?.serp && grounding.serp.features.length > 0 ? grounding.serp.features : null
    const realSchemaTypes = grounding?.competitorPages
      ? [...new Set([...grounding.competitorPages.values()].flatMap(s => s.schemaTypes))]
      : []
    const comparedDomains = grounding?.serp?.items.map(i => i.domain) ?? []
    const realRelated = grounding?.related && grounding.related.length > 0 ? grounding.related : null
    const realIntent = grounding?.intent ?? null

    const citationLines = [
      realFeatures ? `Real SERP features currently live for "${kw}": ${realFeatures.join(', ')} — only recommend targeting a feature (e.g. AI Overview) if it is actually present here; do not assume features that aren't listed.` : null,
      realSchemaTypes.length > 0 ? `Real structured-data (schema.org) types actually found on today's top-ranking pages for this keyword: ${realSchemaTypes.join(', ')} — ground your schema-markup recommendations in what's genuinely being used, not a generic list.` : null,
    ].filter(Boolean).join('\n')

    const queriesLines = [
      realRelated ? `Real related search queries people actually use for "${kw}" (use these as strong candidates for the queries list, phrased naturally as an AI-search question where needed — don't only invent your own): ${realRelated.map(r => `${r.keyword} (vol ${r.volume}, kd ${r.difficulty})`).join('; ')}` : null,
      realIntent ? `Real primary search intent for "${kw}": ${realIntent}` : null,
    ].filter(Boolean).join('\n')

    const topic = `<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`

    // In parallel: the two halves share only their inputs, so serialising them would add
    // a whole model call's latency for nothing.
    const [citation, queries] = await Promise.all([
      generate(CITATION_SYSTEM, `Build AI citation plan.\n${topic}`, citationLines),
      generate(QUERIES_SYSTEM, `Map AI search queries.\n${topic}`, queriesLines),
    ])

    return apiSuccess({
      userPlan: user.plan,
      citation: {
        ...citation.parsed,
        dataQuality: {
          grounded: citation.grounded,
          serpFeaturesReal: citation.grounded && !!realFeatures,
          competitorSchemaTypesReal: citation.grounded && realSchemaTypes.length > 0,
          comparedDomains,
        },
      },
      queries: {
        ...queries.parsed,
        dataQuality: {
          grounded: queries.grounded,
          relatedKeywordsReal: queries.grounded && !!realRelated,
          searchIntentReal: queries.grounded && !!realIntent,
        },
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/citation' })
    return apiError(e)
  }
}
