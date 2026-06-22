import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { getReviewVelocity } from '@/lib/dataforseo'

export const runtime = 'nodejs'

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
  try {
    await requireAuth('review-velocity')

    const { placeId, businessName } = await req.json()
    if (!placeId) {
      return apiError({ status: 400, message: 'placeId is required', name: 'ValidationError' })
    }

    const data = await getReviewVelocity(String(placeId))
    if (!data) {
      return apiError({
        status: 502,
        message: 'Could not fetch review data. Verify the Place ID is correct and try again.',
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
    return apiError(e)
  }
}
