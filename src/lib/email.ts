import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/welcome'
import { SubscriptionEmail } from '@/emails/subscription'
import { TrialStartedEmail } from '@/emails/trial-started'
import { CancelledEmail } from '@/emails/cancelled'
import { LimitWarningEmail } from '@/emails/limit-warning'
import { LimitReachedEmail } from '@/emails/limit-reached'
import { DripDay1Email } from '@/emails/drip-day1'
import { DripDay3Email } from '@/emails/drip-day3'
import { DripDay7Email } from '@/emails/drip-day7'
import { BlogSubscribeEmail } from '@/emails/blog-subscribe'
import { WeeklySummaryEmail } from '@/emails/weekly-summary'
import { AgencyReportEmail } from '@/emails/agency-report'
import { ProspectCapacityEmail } from '@/emails/prospect-capacity'
import { captureServerException } from '@/lib/posthog-server'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'Optmizly <hello@Optmizly.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'

/**
 * Reports a send that did not happen, somewhere that outlives the request.
 *
 * `console.error` on its own is close to useless here: this plan retains no runtime
 * logs, so a failure in production leaves nothing to read afterwards — the same blind
 * spot that hid a dead Groq key for three days. PostHog is where the evidence survives.
 *
 * The recipient is deliberately kept out of the PostHog payload. Subscriber addresses
 * reaching an analytics vendor would be a new category of personal data going to a
 * sub-processor, which is a `/privacy` change, not a logging change.
 *
 * Never throws — reporting a failure must not become one.
 */
async function reportEmailFailure(kind: string, to: string, error: unknown): Promise<void> {
  console.error(`[Email] Failed to send ${kind} to ${to}:`, error)
  await captureServerException(null, error, { emailKind: kind })
}

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
    await reportEmailFailure('welcome', to, e)
  }
}

// ── Subscription confirmed ────────────────────────────────────────────────────
export async function sendSubscriptionEmail(
  to: string,
  plan: 'Starter' | 'Pro' | 'Agency' | 'Agency Plus',
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
    await reportEmailFailure('subscription confirmation', to, e)
  }
}

// ── Trial started ─────────────────────────────────────────────────────────────
export async function sendTrialStartedEmail(
  to: string,
  plan: 'Starter' | 'Pro' | 'Agency' | 'Agency Plus',
  amount: string,
  firstName?: string,
  trialEndDate?: string
) {
  try {
    if (!resend) {
      console.log(`[Email] Resend not configured, skipping trial started email to ${to}`)
      return
    }
    const html = await render(
      TrialStartedEmail({
        firstName,
        plan,
        amount,
        dashboardUrl: `${APP_URL}/dashboard`,
        trialEndDate,
      })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your Optmizly ${plan} trial has started 🚀`,
      html,
    })
    console.log(`[Email] Trial started email sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('trial started', to, e)
  }
}

// ── Usage limit warning ───────────────────────────────────────────────────────
export async function sendLimitWarningEmail(
  to: string,
  used: number,
  limit: number,
  firstName?: string,
  plan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS' = 'FREE',
) {
  try {
    // Raised, not returned, so an unset key reaches reportEmailFailure below rather than
    // vanishing. The call site in auth.ts swallows the throw, so behaviour is unchanged —
    // what changes is that the failure is now recorded somewhere.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(
      LimitWarningEmail({ firstName, used, limit, plan, pricingUrl: `${APP_URL}/pricing` })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You have ${limit - used} free ${limit - used === 1 ? 'analysis' : 'analyses'} left this month`,
      html,
    })
    console.log(`[Email] Limit warning sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('limit warning', to, e)
  }
}

// ── Usage limit reached ───────────────────────────────────────────────────────
export async function sendLimitReachedEmail(
  to: string,
  limit: number,
  firstName?: string,
  plan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS' = 'FREE',
) {
  try {
    // auth.ts flips `limitEmailSent` false→true *before* calling this, so a silent no-op
    // on an unset key burns this user's limit email for the rest of the month. Raised so
    // it is at least recorded; the call site still swallows, so nothing else changes.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(
      LimitReachedEmail({ firstName, limit, plan, pricingUrl: `${APP_URL}/pricing` })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You've used all your free analyses this month`,
      html,
    })
    console.log(`[Email] Limit reached sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('limit reached', to, e)
  }
}

// ── Drip: Day 1 ──────────────────────────────────────────────────────────────
export async function sendDripDay1Email(to: string, firstName?: string) {
  try {
    // Throws rather than returning quietly, unlike the non-cron mailers below.
    // `claimDripEmail` writes the dedup row *before* this runs, so a silent no-op on an
    // unset key burns day1 permanently for every user in the batch — they can never
    // become eligible again — while the run still records `ok: true`. Raising it puts
    // the failure in the cron's error tally, which is the only place anyone looks.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(DripDay1Email({ firstName, dashboardUrl: `${APP_URL}/dashboard` }))
    await resend.emails.send({ from: FROM, to, subject: 'One thing to try in Optmizly today', html })
    console.log(`[Email] Drip day1 sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('drip day1', to, e)
    throw e
  }
}

