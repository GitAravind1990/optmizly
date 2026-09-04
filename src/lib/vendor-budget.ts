// System-wide daily spend ceilings for metered third-party vendors.
//
// Distinct from both of the other quota mechanisms, and the distinction is the point:
//
//   requireAuth's monthly quota  - what one account may spend in a month, per plan
//   consumeDailyUsage            - what one account may spend in a day, per tool
//   this                         - what EVERYONE may spend in a day, per vendor
//
// The first two bound an individual. Neither bounds a crowd: fifteen Client Finder
// searches a day is a sensible limit for one Agency account and a very large Google bill
// across a thousand free ones. A public lead-magnet tool has no per-account ceiling worth
// anything, because accounts are free and IPs are cheap.

import { prisma } from '@/lib/prisma'
import { getDayKey } from '@/lib/daily-usage'

/**
 * Google Places daily request ceiling.
 *
 * ── The rate, confirmed against Google's published pricing 2026-09-04 ──────────────
 *
 * Text Search bills at **the highest SKU any requested field belongs to**, and our field
 * mask asks for `websiteUri`, `rating` and `nationalPhoneNumber` — all three are
 * **Enterprise** fields. So every request is:
 *
 *     Text Search Enterprise (E967-44BC-B44D): $35.00 / 1,000 = $0.035
 *     Free allowance: 1,000 requests per month, per billing account
 *
 * **The Enterprise tier is not avoidable here.** Dropping `rating` and
 * `nationalPhoneNumber` would not demote us to Pro ($32/1,000, 5,000 free), because
 * `websiteUri` is itself an Enterprise field — and a prospecting tool that cannot see a
 * business's website has no product left. Do not "optimize" the field mask expecting a
 * cheaper SKU; the only lever is fewer requests.
 *
 * ── What 150/day costs ────────────────────────────────────────────────────────────
 *
 *     150/day = 4,500/month, less 1,000 free = 3,500 billed = ~$122.50/month at the ceiling
 *
 * That is a ceiling, not a forecast. Actual spend to date is **$0**: the tool has run 8
 * times in its life, about 24 requests, entirely inside the monthly free allowance.
 *
 * One search is up to 3 requests, so 150 is ~50 searches a day globally — three Agency
 * accounts at their full 15/day, or a respectable first day for a public prospect finder.
 * The first ~333 searches each month are free.
 *
 * Raise it deliberately when there is revenue to pay for it, and change this constant
 * rather than adding an env override: a spend ceiling with two sources of truth is a
 * ceiling nobody can state with confidence.
 */
export const PLACES_DAILY_REQUEST_BUDGET = 150

/** Stable vendor ids. Strings in the database, so keep them stable across renames. */
export const VENDOR_GOOGLE_PLACES = 'google-places'

/**
 * Thrown when a reservation would take a vendor past its daily ceiling.
 *
 * Distinct from an upstream failure on purpose. Places discovery deliberately swallows
 * vendor errors and returns [] — a search that finds nothing is a result the UI can show —
 * but "we stopped to protect the budget" is our own decision and the user is owed a true
 * explanation of it, not an empty list implying their market has no businesses in it.
 */
export class VendorBudgetExceededError extends Error {
  constructor(
    public readonly vendor: string,
    public readonly dailyMax: number,
  ) {
    super(`Daily request budget for ${vendor} exhausted (${dailyMax})`)
    this.name = 'VendorBudgetExceededError'
  }
}

/**
 * Reserves `units` billed requests against today's ceiling, or throws.
 *
 * Increments first and checks the result, the same order — and for the same reason — as
 * consumeDailyUsage and requireAuth: two concurrent callers that both read before either
 * writes would each see room and both proceed. The upsert is atomic, so the count is
 * authoritative under concurrency and cannot be gamed by racing.
 *
 * Two consequences, both deliberate:
 *
 *   - A refused reservation still consumed its units. Correct for a ceiling whose only job
 *     is bounding cost.
 *   - A reserved request that then fails upstream is counted as if it succeeded. This
 *     over-counts, which is the safe direction to be wrong: the alternative is confirming
 *     spend after the fact and briefly allowing unbounded requests in flight.
 *
 * Not fail-open. If this query cannot run the database is down, in which case the route
 * had already failed for other reasons — there is no state in which skipping the ceiling
 * is the helpful outcome.
 */
export async function reserveVendorRequests(
  vendor: string,
  units: number,
  dailyMax: number,
): Promise<{ used: number; dailyMax: number; remaining: number }> {
  const day = getDayKey()
  const row = await prisma.dailyVendorSpend.upsert({
    where: { vendor_day: { vendor, day } },
    create: { vendor, day, units },
    update: { units: { increment: units } },
  })

  if (row.units > dailyMax) {
    console.error(`[vendor-budget] ${vendor} ceiling hit: ${row.units}/${dailyMax} on ${day}`)
    throw new VendorBudgetExceededError(vendor, dailyMax)
  }

  return { used: row.units, dailyMax, remaining: Math.max(0, dailyMax - row.units) }
}

/** Today's reserved units for a vendor, without reserving any. For admin display. */
export async function peekVendorSpend(
  vendor: string,
  dailyMax: number,
): Promise<{ used: number; dailyMax: number; remaining: number }> {
  const row = await prisma.dailyVendorSpend.findUnique({
    where: { vendor_day: { vendor, day: getDayKey() } },
  })
  const used = row?.units ?? 0
  return { used, dailyMax, remaining: Math.max(0, dailyMax - used) }
}
