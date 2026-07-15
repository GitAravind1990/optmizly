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

export function getPlanFromProductId(productId: string): 'PRO' | 'AGENCY' | 'FREE' {
  if (productId === DODO_PRODUCT_IDS.AGENCY) return 'AGENCY'
  if (productId === DODO_PRODUCT_IDS.PRO) return 'PRO'
  return 'FREE'
}
