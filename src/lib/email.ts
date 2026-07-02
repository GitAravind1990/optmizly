import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/welcome'
import { SubscriptionEmail } from '@/emails/subscription'
import { CancelledEmail } from '@/emails/cancelled'
import { LimitWarningEmail } from '@/emails/limit-warning'
import { LimitReachedEmail } from '@/emails/limit-reached'
import { DripDay1Email } from '@/emails/drip-day1'
import { DripDay3Email } from '@/emails/drip-day3'
import { DripDay7Email } from '@/emails/drip-day7'
import { BlogSubscribeEmail } from '@/emails/blog-subscribe'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'Optmizly <hello@Optmizly.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'

// ── Welcome ───────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, firstName?: string) {
  try {
    if (!resend) {
      console.log(`[Email] Resend not configured, skipping welcome email to ${to}`)
      return
    }
    const html = await render(
      WelcomeEmail({ firstName, dashboardUrl: `${APP_URL}/dashboard` })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Welcome to Optmizly 👋',
      html,
    })
    console.log(`[Email] Welcome sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send welcome:', e)
  }
}

// ── Subscription confirmed ────────────────────────────────────────────────────
export async function sendSubscriptionEmail(
  to: string,
  plan: 'Pro' | 'Agency',
  amount: string,
  firstName?: string,
  nextBillingDate?: string
) {
  try {
  if (!resend) {
      console.log(`[Email] Resend not configured, skipping welcome email to ${to}`)
      return
    }
    const html = await render(
      SubscriptionEmail({
        firstName,
        plan,
        amount,
        dashboardUrl: `${APP_URL}/dashboard`,
        nextBillingDate,
      })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You're now on Optmizly ${plan} 🎉`,
      html,
    })
    console.log(`[Email] Subscription confirmation sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send subscription email:', e)
  }
}

// ── Usage limit warning ───────────────────────────────────────────────────────
export async function sendLimitWarningEmail(
  to: string,
  used: number,
  limit: number,
  firstName?: string,
) {
  try {
    if (!resend) return
    const html = await render(
      LimitWarningEmail({ firstName, used, limit, pricingUrl: `${APP_URL}/pricing` })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You have ${limit - used} free ${limit - used === 1 ? 'analysis' : 'analyses'} left this month`,
      html,
    })
    console.log(`[Email] Limit warning sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send limit warning:', e)
  }
}

// ── Usage limit reached ───────────────────────────────────────────────────────
export async function sendLimitReachedEmail(
  to: string,
  limit: number,
  firstName?: string,
) {
  try {
    if (!resend) return
    const html = await render(
      LimitReachedEmail({ firstName, limit, pricingUrl: `${APP_URL}/pricing` })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You've used all your free analyses this month`,
      html,
    })
    console.log(`[Email] Limit reached sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send limit reached email:', e)
  }
}

// ── Drip: Day 1 ──────────────────────────────────────────────────────────────
export async function sendDripDay1Email(to: string, firstName?: string) {
  try {
    if (!resend) return
    const html = await render(DripDay1Email({ firstName, dashboardUrl: `${APP_URL}/dashboard` }))
    await resend.emails.send({ from: FROM, to, subject: 'One thing to try in Optmizly today', html })
    console.log(`[Email] Drip day1 sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send drip day1:', e)
    throw e
  }
}

// ── Drip: Day 3 ──────────────────────────────────────────────────────────────
export async function sendDripDay3Email(to: string, firstName?: string) {
  try {
    if (!resend) return
    const html = await render(DripDay3Email({ firstName, pricingUrl: `${APP_URL}/pricing` }))
    await resend.emails.send({ from: FROM, to, subject: 'What 15 more Optmizly tools look like', html })
    console.log(`[Email] Drip day3 sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send drip day3:', e)
    throw e
  }
}

// ── Drip: Day 7 ──────────────────────────────────────────────────────────────
export async function sendDripDay7Email(to: string, firstName?: string, isFree = true) {
  try {
    if (!resend) return
    const html = await render(DripDay7Email({ firstName, isFree, dashboardUrl: `${APP_URL}/dashboard`, pricingUrl: `${APP_URL}/pricing` }))
    await resend.emails.send({ from: FROM, to, subject: `Still working on your SEO, ${firstName ?? 'there'}?`, html })
    console.log(`[Email] Drip day7 sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send drip day7:', e)
    throw e
  }
}

// ── Subscription cancelled ────────────────────────────────────────────────────
export async function sendCancelledEmail(
  to: string,
  plan: string,
  firstName?: string,
  accessUntil?: string
) {
  try {
  if (!resend) {
      console.log(`[Email] Resend not configured, skipping welcome email to ${to}`)
      return
    }
    const html = await render(
      CancelledEmail({
        firstName,
        plan,
        accessUntil,
        reactivateUrl: `${APP_URL}/pricing`,
      })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your Optmizly ${plan} subscription has been cancelled`,
      html,
    })
    console.log(`[Email] Cancellation email sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send cancellation email:', e)
  }
}

// ── Blog subscribe ────────────────────────────────────────────────────────────
export async function sendBlogSubscribeEmail(
  to: string,
  firstName?: string,
  latestPostTitle?: string,
  latestPostUrl?: string,
) {
  try {
    if (!resend) return
    const html = await render(BlogSubscribeEmail({ firstName, latestPostTitle, latestPostUrl }))
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're subscribed — here's where to start",
      html,
    })
    console.log(`[Email] Blog subscribe confirmation sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send blog subscribe email:', e)
  }
}

