import { NextRequest } from 'next/server'
import { requireToolAccess, assertQuotaAvailable, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchKeywordGrounding } from '@/lib/content-grounding'
import type { SerpResult } from '@/lib/dataforseo'
import type { CompetitorPageStats } from '@/lib/competitor-crawl'

export const runtime = 'nodejs'
/**
 * The paid, slow half of Content Gap, split out of /api/gap.
 *
 * /api/gap used to do the SERP lookup, a five-page competitor crawl and one or two model calls
 * in a single POST, which needed maxDuration 90 and had been measured timing out at 60. A
 * signed-in POST that long is a promise the platform may not keep: Clerk's session token
 * expires 61s after minting, a POST cannot be refreshed through the handshake, and the
 * rejection can land *after* the handler finished — so the user pays a unit, the work
 * completes, and the response says "Not authenticated". The route never sees that 401, so it
 * cannot refund, log or report it.
 *
 * Split, this request is a SERP call plus a crawl the crawler already bounds at 15s, and
 * /api/gap is left with model calls only. Both sit well inside 60.
 */
export const maxDuration = 60

/** Matches the cap in /api/gap, which is the only consumer of this response. */
const MAX_BLOCK_CHARS = 10_000

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // Tier check but no charge. The unit is taken by /api/gap, which is the request that
    // returns something the user keeps, so a run abandoned after grounding costs them nothing.
    // assertQuotaAvailable still refuses anyone already at their limit *before* we spend
    // DataForSEO money on their behalf rather than after it.
    const user = await requireToolAccess('gap')
    clerkId = user.clerkId
    await assertQuotaAvailable(user, 'gap')

    const body = (await req.json().catch(() => ({}))) as { keyword?: unknown }
    const kw = typeof body.keyword === 'string' ? body.keyword.trim().slice(0, 200) : ''
    if (!kw) throw new AuthError(400, 'A target keyword is required to ground the analysis')

    // Absent, non-string or a failed fetch all degrade the same way: /api/gap runs ungrounded,
    // exactly as it did before grounding existed. Never a hard failure.
    const grounding = await fetchKeywordGrounding(kw, { crawl: true, crawlTextExcerpt: true }).catch(() => null)
    const realSerp = grounding?.serp && grounding.serp.items.length > 0 ? grounding.serp.items : null

    const crawledEntries = realSerp
      ? realSerp
          .map(r => ({ r, stats: grounding!.competitorPages?.get(r.url) }))
          .filter((e): e is { r: SerpResult; stats: CompetitorPageStats } => !!e.stats?.textExcerpt)
      : []

    // Built here rather than in /api/gap so the excerpts do not have to travel twice. Five
    // competitors at 1,500 chars each plus the wrapper tags is ~8.2k, inside the 10k cap.
    const block = crawledEntries.length > 0
      ? `Real current top-ranking competitor pages for "${kw}" — compare the user's content against these SPECIFIC pages, not generic/hypothetical competitors:\n\n` +
        crawledEntries
          .map(e => `<competitor domain="${e.r.domain}" rank="${e.r.rank}" url="${e.r.url}">\n${e.stats.textExcerpt}\n</competitor>`)
          .join('\n\n')
      : ''

    return apiSuccess({
      grounding: {
        block: block.slice(0, MAX_BLOCK_CHARS),
        comparedDomains: crawledEntries.map(e => e.r.domain),
        grounded: crawledEntries.length > 0,
      },
    })
  } catch (e) {
    // No refundUsage here, and that is correct rather than an omission: this route never
    // charges. The unit is taken by /api/gap.
    await captureServerException(clerkId, e, { route: '/api/gap/ground' })
    return apiError(e)
  }
}
