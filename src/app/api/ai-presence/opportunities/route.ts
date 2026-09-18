import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { authorise, loadPresence } from '@/lib/ai-presence/service'
import { citationGaps } from '@/lib/ai-presence/derive'
import { contentOpportunities } from '@/lib/ai-presence/opportunities'
import { SOURCE_LABEL } from '@/lib/ai-presence/config'

export const runtime = 'nodejs'

/**
 * Evidence-backed content opportunities.
 *
 * Each one is a query where marked rivals were cited and this domain was not, carrying the
 * observations that prove it. No model writes anything here: the recommendation is a fixed
 * sentence built from counted facts, which is the MVP boundary. Asking an LLM to expand
 * "they were cited, you were not" into a content strategy would produce confident advice
 * with no evidence behind it, and that advice would be indistinguishable from the measured
 * parts of this page.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30))

    const presence = await loadPresence(user.userId, { brand, days })
    if (!presence.scope) {
      return apiSuccess({ opportunities: [], empty: 'No AI visibility scans yet.' })
    }

    const gaps = citationGaps(presence.observations, presence.scope.host, presence.competitorHosts)
    const opportunities = contentOpportunities(
      gaps,
      presence.observations,
      presence.scope.brand,
      presence.runs[0]?.aliases ?? []
    )

    return apiSuccess({
      scope: { brand: presence.scope.brand, domain: presence.scope.domain },
      periodDays: days,
      opportunities: opportunities.map(o => ({
        query: o.query,
        queryType: o.queryType,
        competitors: o.competitors,
        competitorUrls: o.competitorUrls,
        competitorCitationCount: o.competitorCitationCount,
        targetCitationCount: o.targetCitationCount,
        recommendation: o.recommendation,
        priority: o.priority,
        confidence: o.confidence,
        // The observations behind the claim travel with it, so a recommendation can always
        // be traced back to the answers that justified it.
        evidence: o.evidence.map(e => ({
          provider: e.provider,
          competitorDomain: e.competitorDomain,
          competitorUrl: e.competitorUrl,
          observedAt: e.observedAt,
          runId: e.runId,
        })),
        sourceLabel: SOURCE_LABEL.OBSERVED,
      })),
      empty: !presence.competitorHosts.length
        ? 'Mark a competitor to surface evidence-backed opportunities.'
        : opportunities.length === 0
          ? 'No evidence-based opportunities detected yet.'
          : null,
    })
  } catch (e) {
    return apiError(e)
  }
}
