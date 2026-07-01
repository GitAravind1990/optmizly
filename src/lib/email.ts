import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/welcome'
import { SubscriptionEmail } from '@/emails/subscription'
import { CancelledEmail } from '@/emails/cancelled'
import { LimitWarningEmail } from '@/emails/limit-warning'
import { LimitReachedEmail } from '@/emails/limit-reached'

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

