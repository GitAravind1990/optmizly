import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'

export const runtime = 'nodejs'
// Was previously unset (pure Claude call) — a keyword-grounded run also fires a
// real SERP lookup + competitor crawl before the Claude call.
export const maxDuration = 60

const SYSTEM = `You are an AI citation strategy expert. Analyse the content and return ONLY valid JSON:
{"summary":"","plan":[{"title":"","action":"","why":"","impact":"high|medium|low","effort":"low|medium|high"}]}
Rules: 8 specific citation-building actions. All strings concise. Always return this exact JSON schema, never plain text — if real competitor signals are provided but turn out thin or irrelevant (e.g. navigation/boilerplate from a video platform instead of substantive content), base your plan on general citation best practices for the topic instead, but still return valid JSON matching the schema.`

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('citation')
    clerkId = user.clerkId
    const { content, summary, keyword } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }

    // Optional — grounds the citation strategy in real SERP features and real
    // schema types actually found on today's top-ranking pages, instead of Claude
    // inventing generic advice. Absent/failed grounding just falls back to today's
    // exact pure-AI behavior.
    const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
    const grounding = kw
      ? await fetchKeywordGrounding(kw, { crawl: true }).catch(() => null)
      : null
    const realFeatures = grounding?.serp && grounding.serp.features.length > 0 ? grounding.serp.features : null
    const realSchemaTypes = grounding?.competitorPages
      ? [...new Set([...grounding.competitorPages.values()].flatMap(s => s.schemaTypes))]
      : []
    const comparedDomains = grounding?.serp?.items.map(i => i.domain) ?? []

    const realLines = [
      realFeatures ? `Real SERP features currently live for "${kw}": ${realFeatures.join(', ')} — only recommend targeting a feature (e.g. AI Overview) if it is actually present here; do not assume features that aren't listed.` : null,
      realSchemaTypes.length > 0 ? `Real structured-data (schema.org) types actually found on today's top-ranking pages for this keyword: ${realSchemaTypes.join(', ')} — ground your schema-markup recommendations in what's genuinely being used, not a generic list.` : null,
    ].filter(Boolean).join('\n')

    const basePrompt = `Build AI citation plan.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`
    const prompt = basePrompt + (realLines ? `\n\n${realLines}` : '')

    const raw = await callClaude(SYSTEM, prompt, 2000)
    let grounded = !!realFeatures || realSchemaTypes.length > 0
    let parsed
    try {
      parsed = extractJSON(raw)
    } catch (parseErr) {
      // Same defensive retry as /api/gap — real crawled schema-type signals can
      // still leave Claude responding with commentary instead of JSON in rare
      // cases; grounding failing must never make this tool less reliable than
      // before it existed.
      if (!realLines) throw parseErr
      const rawRetry = await callClaude(SYSTEM, basePrompt, 2000)
      parsed = extractJSON(rawRetry)
      grounded = false
    }

    return apiSuccess({
      ...parsed,
      userPlan: user.plan,
      dataQuality: {
        grounded,
        serpFeaturesReal: grounded && !!realFeatures,
        competitorSchemaTypesReal: grounded && realSchemaTypes.length > 0,
        comparedDomains: grounded ? comparedDomains : [],
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/citation' })
    return apiError(e)
  }
}
