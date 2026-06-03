import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export const runtime = 'nodejs'

type ClerkUserCreatedEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    first_name?: string
    last_name?: string
    primary_email_address_id?: string
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verify Svix signature
  const svix_id = req.headers.get('svix-id')
  const svix_timestamp = req.headers.get('svix-timestamp')
  const svix_signature = req.headers.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: ClerkUserCreatedEvent
  try {
    event = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkUserCreatedEvent
  } catch (e) {
    console.error('[Clerk Webhook] Invalid signature:', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (event.type === 'user.created') {
    const { id: clerkId, email_addresses, first_name, primary_email_address_id } = event.data

    let email = (email_addresses.find(e => e.id === primary_email_address_id) ?? email_addresses[0])
      ?.email_address ?? ''

    if (!email) {
      // Email missing from webhook payload — fetch directly from Clerk API
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      }).then(r => r.json())
      email = clerkUser.email_addresses?.[0]?.email_address ?? ''
    }

    if (!email) {
      console.warn('[Clerk Webhook] No email found for user', clerkId)
      return NextResponse.json({ received: true })
    }

    // Create user in DB (idempotent)
    await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, email },
      update: {},
    })

    // Send welcome email (non-blocking)
    await sendWelcomeEmail(email, first_name ?? undefined)
  }

  return NextResponse.json({ received: true })
}
