import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { consumeDailyUsage, refundDailyUsage } from '@/lib/daily-usage'
import { discoverBusinesses } from '@/lib/places-discovery'
import { VendorBudgetExceededError } from '@/lib/vendor-budget'
import {
  spreadOrder, runBatch,
  BATCH_SIZE, QUALIFIED_TARGET,
} from '@/lib/client-finder-scan'

export const runtime = 'nodejs'

/**
 * Budgeted to finish comfortably inside 60s, which is not the platform limit but Clerk's.
 * A signed-in POST running longer can be rejected after the work is done, with the route
 * unable to see it (see CLAUDE.md).
 *
 * The arithmetic for one request: Places up to three pages ~9s, then ten homepages at
 * concurrency 5 with an 8s per-site ceiling is ~16s, then one model call ~10s. About 35s.
 *
 * This is why a deep scan is several requests rather than one. Reaching ten qualifying
 * leads means examining roughly fifty sites at the measured 18% hit rate, which is ~88s of
 * fetching on its own - so the pool is analysed a batch per request and the client walks
 * it, the same shape as Content Optimizer's sections.
 */
export const maxDuration = 60

/** Three full pages of Places. The scan walks this pool; it does not re-discover. */
const POOL_LIMIT = 60

/**
 * Agency-only, so only the AGENCY number is reachable - requireToolAccess refuses the
 * other two before this is read. They stay at 0 rather than being deleted because the
 * Record must cover every Plan, and a 0 says "not entitled" more clearly than a leftover
 * allowance that looks live.
 *
 * This is a cost ceiling, not a product limit. One search is up to three paid Places
 * requests plus up to sixty homepage fetches spread over the scan.
 *
 * **Lowered 50 -> 15 -> 5 across 2026-09-04.** One search is up to three Places requests,
 * billed at the Text Search **Enterprise** SKU — $35/1,000, or $0.035 each — because the
 * field mask asks for `websiteUri`, `rating` and `nationalPhoneNumber`. That tier is not
 * avoidable: `websiteUri` alone forces Enterprise, and a prospecting tool that cannot see a
 * business's website has no product.
 *
 * What each ceiling costs a fully-active account, at 3 requests a search:
 *
 *     50/day = 4,500 req/mo = $157/mo   |  15/day = 1,350 = $47/mo  |  5/day = 450 = $15.75/mo
 *
 * against $49 of revenue. Google's 1,000 free requests a month are *per billing account*,
 * not per user, so they cover roughly the first two active accounts and then stop helping —
 * which is why the marginal figures above ignore them. 5/day is still 150 searches a month,
 * each returning up to sixty scanned businesses, so it remains far beyond real prospecting
 * use while keeping Places under a third of the plan's revenue at full tilt.
 *
 * **Agency Plus, when it exists, gets 10/day** (900 req/mo, ~$31.50) against $99 — the same
 * proportion of revenue, and the visible reason to upgrade. Add the entry here when the
 * plan is added to the Plan enum; there is deliberately no dead AGENCY_PLUS key in the
 * meantime, because a Record key for a tier nobody can hold is a limit nobody enforces.
 *
 * Note this cost is billed by Google, not DataForSEO, so it appears in neither the
 * DataForSEO invoice nor the admin cost panel. Changing this number is the only control,
 * and `reserveVendorRequests` is the system-wide backstop underneath it.
 */
const CLIENT_FINDER_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 0,
  STARTER: 0,
  PRO: 0,
  AGENCY: 5,
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // requireToolAccess, not requireAuth: Agency-only and capped per day rather than drawn
    // from the monthly analysis allowance. Same shape as AI Regex.
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const { industry, location, service } = await req.json()
    if (typeof industry !== 'string' || !industry.trim()) throw new AuthError(400, 'Industry is required')
    if (typeof location !== 'string' || !location.trim()) throw new AuthError(400, 'Location is required')

    // Consumed here and only here. The continue calls are the same search finishing its
    // work, not new searches, so charging them would make one list of leads cost six of
    // the user's fifty.
    const dailyLimit = CLIENT_FINDER_DAILY_LIMITS[user.plan]
    const usage = await consumeDailyUsage(user.userId, 'client-finder', dailyLimit)
    if (usage.exceeded) {
      throw new AuthError(429, `Daily limit of ${dailyLimit} searches reached. It resets tomorrow.`)
    }

    // `service` narrows the Places query when supplied - "plumber" in "Leeds" is a
    // different list from "emergency plumber" in "Leeds".
    const query = typeof service === 'string' && service.trim()
      ? `${industry.trim()} ${service.trim()}`
      : industry.trim()

    // A budget stop is told apart from an empty market here, because the two look identical
    // to the user and only one of them is their problem. The daily search that was consumed
    // before this point is handed back: refusing to do the work and still charging for it is
    // the same defect the monthly quota refunds exist to prevent.
    let discovered
    try {
      discovered = await discoverBusinesses(query, location.trim(), POOL_LIMIT)
    } catch (e) {
      if (e instanceof VendorBudgetExceededError) {
        await refundDailyUsage(user.userId, 'client-finder').catch(() => {})
        throw new AuthError(
          503,
          'Prospect search has reached its limit for today across all accounts. It resets at midnight UTC — this search has not been counted against your daily allowance.',
        )
      }
      throw e
    }

    if (discovered.length === 0) {
      return apiSuccess({
        savedSearchId: null,
        prospects: [],
        scan: { examined: 0, poolSize: 0, qualified: 0, target: QUALIFIED_TARGET, done: true },
        searchMeta: {
          industry: industry.trim(),
          location: location.trim(),
          aiSummaries: false,
          usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
        },
      })
    }

    // Interleaved so the first batches already reach deep ranks, where the fixable sites
    // are. A scan that stops early then stops on better leads.
    const ordered = spreadOrder(discovered)
    const { qualified, examined, aiSummaries } = await runBatch(ordered.slice(0, BATCH_SIZE))
    const cursor = Math.min(BATCH_SIZE, ordered.length)
    const done = qualified.length >= QUALIFIED_TARGET || cursor >= ordered.length

    // Saved before the response so the client has an id to continue from. Unlike the old
    // single-shot search this is not best-effort: without the row there is no pool to
    // resume from, and the scan would be stuck at its first batch.
    const saved = await prisma.clientFinderSearch.create({
      data: {
        userId: user.userId,
        industry: industry.trim(),
        location: location.trim(),
        service: typeof service === 'string' && service.trim() ? service.trim() : null,
        prospects: JSON.stringify(qualified),
        pool: JSON.stringify(ordered),
        cursor,
        examined,
        found: ordered.length,
        analyzed: qualified.length,
      },
      select: { id: true },
    })

    // Keep the last 50 per user. Unbounded history would grow with nothing ever reading
    // the old ones, and a retention rule nobody wrote is how a table becomes a problem two
    // years later.
    const stale = await prisma.clientFinderSearch.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      skip: 50,
      select: { id: true },
    })
    if (stale.length > 0) {
      await prisma.clientFinderSearch.deleteMany({ where: { id: { in: stale.map(r => r.id) } } })
    }

    return apiSuccess({
      savedSearchId: saved.id,
      prospects: qualified,
      scan: {
        examined,
        poolSize: ordered.length,
        qualified: qualified.length,
        target: QUALIFIED_TARGET,
        done,
      },
      searchMeta: {
        industry: industry.trim(),
        location: location.trim(),
        aiSummaries,
        usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder' })
    return apiError(e)
  }
}
