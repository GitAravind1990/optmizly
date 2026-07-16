import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { dodo, getPlanFromProductId } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerEvent } from '@/lib/posthog-server'
import { TRIAL_PERIOD_DAYS } from '@/lib/plans'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Not authenticated', status: 401, name: 'AuthError' })

    const { productId, skipTrial } = await req.json()
    if (!productId) return apiError(new Error('productId is required'))

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
    const name = clerkUser?.fullName ?? email

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, email } })
    }

    // One free trial per account, ever: only offered when this account has
    // never had a subscription (a Subscription row is never deleted except
    // via cascade-on-account-deletion, so this can't be gamed). skipTrial lets
    // a would-be-eligible user opt out and be charged immediately instead.
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } })
    const isTrialEligible = !existingSub && getPlanFromProductId(productId) !== 'FREE' && !skipTrial

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      metadata: { userId: user.id, clerkId },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'}/dashboard/settings`,
      ...(isTrialEligible ? { subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS } } : {}),
    } as any)

    const checkoutUrl = (session as any).checkout_url ?? (session as any).url
    if (!checkoutUrl) throw new Error('Checkout URL not returned')

    await captureServerEvent(clerkId, 'checkout_started', {
      product_id: productId,
      from_plan: user?.plan ?? 'FREE',
      is_trial: isTrialEligible,
    }).catch(() => {})

    return apiSuccess({ url: checkoutUrl })
  } catch (e) {
    return apiError(e)
  }
}

