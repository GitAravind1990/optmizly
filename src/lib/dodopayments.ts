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
export function getPlanFromProductId(productId: string): 'PRO' | 'AGENCY' | 'FREE' {
  // Guarded against the empty string, because an unset env var would otherwise match an
  // empty productId and silently grant a plan. Cheap to write, expensive to discover.
  if (!productId) return 'FREE'
  if (productId === DODO_PRODUCT_IDS.AGENCY) return 'AGENCY'
  if (DODO_PRODUCT_IDS.AGENCY_ANNUAL && productId === DODO_PRODUCT_IDS.AGENCY_ANNUAL) return 'AGENCY'
  if (productId === DODO_PRODUCT_IDS.PRO) return 'PRO'
  if (DODO_PRODUCT_IDS.PRO_ANNUAL && productId === DODO_PRODUCT_IDS.PRO_ANNUAL) return 'PRO'
  return 'FREE'
}

/**
 * Whether a product is the one a coupon may be applied to.
 *
 * The single source of truth for the plan restriction, used by the checkout route. Dodo owns
 * the discount arithmetic and should also be restricted to this product; this is the second
 * lock, so a code cannot be forwarded against the monthly or Pro products even if the
 * client asks for it.
 *
 * Returns false when the annual product is not configured, which is the safe direction: no
 * annual product means no coupon rather than a coupon that lands anywhere.
 */
export function isCouponEligibleProduct(productId: string): boolean {
  return !!DODO_PRODUCT_IDS.AGENCY_ANNUAL && productId === DODO_PRODUCT_IDS.AGENCY_ANNUAL
}
