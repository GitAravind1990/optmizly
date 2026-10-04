/**
 * Dodo product ids and which of them a discount code may be applied to.
 *
 * Split out of dodopayments.ts so the browser can read it. That module imports the Dodo SDK at
 * the top level, so a `'use client'` component importing anything from it drags the whole SDK
 * into the bundle — and the pricing page needs exactly this one fact: is the product the
 * visitor is about to buy one a code can be used on.
 *
 * Every id here is NEXT_PUBLIC by design: product ids are not secrets, they are in the
 * checkout URL. The API key stays in dodopayments.ts, which stays server-only.
 */

export const DODO_PRODUCT_IDS = {
  /**
   * Starter, $9/mo. Empty until the product is created in Dodo — this integration is live-mode
   * only, so the product has to be made by hand in the dashboard and its id set as
   * NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID. While it is empty the plan is simply unbuyable: the
   * pricing card hides its button and getPlanFromProductId cannot match it, which is the safe
   * direction for a half-configured tier.
   */
  STARTER: process.env.NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID || '',
  /** Yearly billing for Starter. */
  STARTER_ANNUAL: process.env.NEXT_PUBLIC_DODO_STARTER_ANNUAL_PRODUCT_ID || '',
  PRO: process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID || '',
  PRO_ANNUAL: process.env.NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID || '',
  AGENCY: process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID || '',
  AGENCY_ANNUAL: process.env.NEXT_PUBLIC_DODO_AGENCY_ANNUAL_PRODUCT_ID || '',
  /** Agency Plus, $99/mo. Empty until the product exists in Dodo, which makes the plan
   *  unbuyable rather than half-configured — the safe direction. */
  AGENCY_PLUS: process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_PRODUCT_ID || '',
  /** Yearly billing for Agency Plus. Coupon-eligible alongside Agency annual. */
  AGENCY_PLUS_ANNUAL: process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_ANNUAL_PRODUCT_ID || '',
} as const

/**
 * The products a discount code may be applied to: every paid plan, monthly and annual.
 *
 * One offer now — PRODUCTHUNT — where there used to be FOUNDING50 restricted to the two annual
 * agency plans. That restriction made it useless to the people a launch actually reaches: a
 * visitor who has just run a free audit is not deciding about a $490 annual commitment. It had
 * zero redemptions when it was retired, so nothing was stranded.
 *
 * This list is the second lock. Dodo owns the discount arithmetic and carries its own
 * `restricted_to`; this stops a code being forwarded against a product it was never meant for,
 * even if the client asks. **Both sides must be changed together** — Dodo's restriction and
 * this list — or one of the two locks is decorative.
 *
 * It does NOT say which code applies where; Dodo enforces that per discount. This is the union
 * of everything any current code may touch, which is the most a client-driven checkout should
 * be trusted with.
 *
 * **Eligibility is a property of the product, never of the billing period.** The pricing page
 * used to decide it with `isAnnual && p.couponEligible`, which was true only because every
 * eligible product happened to be annual. The moment a monthly product became eligible, the
 * field vanished exactly where it was needed and the code could not be typed at all.
 */
const COUPON_ELIGIBLE_KEYS = [
  'STARTER',
  'STARTER_ANNUAL',
  'PRO',
  'PRO_ANNUAL',
  'AGENCY',
  'AGENCY_ANNUAL',
  'AGENCY_PLUS',
  'AGENCY_PLUS_ANNUAL',
] as const satisfies ReadonlyArray<keyof typeof DODO_PRODUCT_IDS>

/**
 * An unconfigured product yields false rather than true, which is the safe direction: a missing
 * product id means no coupon, not a coupon that lands anywhere.
 */
export function isCouponEligibleProduct(productId: string | undefined | null): boolean {
  if (!productId) return false
  return COUPON_ELIGIBLE_KEYS.some(key => {
    const id = DODO_PRODUCT_IDS[key]
    return !!id && id === productId
  })
}

/**
 * Whether the current offer applies to this product — which, for PRODUCTHUNT, is all of them.
 *
 * Kept as its own function rather than collapsed into isCouponEligibleProduct, even though the
 * two lists are identical today. They answer different questions: *may a code be typed here*
 * and *should this card advertise the offer*. They were the same before FOUNDING50 was retired
 * and are the same again now; the next offer restricted to one tier separates them, and a
 * caller that reached for the wrong one would quietly advertise a discount that checkout then
 * refuses.
 */
export function isOfferProduct(productId: string | undefined | null): boolean {
  return isCouponEligibleProduct(productId)
}
