import { dodo } from '@/lib/dodopayments'
import { apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

/** The code the Founding Member offer runs on. */
const FOUNDING_CODE = 'FOUNDING50'

/**
 * Dodo counts redemptions itself, on the discount object, so this reads times_used rather
 * than tallying anything locally.
 *
 * That matters more than it looks. A local count - rows in our database, or webhook events
 * we happened to receive - would drift from Dodo's the first time a webhook was missed, a
 * payment was refunded, or a redemption happened through a channel this app never saw. And
 * the number is a public scarcity claim: "3 of 20 spots left" has to be true, not
 * approximately true.
 */
type Cached = { at: number; body: Record<string, unknown> }
let cache: Cached | null = null

/** Public endpoint on a public page, so it is cached briefly rather than proxied per view.
 *  A minute is short enough that a nearly-full offer reads correctly and long enough that a
 *  burst of pricing-page traffic does not become a burst of Dodo API calls. */
const TTL_MS = 60_000

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return apiSuccess(cache.body)

  let body: Record<string, unknown>
  try {
    const d = await dodo.discounts.retrieveByCode(FOUNDING_CODE)
    const used = typeof d.times_used === 'number' ? d.times_used : 0
    const limit = typeof d.usage_limit === 'number' ? d.usage_limit : null

    body = {
      configured: true,
      used,
      limit,
      // Null when the discount has no cap - the UI then says nothing rather than inventing
      // a denominator, because "X of ? left" is not a scarcity claim anyone can act on.
      remaining: limit === null ? null : Math.max(0, limit - used),
      soldOut: limit !== null && used >= limit,
    }
  } catch (e) {
    // A 404 is the normal state before the coupon is created, not an error worth surfacing.
    // Anything else - Dodo down, key rotated - lands here too, and the honest answer is the
    // same: we do not know, so claim nothing.
    const status = (e as { status?: number })?.status
    if (status !== 404) {
      console.error('[founding-spots] could not read the discount:', (e as Error)?.message ?? e)
    }
    body = { configured: false, used: null, limit: null, remaining: null, soldOut: false }
  }

  cache = { at: Date.now(), body }
  return apiSuccess(body)
}
