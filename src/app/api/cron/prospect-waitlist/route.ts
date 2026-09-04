import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendProspectCapacityEmail } from '@/lib/email'
import { cronAuthFailure, recordCronRun } from '@/lib/cron'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Bounded so a large backlog cannot outrun the duration budget. Whatever is left is
 *  picked up tomorrow, because notifiedAt is still null on those rows. */
const MAX_PER_RUN = 100

/**
 * Tells people the daily prospect-search ceiling has reset.
 *
 * Runs after midnight UTC, which is when DailyVendorSpend rolls to a new day key and
 * capacity is genuinely back — sending before that would be a false promise.
 *
 * Claim-before-send, the same shape as claimDripEmail: notifiedAt is set first and only
 * the row that won the update is sent. Two concurrent runs, or a manual re-trigger while
 * one is working, would otherwise both read the same unsent set and mail everyone twice.
 * The tradeoff is the same too — a send that fails after a successful claim is a one-time
 * miss rather than a retry — which is why sendProspectCapacityEmail throws on an unset key
 * instead of silently doing nothing.
 */
export async function GET(req: NextRequest) {
  const denied = cronAuthFailure(req)
  if (denied) return denied

  const started = Date.now()
  const results = { waiting: 0, sent: 0, errors: 0 }
  let threw: string | null = null

  try {
    const pending = await prisma.prospectWaitlist.findMany({
      where: { notifiedAt: null },
      orderBy: { createdAt: 'asc' },
      take: MAX_PER_RUN,
    })
    results.waiting = pending.length

    for (const row of pending) {
      try {
        // Claim first. count === 1 means this run won the row.
        const claimed = await prisma.prospectWaitlist.updateMany({
          where: { id: row.id, notifiedAt: null },
          data: { notifiedAt: new Date() },
        })
        if (claimed.count !== 1) continue

        await sendProspectCapacityEmail(row.email, row.industry, row.location)
        results.sent++
      } catch (e) {
        results.errors++
        await captureServerException(null, e, {
          route: '/api/cron/prospect-waitlist',
          waitlistId: row.id,
        })
      }
    }

    return Response.json(results)
  } catch (e) {
    threw = e instanceof Error ? e.message : String(e)
    throw e
  } finally {
    // Zero sent is the normal state on most days - nobody hit the ceiling - so the run is
    // judged by whether anything threw, never by whether it sent. "sent > 0" as a success
    // condition would mark a healthy job unhealthy and train everyone to ignore it.
    await recordCronRun(
      'prospect-waitlist',
      results.errors === 0 && !threw,
      Date.now() - started,
      { ...results, ...(threw ? { threw } : {}) }
    )
  }
}
