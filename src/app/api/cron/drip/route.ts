import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDripDay1Email, sendDripDay3Email, sendDripDay7Email } from '@/lib/email'
import { getClerkFirstName } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const results = { day1: 0, day3: 0, day7: 0, errors: 0 }

  // Day 1: signed up 1+ days ago, haven't received drip_day1
  const day1Users = await prisma.user.findMany({
    where: {
      createdAt: { lte: daysAgo(1) },
      drippedEmails: { none: { emailType: 'drip_day1' } },
    },
    select: { id: true, clerkId: true, email: true },
  })

  for (const user of day1Users) {
    try {
      const firstName = await getClerkFirstName(user.clerkId)
      await sendDripDay1Email(user.email, firstName)
      await prisma.drippedEmail.create({ data: { userId: user.id, emailType: 'drip_day1' } })
      results.day1++
    } catch {
      results.errors++
    }
  }

  // Day 3: FREE users who signed up 3+ days ago, haven't received drip_day3
  const day3Users = await prisma.user.findMany({
    where: {
      plan: 'FREE',
      createdAt: { lte: daysAgo(3) },
      drippedEmails: { none: { emailType: 'drip_day3' } },
    },
    select: { id: true, clerkId: true, email: true },
  })

  for (const user of day3Users) {
    try {
      const firstName = await getClerkFirstName(user.clerkId)
      await sendDripDay3Email(user.email, firstName)
      await prisma.drippedEmail.create({ data: { userId: user.id, emailType: 'drip_day3' } })
      results.day3++
    } catch {
      results.errors++
    }
  }

  // Day 7: signed up 7+ days ago, haven't received drip_day7
  const day7Users = await prisma.user.findMany({
    where: {
      createdAt: { lte: daysAgo(7) },
      drippedEmails: { none: { emailType: 'drip_day7' } },
    },
    select: { id: true, clerkId: true, email: true, plan: true },
  })

  for (const user of day7Users) {
    try {
      const firstName = await getClerkFirstName(user.clerkId)
      await sendDripDay7Email(user.email, firstName, user.plan === 'FREE')
      await prisma.drippedEmail.create({ data: { userId: user.id, emailType: 'drip_day7' } })
      results.day7++
    } catch {
      results.errors++
    }
  }

  console.log('[Cron/drip]', results)
  return Response.json({ ok: true, ...results })
}
