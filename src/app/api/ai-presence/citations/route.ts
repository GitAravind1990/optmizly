import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { authorise, loadPresence } from '@/lib/ai-presence/service'
import { authorityShare, citationMetrics } from '@/lib/ai-presence/derive'
import { SOURCE_LABEL } from '@/lib/ai-presence/config'

export const runtime = 'nodejs'

/**
 * Citation performance: count, rate, cited pages, and share of authority.
 *
 * "Citation" here means one thing only and it is worth stating: the customer's domain
 * appeared among the sources of an AI answer Optmizly requested. It does not mean an AI
 * crawler fetched the page, and it does not mean a model was trained on it — neither of
 * which this product can observe.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30))

    const presence = await loadPresence(user.userId, { brand, days })
    if (!presence.scope) {
      return apiSuccess({ citations: null, empty: 'No AI visibility scans yet.' })
    }

    const host = presence.scope.host
    const metrics = citationMetrics(presence.observations, host)
    const authority = authorityShare(presence.observations, host)

    return apiSuccess({
      scope: { brand: presence.scope.brand, domain: presence.scope.domain },
      periodDays: days,
      citationCount: metrics.citationCount,
      opportunities: metrics.opportunities,
      citationRate: metrics.citationRate,
      citedPages: metrics.citedPages,
      // Distinguishes "this run never recorded URLs" from "no pages were cited". Without it
      // an older scan would look like a total failure to be cited at page level.
      citedPagesUnavailable: metrics.pagesUnavailable,
      citedPagesNote: metrics.pagesUnavailable
        ? 'Cited page URLs were not captured for scans in this period. New scans record them.'
        : null,
      authority: {
        targetCitations: authority.targetCitations,
        totalCitations: authority.totalCitations,
        share: authority.share,
        // Never "competitors" at this layer: these are simply the domains the answers cited.
        otherCitedDomains: authority.topDomains,
        label: 'AI Share of Authority',
        note: 'Share of citations within the AI answers Optmizly measured for this brand. Not a search ranking.',
      },
      empty: metrics.opportunities === 0 ? 'No AI answers in this period, so there were no citation opportunities.' : null,
      noCitations: metrics.opportunities > 0 && metrics.citationCount === 0
        ? 'No citations detected in the current monitoring period.'
        : null,
      provenance: { citations: SOURCE_LABEL.OBSERVED },
    })
  } catch (e) {
    return apiError(e)
  }
}
