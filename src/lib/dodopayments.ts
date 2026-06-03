import DodoPayments from 'dodopayments'

if (typeof window !== 'undefined') {
  throw new Error('dodopayments.ts must only be used on the server')
}

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY!,
  environment: 'live_mode',
})

export const DODO_PRODUCT_IDS = {
  PRO: process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID!,
  AGENCY: process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID!,
} as const

export function getPlanFromProductId(productId: string): 'PRO' | 'AGENCY' | 'FREE' {
  if (productId === DODO_PRODUCT_IDS.AGENCY) return 'AGENCY'
  if (productId === DODO_PRODUCT_IDS.PRO) return 'PRO'
  return 'FREE'
}
