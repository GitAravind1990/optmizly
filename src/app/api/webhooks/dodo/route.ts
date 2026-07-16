import { NextRequest, NextResponse } from 'next/server'
import DodoPayments from 'dodopayments'
import { getPlanFromProductId } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'
import { captureServerEvent } from '@/lib/posthog-server'
import { sendSubscriptionEmail, sendCancelledEmail, sendTrialStartedEmail } from '@/lib/email'
import { getClerkFirstName } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const webhookSecret = process.env['DODO_WEBHOOK_SECRET']
  if (!webhookSecret) {
    console.error('[Dodo Webhook] DODO_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const dodoApiKey = process.env.DODO_API_KEY
  if (!dodoApiKey) {
    console.error('[Dodo Webhook] DODO_API_KEY not set')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const dodoWebhook = new DodoPayments({
    bearerToken: dodoApiKey,
    webhookKey: webhookSecret,
  })

  let event: any
  try {
    event = dodoWebhook.webhooks.unwrap(rawBody, {
      headers: {
        'webhook-id': req.headers.get('webhook-id') ?? '',
        'webhook-signature': req.headers.get('webhook-signature') ?? '',
        'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      },
    } as any)
  } catch (err) {
    console.error('[Dodo Webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (!event) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const eventType: string = event.type ?? event.eventType
  console.log(`[Dodo Webhook] Event: ${eventType}`)

  try {
    if (
      eventType === 'subscription.created' ||
      eventType === 'subscription.active' ||
      eventType === 'subscription.updated' ||
      eventType === 'subscription.renewed'
    ) {
      const sub = event.data
      const metadata = sub.metadata as { userId?: string; clerkId?: string } | null
      const productId: string = sub.product_id ?? ''
      const planKey = getPlanFromProductId(productId)
      const plan = Plan[planKey]
      const periodEnd: Date | null = sub.next_billing_date
        ? new Date(sub.next_billing_date)
        : null
      const trialPeriodDays: number = sub.trial_period_days ?? 0

      const userId = await resolveUserId(
        metadata?.userId,
        metadata?.clerkId,
        sub.customer?.customer_id,
        sub.customer?.email,
      )

      if (userId) {
        const existingSub = await prisma.subscription.findUnique({ where: { userId } })

        // DoDo retries failed webhook deliveries with backoff, so an older
        // event can land after a newer one already succeeded. Ignore it
        // instead of clobbering the newer state with stale data.
        const eventTimestamp = event.timestamp ? new Date(event.timestamp) : new Date()
        const isStaleEvent = Boolean(
          existingSub?.lastWebhookEventAt && eventTimestamp < existingSub.lastWebhookEventAt,
        )
        const isNewCycle = !existingSub || existingSub.dodoSubscriptionId !== sub.subscription_id

        // A subscription.cancelled event can be delivered around the same
        // moment as a subscription.updated/active/renewed event for the same
        // underlying subscription (observed live during trial testing). If
        // this account is already cancelled in our DB and this event is for
        // that same DoDo subscription (not a fresh resubscription), don't
        // let it resurrect access -- the cancellation handler is the source
        // of truth once cancelled.
        const isAlreadyCancelled = existingSub?.status === 'CANCELLED' && !isNewCycle

        if (isStaleEvent) {
          console.log(
            `[Dodo Webhook] Ignoring stale event for subscription ${sub.subscription_id} ` +
            `(event ${eventTimestamp.toISOString()} older than last-applied ${existingSub!.lastWebhookEventAt!.toISOString()})`,
          )
        } else if (isAlreadyCancelled) {
          console.log(
            `[Dodo Webhook] Ignoring ${eventType} for already-cancelled subscription ${sub.subscription_id}`,
          )
        } else {
          const wasTrialing = existingSub?.status === 'TRIALING'

          // DoDo does not report a literal "trialing" status via the API in
          // practice (confirmed via live testing on 2026-07-16 -- status
          // stays "active" throughout, and trial_period_days is a static
          // config field that never changes even after conversion, so it
          // can't be used alone to tell "still trialing" from "already
          // converted"). Detect trial state ourselves: a fresh trial
          // subscription's first-ever webhook is TRIALING; later events on
          // the same subscription stay TRIALING only while the billing
          // cycle hasn't advanced past the trial-end date we stored: once
          // it has, that's the real conversion charge, and status is left
          // as ACTIVE (the mapStatus result) so the conversion-email branch
          // below fires correctly.
          const billingCycleAdvanced = Boolean(
            wasTrialing && existingSub?.currentPeriodEnd && periodEnd && periodEnd > existingSub.currentPeriodEnd,
          )
          let status = mapStatus(sub.status)
          if (trialPeriodDays > 0 && status === 'ACTIVE') {
            if (!existingSub) {
              status = 'TRIALING'
            } else if (wasTrialing && !billingCycleAdvanced) {
              status = 'TRIALING'
            }
          }

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              dodoSubscriptionId: sub.subscription_id,
              dodoCustomerId: sub.customer?.customer_id ?? '',
              dodoProductId: productId,
              status,
              plan,
              currentPeriodEnd: periodEnd,
              welcomeEmailSent: false,
              trialConvertedEmailSent: false,
              lastWebhookEventAt: eventTimestamp,
            },
            update: {
              dodoSubscriptionId: sub.subscription_id,
              dodoProductId: productId,
              dodoCustomerId: sub.customer?.customer_id ?? '',
              status,
              plan,
              currentPeriodEnd: periodEnd,
              lastWebhookEventAt: eventTimestamp,
              ...(isNewCycle ? { welcomeEmailSent: false, trialConvertedEmailSent: false } : {}),
            },
          })
          await prisma.user.update({ where: { id: userId }, data: { plan } })
          console.log(`[Dodo Webhook] Upserted subscription ${sub.subscription_id} → ${planKey}`)

          // Fire revenue event + send confirmation email after verified webhook
          const dbUser = await prisma.user.findUnique({ where: { id: userId } })
          if (dbUser) {
            if (dbUser.clerkId) {
              await captureServerEvent(dbUser.clerkId, 'subscription_activated', {
                plan: planKey,
                product_id: productId,
                $set: { plan: planKey },
              }).catch(() => {})
            }
            // Send the activation email exactly once per lifecycle stage. DoDo
            // doesn't reliably emit `subscription.created` before the
            // subscription goes active/trialing, and multiple subscription.*
            // events can land within milliseconds of each other for the same
            // activation -- so instead of gating on event type, atomically
            // claim each send via a conditional update. Only the request that
            // flips the flag false -> true (count === 1) sends the email,
            // which is race-safe under concurrent webhook deliveries.
            const firstName = await getClerkFirstName(dbUser.clerkId, dbUser.email.split('@')[0])
            const rawAmount = sub.recurring_pre_tax_amount
            const amount = rawAmount ? `$${(rawAmount / 100).toFixed(0)}` : (planKey === 'PRO' ? '$19' : '$49')
            const nextBilling = periodEnd
              ? periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : undefined
            const planLabel = planKey === 'AGENCY' ? 'Agency' : 'Pro'

            if (status === 'TRIALING') {
              const claimed = await prisma.subscription.updateMany({
                where: { userId, welcomeEmailSent: false },
                data: { welcomeEmailSent: true },
              })
              if (claimed.count === 1) {
                await sendTrialStartedEmail(
                  dbUser.email,
                  planLabel,
                  amount,
                  firstName,
                  nextBilling,
                ).catch(() => {})
              }
            } else if (status === 'ACTIVE' && wasTrialing) {
              const claimed = await prisma.subscription.updateMany({
                where: { userId, trialConvertedEmailSent: false },
                data: { trialConvertedEmailSent: true },
              })
              if (claimed.count === 1) {
                await sendSubscriptionEmail(
                  dbUser.email,
                  planLabel,
                  amount,
                  firstName,
                  nextBilling,
                ).catch(() => {})
              }
            } else if (status === 'ACTIVE') {
              const claimed = await prisma.subscription.updateMany({
                where: { userId, welcomeEmailSent: false },
                data: { welcomeEmailSent: true },
              })
              if (claimed.count === 1) {
                await sendSubscriptionEmail(
                  dbUser.email,
                  planLabel,
                  amount,
                  firstName,
                  nextBilling,
                ).catch(() => {})
              }
            }
          }
        }
      } else {
        console.warn('[Dodo Webhook] Could not resolve userId for subscription', sub.subscription_id)
      }
    } else if (eventType === 'subscription.cancelled') {
      const sub = event.data
      await prisma.subscription.updateMany({
        where: { dodoSubscriptionId: sub.subscription_id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
      const record = await prisma.subscription.findUnique({
        where: { dodoSubscriptionId: sub.subscription_id },
      })
      if (record) {
        await prisma.user.update({ where: { id: record.userId }, data: { plan: Plan.FREE } })
      }
      console.log(`[Dodo Webhook] Cancelled subscription ${sub.subscription_id}`)
      if (record) {
        const cancelledUser = await prisma.user.findUnique({ where: { id: record.userId } })
        if (cancelledUser) {
          const firstName = await getClerkFirstName(cancelledUser.clerkId, cancelledUser.email.split('@')[0])
          const accessUntil = record.currentPeriodEnd
            ? record.currentPeriodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : undefined
          await sendCancelledEmail(cancelledUser.email, record.plan, firstName, accessUntil).catch(() => {})
        }
      }
    } else {
      console.log(`[Dodo Webhook] Unhandled event: ${eventType}`)
    }
  } catch (err) {
    console.error('[Dodo Webhook] Processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function mapStatus(dodoStatus: string): 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED' | 'TRIALING' {
  const map: Record<string, 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED' | 'TRIALING'> = {
    active: 'ACTIVE',
    cancelled: 'CANCELLED',
    expired: 'EXPIRED',
    past_due: 'PAST_DUE',
    paused: 'PAUSED',
    on_hold: 'PAST_DUE',
    trialing: 'TRIALING',
  }
  return map[dodoStatus] ?? 'ACTIVE'
}

async function resolveUserId(
  userId?: string,
  clerkId?: string,
  dodoCustomerId?: string,
  email?: string,
): Promise<string | null> {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user) return user.id
  }
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (user) return user.id
  }
  if (dodoCustomerId) {
    const sub = await prisma.subscription.findFirst({ where: { dodoCustomerId } })
    if (sub) return sub.userId
  }
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) return user.id
  }
  return null
}
