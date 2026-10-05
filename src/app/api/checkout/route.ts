import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { dodo, isCouponEligibleProduct } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerEvent } from '@/lib/posthog-server'
import { sanitizeRef } from '@/lib/referral'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Not authenticated', status: 401, name: 'AuthError' })

    const { productId, couponCode, ref } = await req.json()
    if (!productId) return apiError({ message: 'productId is required', status: 400, name: 'ValidationError' })

    // Re-sanitised here even though the client already did: this value is attacker-controlled,
    // travels to a third party, and comes back through a webhook into our database. An
    // unusable ref is dropped rather than rejected — a referral must never cost someone their
    // purchase.
    const referrer = sanitizeRef(ref)

    // Plan restriction enforced here, not just in the browser. The client shows the field only
    // where isCouponEligibleProduct allows it; this is what makes that a rule rather than a
    // suggestion, since anyone can POST this route directly with any product id they like.
    //
    // What is deliberately NOT here: any knowledge of what the code is worth, or which codes
    // exist. Dodo owns the discount and its own redemption limit. Our only job is refusing to
    // carry a code to a product it was not meant for.
    const code = typeof couponCode === 'string' ? couponCode.trim().toUpperCase().slice(0, 40) : ''
    if (code && !isCouponEligibleProduct(productId)) {
      return apiError({
        // Says what is wrong without naming which plans qualify: that list changes with every
        // offer, and a message naming the old one outlived the restriction it described.
        message: 'That code cannot be used on this plan.',
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

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      // Dodo carries metadata through to the subscription object, which is how the webhook
      // learns the referrer without a second lookup. Omitted entirely when absent, so
      // unreferred subscriptions carry no empty key.
      metadata: { userId: user.id, clerkId, ...(referrer ? { ref: referrer } : {}) },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'}/dashboard/settings`,
      // discount_codes, not discount_code: the singular field is deprecated in the SDK in
      // favour of discount_id, and the plural takes the human-readable code. An invalid or
      // exhausted code is Dodo's to reject at its own checkout - we do not pre-validate it,
      // because a local list of valid codes is a second source of truth that will drift.
      ...(code ? { discount_codes: [code] } : {}),
    } as any)

    const checkoutUrl = (session as any).checkout_url ?? (session as any).url
    // Genuinely not the user's fault — Dodo accepted the session and returned no URL — but a
    // generic 500 tells someone trying to pay nothing about whether retrying is worth it. 502
    // names it as an upstream problem and says to try again, which here is true and actionable.
    if (!checkoutUrl) {
      console.error('[Checkout] Dodo returned a session with no checkout URL', { productId })
      throw new AuthError(502, 'We could not start checkout just now. Please try again in a moment.')
    }

    await captureServerEvent(clerkId, 'checkout_started', {
      product_id: productId,
      from_plan: user?.plan ?? 'FREE',
      is_trial: false,
      coupon_code: code || null,
      referrer: referrer || null,
    }).catch(() => {})

    return apiSuccess({ url: checkoutUrl })
  } catch (e) {
    return apiError(e)
  }
}

