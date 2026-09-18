import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { authorise, loadPresence, listScopes } from '@/lib/ai-presence/service'
import { computePresenceScore, comparePeriods } from '@/lib/ai-presence/score'
import { authorityShare, citationMetrics, queryCoverage, visibilityRate } from '@/lib/ai-presence/derive'
import { SOURCE_LABEL } from '@/lib/ai-presence/config'

export const runtime = 'nodejs'

/**
 * The AI Presence headline: score, components, and current-vs-previous change.
 *
 * A GET that reads stored scans. It runs no lookups, calls no model and charges no credit —
 * the scan that produced this data was billed when it ran, and charging again to look at it
 * would bill a customer for opening a page.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30))

    const [presence, scopes] = await Promise.all([
      loadPresence(user.userId, { brand, days }),
      listScopes(user.userId),
    ])

    if (!presence.scope) {
      return apiSuccess({
        scopes: [],
        scope: null,
        // Not an error and not an empty score: a customer who has never scanned should be
        // told what to do, not shown a zero that reads like a bad result.
        empty: 'No AI visibility scans yet. Run an AI Visibility scan to start building your AI presence data.',
      })
    }

    const { observations, previousObservations, scope, runs } = presence
    const host = scope.host

    return apiSuccess({
      scopes: scopes.map(s => ({ brand: s.brand, domain: s.domain, runCount: s.runCount, lastRunAt: s.lastRunAt })),
      scope: { brand: scope.brand, domain: scope.domain, runCount: scope.runCount, lastRunAt: scope.lastRunAt },
      periodDays: days,
      score: computePresenceScore(observations, host, runs.length),
      metrics: {
        visibility: visibilityRate(observations),
        citations: citationMetrics(observations, host),
        authority: authorityShare(observations, host),
        coverage: queryCoverage(observations),
      },
      changes: comparePeriods(observations, previousObservations, host),
      // Every surface measured is a Google one. Named explicitly so nothing here can be read
      // as covering ChatGPT, Gemini, Perplexity or Claude, none of which this product queries.
      providers: ['AI Overviews', 'AI Mode'],
      provenance: {
        queries: SOURCE_LABEL.TESTED,
        results: SOURCE_LABEL.OBSERVED,
        classification: SOURCE_LABEL.INFERRED,
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
