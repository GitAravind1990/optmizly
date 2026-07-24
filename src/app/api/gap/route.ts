import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'
import type { SerpResult } from '@/lib/dataforseo'
import type { CompetitorPageStats } from '@/lib/competitor-crawl'

export const runtime = 'nodejs'
// Was previously unset (pure Claude call) — a keyword-grounded run also fires a
// real SERP lookup + up to 5-page competitor crawl before the Claude call, so give
// it the same explicit headroom used elsewhere for real-data-backed routes.
export const maxDuration = 60

const SYSTEM = `You are a content gap analyst. Return ONLY valid JSON:
{"summary":"","gaps":[{"title":"","why":"","opportunity":"high|medium|low","suggested_section":""}]}
Rules: 8 specific content gaps vs what top-ranking competitors cover. All strings concise. Always return this exact JSON schema, never plain text — if real competitor excerpts are provided but turn out thin, irrelevant, or non-substantive (e.g. navigation/boilerplate from a video platform), base your gaps on general best practices for the topic instead, but still return valid JSON matching the schema.`

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('gap')
    clerkId = user.clerkId
    const { content, summary, keyword } = await req.json()

    // Optional — grounds the analysis in real competitor pages instead of Claude's
    // own general knowledge. Absent, non-string, or a failed real-data fetch all
    // degrade the same way: today's exact pure-AI behavior, never a hard failure.
    const kw = typeof keyword === 'string' ? keyword.trim().slice(0, 200) : ''
    const grounding = kw
      ? await fetchKeywordGrounding(kw, { crawl: true, crawlTextExcerpt: true }).catch(() => null)
      : null
    const realSerp = grounding?.serp && grounding.serp.items.length > 0 ? grounding.serp.items : null

    const crawledEntries = realSerp
      ? realSerp
          .map(r => ({ r, stats: grounding!.competitorPages?.get(r.url) }))
          .filter((e): e is { r: SerpResult; stats: CompetitorPageStats } => !!e.stats?.textExcerpt)
      : []
    const comparedDomains = crawledEntries.map(e => e.r.domain)

    const groundingBlock = crawledEntries.length > 0
      ? `Real current top-ranking competitor pages for "${kw}" — compare the user's content against these SPECIFIC pages, not generic/hypothetical competitors:\n\n` +
        crawledEntries.map(e => `<competitor domain="${e.r.domain}" rank="${e.r.rank}" url="${e.r.url}">\n${e.stats.textExcerpt}\n</competitor>`).join('\n\n')
      : null

    const basePrompt = `Find content gaps.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`
    const prompt = basePrompt + (groundingBlock ? `\n\n${groundingBlock}` : '')

    const raw = await callClaude(SYSTEM, prompt, 2000)
    let grounded = crawledEntries.length > 0
    let parsed
    try {
      parsed = extractJSON(raw)
    } catch (parseErr) {
      // A prompt instruction alone doesn't reliably stop Claude from responding
      // with plain-text commentary instead of JSON when the real crawled excerpts
      // turn out to be irrelevant/boilerplate (observed live: real SERP results
      // for an edge-case keyword were video-platform nav content, and Claude
      // narrated about that instead of forcing the schema). Real-data grounding
      // failing must never make this tool LESS reliable than before it existed —
      // retry once, ungrounded, rather than surfacing a hard failure to a user
      // who just happened to type a keyword.
      if (!groundingBlock) throw parseErr
      const rawRetry = await callClaude(SYSTEM, basePrompt, 2000)
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
    await captureServerException(clerkId, e, { route: '/api/gap' })
    return apiError(e)
  }
}
