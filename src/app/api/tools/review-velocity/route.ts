import { NextRequest } from 'next/server'
import { requireAuth, requireToolAccess, refundUsage, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { submitReviewsTask, pollReviewsTask } from '@/lib/dataforseo'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
/**
 * Submit, then poll - one short request each.
 *
 * Reviews have no synchronous DataForSEO endpoint, and this route used to run the whole
 * task_post/task_get loop itself, blocking for as long as the queue took. Measured 2026-08-22
 * in production: 76.1s for a business with 1,208 reviews, against a poll budget of 110s.
 * Queue time is genuinely variable and unrelated to review volume - the same place_id has
 * completed in 22s and 62s back to back (2026-07-21) - so this was never going to be fixed
 * by tuning a ceiling.
 *
 * A signed-in POST that long can be rejected for an expired session token after the work is
 * done, with the route unable to see it. Now the client polls, and no request here waits on
 * a queue. See CLAUDE.md, "Giving a signed-in route a maxDuration over 60".
 */
export const maxDuration = 60

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
  // Set once requireAuth has taken the units, so the catch can hand them back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const { placeId, businessName, taskId } = await req.json()

    // ── Poll: cheap, unbilled, and repeatable ───────────────────────────────────
    //
    // Deliberately not billed. The paid work is the task_post, which already happened, and
    // a poll that charged would bill a user once per second of DataForSEO queue time. It
    // also must not refund: a refund here would be a decrement any client could trigger by
    // polling a made-up task id, which is a quota bypass rather than a courtesy.
    if (taskId) {
      const user = await requireToolAccess('review-velocity')
      clerkId = user.clerkId

      const polled = await pollReviewsTask(String(taskId))
      if ('pending' in polled) return apiSuccess({ pending: true, taskId })
      if ('reason' in polled) throw new AuthError(502, FAILURE_MESSAGES[polled.reason])

      const last30 = countInRange(polled.reviews, 30)
      const last60 = countInRange(polled.reviews, 60)
      const prev30 = last60 - last30
      const last7  = countInRange(polled.reviews, 7)
      const last90 = countInRange(polled.reviews, 90)

      const trend: 'up' | 'down' | 'stable' =
        last30 > (prev30 || 0) * 1.1 ? 'up' :
        last30 < (prev30 || 0) * 0.9 ? 'down' :
        'stable'

      return apiSuccess({
        pending: false,
        businessName: businessName ?? '',
        totalReviews: polled.totalReviews,
        rating: polled.rating,
        weeklyVelocity: last7,
        monthlyVelocity: last30,
        velocity90: last90,
        trend,
        reviews: polled.reviews.slice(0, 20),
      })
    }

    // ── Submit: the billed request ──────────────────────────────────────────────
    //
    // Charged here rather than on the poll that delivers, which is a departure from the
    // other split tools and deliberate: task_post is what actually costs money at the
    // vendor, it happens exactly once, and billing on delivery would either double-charge a
    // client that polls twice after completion or need storage to stay idempotent.
    //
    // The trade-off, stated rather than hidden: a task that queues and then fails during
    // polling leaves the unit spent. Refunding from the poll is the obvious fix and is not
    // safe - see the note above.
    const user = await requireAuth('review-velocity')
    clerkId = user.clerkId
    charged = user.userId

    if (!placeId) throw new AuthError(400, 'placeId is required')

    const submitted = await submitReviewsTask(String(placeId))
    if ('reason' in submitted) throw new AuthError(502, FAILURE_MESSAGES[submitted.reason])

    return apiSuccess({ pending: true, taskId: submitted.taskId })
  } catch (e) {
    // Only the submit charges, so this only ever refunds that one. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'review-velocity')

    await captureServerException(clerkId, e, { route: '/api/tools/review-velocity' })
    return apiError(e)
  }
}
