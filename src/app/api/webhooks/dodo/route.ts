import { NextRequest, NextResponse } from 'next/server'
import DodoPayments from 'dodopayments'
import { getPlanFromProductId } from '@/lib/dodopayments'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'
import { captureServerEvent } from '@/lib/posthog-server'
import { sendSubscriptionEmail, sendCancelledEmail } from '@/lib/email'

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
      const status = mapStatus(sub.status)
      const periodEnd: Date | null = sub.next_billing_date
        ? new Date(sub.next_billing_date)
        : null

      const userId = await resolveUserId(
        metadata?.userId,
        metadata?.clerkId,
        sub.customer?.customer_id,
        sub.customer?.email,
      )

      if (userId) {
        await prisma.subscription.upsert({
          where: { dodoSubscriptionId: sub.subscription_id },
          create: {
            userId,
            dodoSubscriptionId: sub.subscription_id,
            dodoCustomerId: sub.customer?.customer_id ?? '',
            dodoProductId: productId,
            status,
            plan,
            currentPeriodEnd: periodEnd,
          },
          update: {
            dodoProductId: productId,
            dodoCustomerId: sub.customer?.customer_id ?? '',
            status,
            plan,
            currentPeriodEnd: periodEnd,
          },
        })
        await prisma.user.update({ where: { id: userId }, data: { plan } })
        console.log(`[Dodo Webhook] Upserted subscription ${sub.subscription_id} → ${planKey}`)

        // Fire revenue event + send confirmation email after verified webhook
        const dbUser = await prisma.user.findUnique({ where: { id: userId } })
        if (dbUser) {
          if (dbUser.clerkId) {
            captureServerEvent(dbUser.clerkId, 'subscription_activated', {
              plan: planKey,
              product_id: productId,
              $set: { plan: planKey },
            }).catch(() => {})
          }
          // Only send email on initial creation (not on active status change or renewals)
          if (eventType === 'subscription.created') {
            const firstName = dbUser.email.split('@')[0]
            const rawAmount = sub.recurring_pre_tax_amount
            const amount = rawAmount ? `$${(rawAmount / 100).toFixed(0)}` : (planKey === 'PRO' ? '$19' : '$49')
            const nextBilling = periodEnd
              ? periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : undefined
            sendSubscriptionEmail(
              dbUser.email,
              planKey === 'AGENCY' ? 'Agency' : 'Pro',
              amount,
              firstName,
              nextBilling,
            ).catch(() => {})
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
          const firstName = cancelledUser.email.split('@')[0]
          const accessUntil = record.currentPeriodEnd
            ? record.currentPeriodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : undefined
          sendCancelledEmail(cancelledUser.email, record.plan, firstName, accessUntil).catch(() => {})
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

function mapStatus(dodoStatus: string): 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED' {
  const map: Record<string, 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED'> = {
    active: 'ACTIVE',
    cancelled: 'CANCELLED',
    expired: 'EXPIRED',
    past_due: 'PAST_DUE',
    paused: 'PAUSED',
    on_hold: 'PAST_DUE',
    trialing: 'ACTIVE',
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
