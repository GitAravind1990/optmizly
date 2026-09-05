import DodoPayments from 'dodopayments'

if (typeof window !== 'undefined') {
  throw new Error('dodopayments.ts must only be used on the server')
}

let dodoInstance: DodoPayments | null = null

function getDodoInstance(): DodoPayments {
  if (!dodoInstance) {
    const apiKey = process.env.DODO_API_KEY
    if (!apiKey) {
      throw new Error('DODO_API_KEY environment variable is not set')
    }
    dodoInstance = new DodoPayments({
      bearerToken: apiKey,
      environment: 'live_mode',
    })
  }
  return dodoInstance
}

export const dodo = new Proxy({}, {
  get: (_, prop) => {
    const instance = getDodoInstance()
    return (instance as any)[prop]
  },
}) as DodoPayments

export const DODO_PRODUCT_IDS = {
  /**
   * Starter, $9/mo. Empty until the product is created in Dodo — this integration is
   * live-mode only, so the product has to be made by hand in the dashboard and its id
   * set as NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID. While it is empty the plan is simply
   * unbuyable: the pricing card hides its button and getPlanFromProductId cannot match
   * it, which is the safe direction for a half-configured tier.
   */
  STARTER: process.env.NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID || '',
  /** Agency Plus, $99/mo. Empty until the product exists in Dodo, which makes the plan
   *  unbuyable rather than half-configured — the safe direction. */
  AGENCY_PLUS: process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_PRODUCT_ID || '',
  /** Yearly billing for Agency Plus. Coupon-eligible alongside Agency annual. */
  AGENCY_PLUS_ANNUAL: process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_ANNUAL_PRODUCT_ID || '',
  /** Yearly billing for Starter. Not coupon-eligible. */
  STARTER_ANNUAL: process.env.NEXT_PUBLIC_DODO_STARTER_ANNUAL_PRODUCT_ID || '',
  PRO: process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID || '',
  AGENCY: process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID || '',
  /** Yearly billing for the same Agency plan. Empty until the product exists in Dodo. */
  AGENCY_ANNUAL: process.env.NEXT_PUBLIC_DODO_AGENCY_ANNUAL_PRODUCT_ID || '',
  /** Yearly billing for the same Pro plan. Empty until the product exists in Dodo. */
  PRO_ANNUAL: process.env.NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID || '',
} as const

/**
 * Which plan a product grants. Note what this does NOT consider: the amount paid.
 *
 * That is what makes a discounted subscription safe. A founding member paying half price on
 * the annual product is buying the same product id, so the webhook grants AGENCY exactly as
 * it would at full price. Deriving the plan from the amount would break the moment any
 * coupon existed.
 */
export function getPlanFromProductId(productId: string): 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS' | 'FREE' {
  // Guarded against the empty string, because an unset env var would otherwise match an
  // empty productId and silently grant a plan. Cheap to write, expensive to discover.
  if (!productId) return 'FREE'
  if (productId === DODO_PRODUCT_IDS.AGENCY) return 'AGENCY'
  if (DODO_PRODUCT_IDS.AGENCY_ANNUAL && productId === DODO_PRODUCT_IDS.AGENCY_ANNUAL) return 'AGENCY'
  if (productId === DODO_PRODUCT_IDS.PRO) return 'PRO'
  if (DODO_PRODUCT_IDS.PRO_ANNUAL && productId === DODO_PRODUCT_IDS.PRO_ANNUAL) return 'PRO'
  // Guarded like the annual ids rather than compared directly: STARTER is empty until the
  // product exists, and an unguarded comparison would be the empty-string bug above.
  if (DODO_PRODUCT_IDS.STARTER && productId === DODO_PRODUCT_IDS.STARTER) return 'STARTER'
  // Checked before AGENCY would be wrong — these are distinct ids, so order does not
  // matter — but guarded like the others so an unset variable cannot match an empty id.
  if (DODO_PRODUCT_IDS.AGENCY_PLUS && productId === DODO_PRODUCT_IDS.AGENCY_PLUS) return 'AGENCY_PLUS'
  return 'FREE'
}

/**
 * Whether a product is one a coupon may be applied to: the two agency annual plans.
 *
 * The single source of truth for the plan restriction, used by the checkout route. Dodo owns
 * the discount arithmetic and is restricted to the same two products; this is the second
 * lock, so a code cannot be forwarded against a monthly or a lower-tier product even if the
 * client asks for it. Both sides must be changed together — Dodo's `restricted_to` and this
 * function — or the two locks disagree and one of them is decorative.
 *
 * An unconfigured product yields false rather than true, which is the safe direction: a
 * missing annual product means no coupon, not a coupon that lands anywhere.
 */
export function isCouponEligibleProduct(productId: string): boolean {
  if (!productId) return false
  const eligible = [DODO_PRODUCT_IDS.AGENCY_ANNUAL, DODO_PRODUCT_IDS.AGENCY_PLUS_ANNUAL]
  return eligible.some(id => !!id && id === productId)
}
