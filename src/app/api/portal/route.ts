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
      // 404 with the real message, not a bare Error: apiError matches none of its
      // branches on a plain Error and falls through to a 500 "Internal server error",
      // which is what a Free user saw in an alert box when they clicked Manage billing.
      return apiError({ message: 'No active subscription found', status: 404, name: 'NotFound' })
    }

    // Dodo Payments self-service portal
    const portalUrl = `https://customer.dodopayments.com/subscriptions?customer_id=${user.subscription.dodoCustomerId}`

    return apiSuccess({ url: portalUrl })
  } catch (e) {
    return apiError(e)
  }
}
