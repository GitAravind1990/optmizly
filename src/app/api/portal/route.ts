import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Not authenticated', status: 401, name: 'AuthError' })

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { subscription: true },
    })

    if (!user?.subscription?.dodoCustomerId) {
      return apiError(new Error('No active subscription found'))
    }

    // Dodo Payments self-service portal
    const portalUrl = `https://customer.dodopayments.com/subscriptions?customer_id=${user.subscription.dodoCustomerId}`

    return apiSuccess({ url: portalUrl })
  } catch (e) {
    return apiError(e)
  }
}
