import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { authorise, loadPresence } from '@/lib/ai-presence/service'
import { citationGaps } from '@/lib/ai-presence/derive'
import { NEVER_COMPETITOR, SOURCE_LABEL } from '@/lib/ai-presence/config'

export const runtime = 'nodejs'

/**
 * Competitor citation gaps: a marked rival was cited for a query and this domain was not.
 *
 * Requires the customer to have marked at least one competitor. That is not a missing
 * feature — it is the design. An AI answer cites whatever it used, which is routinely
 * Wikipedia, Reddit or a newspaper, and auto-promoting those to "competitor" would fill this
 * table with gaps against sources nobody is competing with. With no rivals marked, the
 * honest output is no gaps and a prompt to mark some.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30))

    const presence = await loadPresence(user.userId, { brand, days })
    if (!presence.scope) {
      return apiSuccess({ gaps: [], empty: 'No AI visibility scans yet.' })
    }

    const gaps = citationGaps(presence.observations, presence.scope.host, presence.competitorHosts)

    return apiSuccess({
      scope: { brand: presence.scope.brand, domain: presence.scope.domain },
      periodDays: days,
      gaps: gaps.map(g => ({
        query: g.query,
        provider: g.provider,
        competitorDomain: g.competitorDomain,
        competitorUrl: g.competitorUrl,
        competitorTitle: g.competitorTitle,
        // Spelled out rather than implied by absence, because "your domain was not cited" is
        // the claim being made and it should be legible in the payload.
        targetDomain: presence.scope!.domain,
        targetCited: false,
        observedAt: g.observedAt,
        runId: g.runId,
        sourceLabel: SOURCE_LABEL.OBSERVED,
      })),
      competitorsTracked: presence.competitorHosts,
      /** Offered for marking. Ranked by how often each was cited, commonest first. */
      suggestedToMark: presence.citedDomains
        .filter(d => !NEVER_COMPETITOR.has(d.domain))
        .filter(d => !presence.competitorHosts.includes(d.domain))
        .slice(0, 15),
      empty: !presence.competitorHosts.length
        ? 'No competitors marked yet. Mark a cited domain as a competitor to see citation gaps.'
        : gaps.length === 0
          ? 'No competitor citation gaps detected in this period.'
          : null,
    })
  } catch (e) {
    return apiError(e)
  }
}
