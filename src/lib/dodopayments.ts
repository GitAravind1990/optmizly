import DodoPayments from 'dodopayments'

if (typeof window !== 'undefined') {
  throw new Error('dodopayments.ts must only be used on the server')
}

let dodoInstance: DodoPayments | null = null

/**
 * Which Dodo environment this process talks to.
 *
 * **Test mode is a real environment and this used to say it was not.** `test.dodopayments.com`
 * answers 401 to a live key rather than failing to resolve, which means the environment
 * exists and simply needs its own credential — the two modes hold entirely separate
 * products, subscriptions and webhook secrets.
 *
 * Defaults to live, so nothing changes for an existing deployment that sets neither
 * variable. Test mode requires `DODO_MODE=test_mode` **and** a test key in
 * `DODO_TEST_API_KEY`: opting in needs both, because a mode flag alone would otherwise
 * send a live key to an endpoint that rejects it and read as an outage.
 */
export type DodoMode = 'live_mode' | 'test_mode'

export function dodoMode(): DodoMode {
  return process.env.DODO_MODE === 'test_mode' ? 'test_mode' : 'live_mode'
}

/**
 * The API key for the current mode, and the variable it came from.
 *
 * Returned together so callers can name the missing variable in their error rather than
 * saying "not configured" and leaving whoever reads the log to guess which of the two
 * environments they failed to set up.
 */
export function dodoApiKey(): { key: string | undefined; varName: string } {
  return dodoMode() === 'test_mode'
    ? { key: process.env.DODO_TEST_API_KEY, varName: 'DODO_TEST_API_KEY' }
    : { key: process.env.DODO_API_KEY, varName: 'DODO_API_KEY' }
}

/**
 * The webhook signing secret for the current mode.
 *
 * **Test and live sign with different secrets**, so this has to follow the mode in step with
 * the API key. Verifying a test webhook against the live secret fails closed — a 401 and no
 * plan granted — which is the safe direction but an actively misleading one: the payment
 * succeeds in Dodo and the app silently never upgrades the user, which reads as a broken
 * webhook rather than a misconfigured one.
 */
export function dodoWebhookSecret(): { secret: string | undefined; varName: string } {
  return dodoMode() === 'test_mode'
    ? { secret: process.env.DODO_TEST_WEBHOOK_SECRET, varName: 'DODO_TEST_WEBHOOK_SECRET' }
    : { secret: process.env.DODO_WEBHOOK_SECRET, varName: 'DODO_WEBHOOK_SECRET' }
}

/**
 * REST base for the current mode, for the few calls made with `fetch` rather than the SDK.
 * Follows DODO_MODE for the same reason the key does: a test deployment calling the live
 * host would act on real customers.
 */
export function dodoApiBase(): string {
  return dodoMode() === 'test_mode'
    ? 'https://test.dodopayments.com'
    : 'https://live.dodopayments.com'
}

function getDodoInstance(): DodoPayments {
  if (!dodoInstance) {
    const mode = dodoMode()
    // Never falls back to the live key in test mode. A silent fallback is how a test run
    // ends up creating real products and charging a real card.
    const { key, varName } = dodoApiKey()
    if (!key) {
      throw new Error(
        mode === 'test_mode'
          ? `${varName} is not set, and test mode will not fall back to the live key`
          : `${varName} environment variable is not set`
      )
    }
    dodoInstance = new DodoPayments({ bearerToken: key, environment: mode })
  }
  return dodoInstance
}

export const dodo = new Proxy({}, {
  get: (_, prop) => {
    const instance = getDodoInstance()
    return (instance as any)[prop]
  },
}) as DodoPayments

/**
 * Product ids for whichever mode this deployment runs in.
 *
 * Deliberately **not** duplicated into a second set of TEST_ variables. Test and live hold
 * different product ids, but Vercel scopes environment variables per environment, so the
 * Development and Preview scopes carry the test ids under these same names while Production
 * carries the live ones. One name per product, whose value depends on where it runs — the
 * alternative is sixteen variables and a permanent question about which set is authoritative.
 */
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
export type PaidPlanKey = 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS'

/**
 * Which plan each product grants, keyed by every product the app knows about.
 *
 * `Record<keyof typeof DODO_PRODUCT_IDS, ...>` is the whole point: adding a product id above
 * without mapping it here is a **compile error**, not a silent FREE. This replaced a chain of
 * `if` comparisons that had simply omitted two of the eight products — Starter annual and
 * Agency Plus annual both fell through to FREE, so a customer could pay $90 or $990 and be
 * granted nothing. Both products were live and purchasable when this was found, and FOUNDING50
 * is restricted to Agency Plus annual, so the discounted founding-member path led directly into
 * it. Nothing failed loudly: the payment succeeded, the webhook returned 200, and the account
 * stayed on the free tier.
 */
const PRODUCT_PLAN: Record<keyof typeof DODO_PRODUCT_IDS, PaidPlanKey> = {
  STARTER: 'STARTER',
  STARTER_ANNUAL: 'STARTER',
  PRO: 'PRO',
  PRO_ANNUAL: 'PRO',
  AGENCY: 'AGENCY',
  AGENCY_ANNUAL: 'AGENCY',
  AGENCY_PLUS: 'AGENCY_PLUS',
  AGENCY_PLUS_ANNUAL: 'AGENCY_PLUS',
}

export function getPlanFromProductId(productId: string): PaidPlanKey | 'FREE' {
  // Guarded against the empty string, because an unset env var would otherwise match an
  // empty productId and silently grant a plan. Cheap to write, expensive to discover.
  if (!productId) return 'FREE'
  for (const key of Object.keys(PRODUCT_PLAN) as (keyof typeof PRODUCT_PLAN)[]) {
    const configured = DODO_PRODUCT_IDS[key]
    // The truthiness check is what keeps an unconfigured product from matching an empty id.
    if (configured && configured === productId) return PRODUCT_PLAN[key]
  }
  return 'FREE'
}

/**
 * The products a discount code may be applied to.
 *
 * Two offers live here, and they do not overlap:
 *
 *   - **FOUNDING50** — the two agency annual plans. Twenty places, counted by Dodo.
 *   - **the launch code** — Starter and Pro monthly, the tiers someone arriving from a free
 *     audit might actually buy. A code restricted to a $490 annual commitment is no offer at
 *     all to that visitor.
 *
 * This list is the second lock. Dodo owns the discount arithmetic and carries its own
 * `restricted_to`; this function stops a code being forwarded against a product it was never
 * meant for, even if the client asks. **Both sides must be changed together** — Dodo's
 * restriction and this list — or one of the two locks is decorative.
 *
 * Note what this does NOT do: it does not say which code applies where. Dodo enforces that per
 * discount. This is the union of everything any current code may touch, which is the most a
 * client-driven checkout should be trusted with.
 */
const COUPON_ELIGIBLE_KEYS = [
  'AGENCY_ANNUAL',
  'AGENCY_PLUS_ANNUAL',
  'STARTER',
  'PRO',
] as const satisfies ReadonlyArray<keyof typeof DODO_PRODUCT_IDS>

/**
 * An unconfigured product yields false rather than true, which is the safe direction: a
 * missing product id means no coupon, not a coupon that lands anywhere.
 */
export function isCouponEligibleProduct(productId: string): boolean {
  if (!productId) return false
  return COUPON_ELIGIBLE_KEYS.some(key => {
    const id = DODO_PRODUCT_IDS[key]
    return !!id && id === productId
  })
}
