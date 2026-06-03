import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/welcome'
import { SubscriptionEmail } from '@/emails/subscription'
import { CancelledEmail } from '@/emails/cancelled'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'Optmizly <hello@Optmizly.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'

// â”€â”€ Welcome â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      subject: 'Welcome to Optmizly ðŸ‘‹',
      html,
    })
    console.log(`[Email] Welcome sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send welcome:', e)
  }
}

// â”€â”€ Subscription confirmed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      subject: `You're now on Optmizly ${plan} ðŸŽ‰`,
      html,
    })
    console.log(`[Email] Subscription confirmation sent to ${to}`)
  } catch (e) {
    console.error('[Email] Failed to send subscription email:', e)
  }
}

// â”€â”€ Subscription cancelled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

