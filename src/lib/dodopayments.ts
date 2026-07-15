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
} as const

// TEMPORARY — real end-to-end payment test only. Remove after testing.
// $1 stand-in for PRO / $2 stand-in for AGENCY, so a completed test payment
// exercises the real webhook -> plan upgrade -> email path.
const DODO_TEST_PRODUCT_IDS = {
  PRO: 'pdt_0NjFU4xQWGt6nWlUwy7j6',
  AGENCY: 'pdt_0NjFU528812IJjVRBzG11',
} as const

export function getPlanFromProductId(productId: string): 'PRO' | 'AGENCY' | 'FREE' {
  if (productId === DODO_PRODUCT_IDS.AGENCY || productId === DODO_TEST_PRODUCT_IDS.AGENCY) return 'AGENCY'
  if (productId === DODO_PRODUCT_IDS.PRO || productId === DODO_TEST_PRODUCT_IDS.PRO) return 'PRO'
  return 'FREE'
}
