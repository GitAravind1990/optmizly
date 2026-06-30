import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { dodo } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerEvent } from '@/lib/posthog-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Not authenticated', status: 401, name: 'AuthError' })

    const { productId } = await req.json()
    if (!productId) return apiError(new Error('productId is required'))

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
    const name = clerkUser?.fullName ?? email

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, email } })
    }

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      metadata: { userId: user.id, clerkId },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'}/dashboard/settings`,
    } as any)

    const checkoutUrl = (session as any).checkout_url ?? (session as any).url
    if (!checkoutUrl) throw new Error('Checkout URL not returned')

    captureServerEvent(clerkId, 'checkout_started', {
      product_id: productId,
      from_plan: user?.plan ?? 'FREE',
    }).catch(() => {})

    return apiSuccess({ url: checkoutUrl })
  } catch (e) {
    return apiError(e)
  }
}

