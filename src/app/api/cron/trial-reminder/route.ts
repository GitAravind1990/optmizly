import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTrialEndingEmail } from '@/lib/email'
import { getClerkFirstName } from '@/lib/auth'
import { TRIAL_REMINDER_DAYS_BEFORE } from '@/lib/plans'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reminderCutoff = new Date(Date.now() + TRIAL_REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000)
  const results = { sent: 0, errors: 0 }

  // Trialing subscriptions ending within the reminder window, not yet reminded.
  // Once a trial converts, status flips to ACTIVE and the row naturally drops
  // out of this query -- no upper/lower bound cleanup needed.
  const trials = await prisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      currentPeriodEnd: { lte: reminderCutoff },
      user: { drippedEmails: { none: { emailType: 'trial_ending_3d' } } },
    },
    include: { user: true },
  })

  for (const sub of trials) {
    try {
      const firstName = await getClerkFirstName(sub.user.clerkId, sub.user.email.split('@')[0])
      const planLabel = sub.plan === 'AGENCY' ? 'Agency' : 'Pro'
      const amount = sub.plan === 'AGENCY' ? '$49' : '$19'
      const trialEndDate = sub.currentPeriodEnd
        ? sub.currentPeriodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : undefined
      await sendTrialEndingEmail(sub.user.email, planLabel, amount, firstName, trialEndDate)
      await prisma.drippedEmail.create({ data: { userId: sub.userId, emailType: 'trial_ending_3d' } })
      results.sent++
    } catch {
      results.errors++
    }
  }

  console.log('[Cron/trial-reminder]', results)
  return Response.json({ ok: true, ...results })
}