// ── Drip: Day 3 ──────────────────────────────────────────────────────────────
export async function sendDripDay3Email(to: string, firstName?: string) {
  try {
    // Claim-before-send, so this throws rather than no-opping. See sendDripDay1Email.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(DripDay3Email({ firstName, pricingUrl: `${APP_URL}/pricing` }))
    await resend.emails.send({ from: FROM, to, subject: 'What 15 more Optmizly tools look like', html })
    console.log(`[Email] Drip day3 sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('drip day3', to, e)
    throw e
  }
}

// ── Drip: Day 7 ──────────────────────────────────────────────────────────────
export async function sendDripDay7Email(to: string, firstName?: string, isFree = true) {
  try {
    // Claim-before-send, so this throws rather than no-opping. See sendDripDay1Email.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(DripDay7Email({ firstName, isFree, dashboardUrl: `${APP_URL}/dashboard`, pricingUrl: `${APP_URL}/pricing` }))
    await resend.emails.send({ from: FROM, to, subject: `Still working on your SEO, ${firstName ?? 'there'}?`, html })
    console.log(`[Email] Drip day7 sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('drip day7', to, e)
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
    await reportEmailFailure('cancellation', to, e)
  }
}

// ── Weekly summary ───────────────────────────────────────────────────────────
export async function sendWeeklySummaryEmail(
  to: string,
  opts: {
    firstName?: string
    monthUsed: number
    monthLimit: number
    plan: string
    weekAnalyses: number
    bestScore?: number
  }
) {
  try {
    // Claim-before-send (weekly_<date> rows), so this throws. See sendDripDay1Email.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const { weekAnalyses } = opts
    const subject = weekAnalyses > 0
      ? `Your Optmizly week — ${weekAnalyses} ${weekAnalyses === 1 ? 'analysis' : 'analyses'} run`
      : `You still have ${Math.max(0, opts.monthLimit - opts.monthUsed)} ${Math.max(0, opts.monthLimit - opts.monthUsed) === 1 ? 'analysis' : 'analyses'} left this month`
    const html = await render(WeeklySummaryEmail({
      ...opts,
      dashboardUrl: `${APP_URL}/dashboard`,
      pricingUrl: `${APP_URL}/pricing`,
    }))
    await resend.emails.send({ from: FROM, to, subject, html })
    console.log(`[Email] Weekly summary sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('weekly summary', to, e)
    throw e
  }
}

// ── Agency client report ──────────────────────────────────────────────────────
export async function sendAgencyReportEmail(
  to: string,
  opts: {
    clientName: string
    website: string
    monthName: string
    year: number
    reportUrl: string
    trafficChange: number | null
    backlinksAdded: number | null
    domainAuthority: number | null
  }
) {
  if (!resend) {
    console.log(`[Email] Resend not configured, skipping agency report email to ${to}`)
    return
  }
  const html = await render(AgencyReportEmail(opts))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `SEO Report for ${opts.website} — ${opts.monthName} ${opts.year}`,
    html,
  })
  console.log(`[Email] Agency report sent to ${to}`)
}

// ── Blog subscribe ────────────────────────────────────────────────────────────
export async function sendBlogSubscribeEmail(
  to: string,
  firstName?: string,
  latestPostTitle?: string,
  latestPostUrl?: string,
) {
  try {
    // Raised so an unset key is reported rather than returning a silent success. The
    // subscriber row is already written by this point, so the caller is right to keep
    // returning 200 — losing the welcome email must not fail the subscription.
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(BlogSubscribeEmail({ firstName, latestPostTitle, latestPostUrl }))
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're subscribed — here's where to start",
      html,
    })
    console.log(`[Email] Blog subscribe confirmation sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('blog subscribe confirmation', to, e)
  }
}

// ── Prospect search capacity restored ─────────────────────────────────────────
/**
 * Throws on an unset key rather than returning, like the other cron mailers: the notifier
 * claims its row before sending, so a silent no-op would mark someone notified who never
 * heard from us, and they can never be picked up again.
 */
export async function sendProspectCapacityEmail(
  to: string,
  industry: string,
  location: string,
) {
  try {
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const html = await render(
      ProspectCapacityEmail({
        industry,
        location,
        searchUrl: `${APP_URL}/dashboard/tools/client-finder`,
      })
    )
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your prospect search for ${industry} is ready`,
      html,
    })
    console.log(`[Email] Prospect capacity notice sent to ${to}`)
  } catch (e) {
    await reportEmailFailure('prospect capacity', to, e)
    throw e
  }
}

// ── Health alert (internal) ───────────────────────────────────────────────────
/**
 * Tells the one person who can fix it that a dependency stopped answering.
 *
 * Plain HTML rather than a react-email template on purpose: this is a pager, not a
 * customer email, and it needs to survive being the only thing that still works.
 *
 * Failing to send is logged loudly and never thrown. The caller is already returning a
 * non-200 so the cron run shows as failed in Vercel regardless of whether this lands —
 * an alerting path that can take down the check it reports on is worse than no alert.
 */
export async function sendHealthAlertEmail(
  failed: { name: string; detail: string }[],
  all: { name: string; ok: boolean; detail: string; ms: number }[]
) {
  const to = process.env.ADMIN_EMAIL
  try {
    if (!resend || !to) {
      console.error(
        `[Health] UNHEALTHY and no alert channel (resend=${!!resend}, ADMIN_EMAIL=${!!to}): ` +
          failed.map(f => `${f.name}: ${f.detail}`).join('; ')
      )
      return
    }

    const rows = all
      .map(
        c => `<tr>
          <td style="padding:6px 12px 6px 0;font-weight:600">${c.ok ? '✓' : '✗'} ${c.name}</td>
          <td style="padding:6px 12px 6px 0;color:${c.ok ? '#475569' : '#b91c1c'}">${c.detail}</td>
          <td style="padding:6px 0;color:#94a3b8">${c.ms}ms</td>
        </tr>`
      )
      .join('')

    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Optmizly] ${failed.length} health check${failed.length > 1 ? 's' : ''} failing: ${failed.map(f => f.name).join(', ')}`,
      html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px">
        <h2 style="margin:0 0 4px">Health check failed</h2>
        <p style="color:#475569;margin:0 0 16px">
          ${failed.map(f => `<strong>${f.name}</strong>: ${f.detail}`).join('<br>')}
        </p>
        <table style="border-collapse:collapse;font-size:14px">${rows}</table>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px">
          Tools depending on a failing service keep serving pages and quietly return errors,
          so this will not be visible on the site. Re-run manually:<br>
          <code>curl -H "Authorization: Bearer $CRON_SECRET" ${APP_URL}/api/cron/health</code>
        </p>
      </div>`,
    })
    console.log(`[Health] Alert sent to ${to}`)
  } catch (e) {
    // Loud, because this is the failure that hides every other failure.
    console.error('[Health] FAILED TO SEND ALERT:', e)
  }
}

