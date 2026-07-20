import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { getReviewVelocity } from '@/lib/dataforseo'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
// Reviews have no synchronous DataForSEO endpoint — getReviewVelocity polls an async
// task for up to REVIEWS_POLL_BUDGET_MS. Measured live (2026-07-21): queue time for
// this endpoint is genuinely variable and not tied to location_name or review volume
// (tested directly against DataForSEO — same place_id completed in 22s vs 62s across
// two back-to-back runs) — a 60s ceiling was getting legitimately hit, not just a
// misconfigured budget. Raised well past it for headroom.
export const maxDuration = 120

const FAILURE_MESSAGES: Record<string, string> = {
  timeout: 'The review lookup is taking longer than usual for this business. This is usually transient — please try again in a moment.',
  not_queued: 'Could not start the review lookup. Verify the Place ID is correct, or try again.',
  task_error: 'Could not fetch review data for this Place ID. Verify it is correct, or try again.',
}

function parseReviewDate(datetime: string): Date {
  // DataForSEO returns "2024-01-15 10:30:00 +00:00" or "2024-01-15 10:30:00"
  const normalized = datetime.replace(' ', 'T').replace(/\s[+-]\d{2}:\d{2}$/, 'Z')
  return new Date(normalized)
}

function countInRange(reviews: Array<{ date: string }>, daysAgo: number): number {
  const cutoff = Date.now() - daysAgo * 864e5
  return reviews.filter(r => {
    try { return parseReviewDate(r.date).getTime() >= cutoff } catch { return false }
  }).length
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const authedUser = await requireAuth('review-velocity')
    clerkId = authedUser.clerkId

    const { placeId, businessName } = await req.json()
    if (!placeId) {
      return apiError({ status: 400, message: 'placeId is required', name: 'ValidationError' })
    }

    const data = await getReviewVelocity(String(placeId))
    if ('reason' in data) {
      return apiError({
        status: 502,
        message: FAILURE_MESSAGES[data.reason],
        name: 'ExternalAPIError',
      })
    }

    const last30  = countInRange(data.reviews, 30)
    const last60  = countInRange(data.reviews, 60)
    const prev30  = last60 - last30
    const last7   = countInRange(data.reviews, 7)
    const last90  = countInRange(data.reviews, 90)

    const trend: 'up' | 'down' | 'stable' =
      last30 > (prev30 || 0) * 1.1 ? 'up' :
      last30 < (prev30 || 0) * 0.9 ? 'down' :
      'stable'

    return apiSuccess({
      businessName: businessName ?? '',
      totalReviews: data.totalReviews,
      rating: data.rating,
      weeklyVelocity: last7,
      monthlyVelocity: last30,
      velocity90: last90,
      trend,
      reviews: data.reviews.slice(0, 20),
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/review-velocity' })
    return apiError(e)
  }
}
