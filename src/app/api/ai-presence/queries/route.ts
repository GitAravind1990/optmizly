import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { authorise, loadPresence } from '@/lib/ai-presence/service'
import { topQueries } from '@/lib/ai-presence/derive'
import { tallyTypes } from '@/lib/ai-presence/classify'
import { SOURCE_LABEL } from '@/lib/ai-presence/config'

export const runtime = 'nodejs'

/**
 * Top AI queries, and the branded/non-branded split.
 *
 * Only queries that were actually run appear. There is no padding, no example set and no
 * "suggested" queries: an empty account returns an empty list and the message below, because
 * a dashboard showing plausible-looking queries nobody tested is the exact failure this
 * product is built to avoid.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))

    const presence = await loadPresence(user.userId, { brand, days })
    if (!presence.scope) {
      return apiSuccess({ queries: [], types: null, empty: 'No AI queries analyzed yet.' })
    }

    const all = topQueries(presence.observations, presence.scope.brand, presence.runs[0]?.aliases ?? [])

    return apiSuccess({
      queries: all.slice(0, limit).map(q => ({
        query: q.query,
        type: q.classification.type,
        // The rule that fired, so a classification a user disagrees with can be understood
        // rather than argued with.
        typeReason: q.classification.reason,
        answers: q.answers,
        mentions: q.mentions,
        citations: q.citations,
        visibility: q.visibility,
        lastSeen: q.lastSeen,
        sourceLabel: SOURCE_LABEL.OBSERVED,
      })),
      total: all.length,
      types: tallyTypes(all.map(q => q.classification)),
      empty: all.length ? null : 'No AI queries analyzed yet.',
      provenance: {
        // Two different provenances in one row, kept apart on purpose: the result was
        // observed in an engine's answer, while the branded/non-branded label is Optmizly's
        // own reading of the query text.
        result: SOURCE_LABEL.OBSERVED,
        classification: SOURCE_LABEL.INFERRED,
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
