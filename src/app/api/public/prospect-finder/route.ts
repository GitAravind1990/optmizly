import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { consumeMonthlyIpQuota } from '@/lib/public-rate-limit'
import { discoverBusinesses } from '@/lib/places-discovery'
import { VendorBudgetExceededError } from '@/lib/vendor-budget'
import { spreadOrder, runBatch, type Prospect } from '@/lib/client-finder-scan'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Free searches per IP per calendar month. */
const FREE_MONTHLY_SEARCHES = 3

/** Prospects shown. Enough to be obviously useful, short of a usable prospect list. */
const FREE_RESULT_COUNT = 10

/**
 * How many businesses to pull from Places. One page, not the three the paid tool walks.
 *
 * This is the cost lever. The paid scan pages to rank 60 because depth is where the
 * fixable sites are; a free run does not need that, and each extra page is another billed
 * Enterprise request. 20 gives a full first page and one Places request instead of three.
 */
const FREE_POOL = 20

/**
 * The free, no-account prospect finder.
 *
 * Gives away the finding and withholds the reaching: a visitor sees ten real businesses
 * with real opportunity scores and real issues, and cannot email any of them. That is the
 * line the paid tool sits on — contact extraction, export, saved searches and outreach
 * drafts are what an agency actually pays for, and none of them are here.
 *
 * Deliberately not a teaser. Blurred rows and "sign up to see" would make this an advert;
 * the scores and issues shown are the same ones the paid tool computes, which is what makes
 * it worth a stranger's thirty seconds.
 */
export async function POST(req: NextRequest) {
  let refund: (() => Promise<void>) | undefined
  try {
    const verdict = await consumeMonthlyIpQuota(req, 'prospect-finder', FREE_MONTHLY_SEARCHES)
    if (verdict.unavailable) {
      throw new AuthError(503, 'This tool is temporarily unavailable. Please try again shortly.')
    }
    if (!verdict.allowed) {
      throw new AuthError(
        429,
        `That's all ${FREE_MONTHLY_SEARCHES} free searches for this month. Create a free account to keep going, or come back on the 1st.`,
      )
    }
    refund = verdict.refund

    const body = await req.json().catch(() => ({}))
    const industry = typeof body.industry === 'string' ? body.industry.trim() : ''
    const location = typeof body.location === 'string' ? body.location.trim() : ''

    if (!industry) throw new AuthError(400, 'Tell us which kind of business to look for.')
    if (!location) throw new AuthError(400, 'Tell us which town or city to look in.')
    if (industry.length > 120 || location.length > 120) {
      throw new AuthError(400, 'That is longer than this tool accepts. Try a shorter phrase.')
    }

    let discovered
    try {
      discovered = await discoverBusinesses(industry, location, FREE_POOL)
    } catch (e) {
      if (e instanceof VendorBudgetExceededError) {
        // Hand the search back — we refused to run it, so it should not count.
        await refund?.().catch(() => {})
        return apiSuccess({
          capacityReached: true,
          message:
            'Live business data is at its limit for today. It resets at midnight UTC, and this search has not been counted against your free searches.',
          industry,
          location,
        })
      }
      throw e
    }

    if (discovered.length === 0) {
      // A search that finds nothing is a result, not a failure — but the visitor spent an
      // allowance on it, and an empty market is usually a typo in the location.
      await refund?.().catch(() => {})
      return apiSuccess({
        prospects: [],
        searched: { industry, location },
        remaining: verdict.remaining + 1,
        message: 'No businesses found for that search. Try a broader industry or a nearby city.',
      })
    }

    const ordered = spreadOrder(discovered)
    const { qualified } = await runBatch(ordered.slice(0, FREE_RESULT_COUNT))

    return apiSuccess({
      prospects: qualified.slice(0, FREE_RESULT_COUNT).map(toPublicProspect),
      searched: { industry, location },
      remaining: verdict.remaining,
      scanned: Math.min(FREE_RESULT_COUNT, ordered.length),
    })
  } catch (e) {
    if (!(e instanceof AuthError)) await refund?.().catch(() => {})
    return apiError(e)
  }
}

/**
 * Strips everything an agency would pay for before the prospect leaves the server.
 *
 * Filtering in the browser would ship contact details to anyone who opened the network tab,
 * which is the whole product given away by accident. `phone` goes too: it arrives free from
 * Places, but it is a way to reach the business, and the gate is reaching.
 */
function toPublicProspect(p: Prospect) {
  return {
    id: p.id,
    name: p.name,
    website: p.website,
    location: p.location,
    opportunityScore: p.opportunityScore,
    opportunityLevel: p.opportunityLevel,
    // Two issues, not the full findings list: enough to prove the score is real.
    topIssues: p.topIssues.slice(0, 2),
    status: p.status,
    siteReachable: p.siteReachable,
  }
}
