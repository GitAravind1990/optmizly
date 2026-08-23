import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { dodo, getPlanFromProductId, isCouponEligibleProduct } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerEvent } from '@/lib/posthog-server'
import { TRIAL_PERIOD_DAYS } from '@/lib/plans'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Not authenticated', status: 401, name: 'AuthError' })

    const { productId, skipTrial, couponCode } = await req.json()
    if (!productId) return apiError({ message: 'productId is required', status: 400, name: 'ValidationError' })

    // Plan restriction enforced here, not just in the browser. The client hides the field on
    // every plan but Agency annual; this is what makes that a rule rather than a suggestion,
    // since anyone can POST this route directly with any product id they like.
    //
    // What is deliberately NOT here: any knowledge of what the code is worth, or which codes
    // exist. Dodo owns the discount and its own redemption limit. Our only job is refusing to
    // carry a code to a product it was not meant for.
    const code = typeof couponCode === 'string' ? couponCode.trim().toUpperCase().slice(0, 40) : ''
    if (code && !isCouponEligibleProduct(productId)) {
      return apiError({
        message: 'This code is valid for the Agency annual plan only.',
        status: 400,
        name: 'ValidationError',
      })
    }

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
      // discount_codes, not discount_code: the singular field is deprecated in the SDK in
      // favour of discount_id, and the plural takes the human-readable code. An invalid or
      // exhausted code is Dodo's to reject at its own checkout - we do not pre-validate it,
      // because a local list of valid codes is a second source of truth that will drift.
      ...(code ? { discount_codes: [code] } : {}),
    } as any)

    const checkoutUrl = (session as any).checkout_url ?? (session as any).url
    if (!checkoutUrl) throw new Error('Checkout URL not returned')

    await captureServerEvent(clerkId, 'checkout_started', {
      product_id: productId,
      from_plan: user?.plan ?? 'FREE',
      is_trial: isTrialEligible,
      coupon_code: code || null,
    }).catch(() => {})

    return apiSuccess({ url: checkoutUrl })
  } catch (e) {
    return apiError(e)
  }
}

