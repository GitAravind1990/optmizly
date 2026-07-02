import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklySummaryEmail } from '@/lib/email'
import { getClerkFirstName } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

const PLAN_LIMITS: Record<string, number> = { FREE: 3, PRO: 50, AGENCY: 200 }

function getMondayKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // rewind to Monday
  return `weekly_${d.toISOString().split('T')[0]}`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekKey = getMondayKey(now)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const results = { sent: 0, skipped: 0, errors: 0 }

  // Target: users signed up 7+ days ago who haven't received this week's email
  const users = await prisma.user.findMany({
    where: {
      createdAt: { lte: weekAgo },
      drippedEmails: { none: { emailType: weekKey } },
    },
    select: { id: true, clerkId: true, email: true, plan: true },
  })

  for (const user of users) {
    try {
      const limit = PLAN_LIMITS[user.plan] ?? 3

      const [usageRecord, weekActivity] = await Promise.all([
        prisma.usage.findUnique({ where: { userId_month: { userId: user.id, month: monthKey } } }),
        prisma.contentOptimization.findMany({
          where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
          select: { overallScore: true },
        }),
      ])

      const monthUsed = usageRecord?.count ?? 0
      const weekAnalyses = weekActivity.length
      const bestScore = weekAnalyses > 0
        ? Math.max(...weekActivity.map(a => a.overallScore))
        : undefined

      const firstName = await getClerkFirstName(user.clerkId)

      await sendWeeklySummaryEmail(user.email, {
        firstName,
        monthUsed,
        monthLimit: limit,
        plan: user.plan,
        weekAnalyses,
        bestScore,
      })

      await prisma.drippedEmail.create({ data: { userId: user.id, emailType: weekKey } })
      results.sent++
    } catch {
      results.errors++
    }
  }

  console.log('[Cron/weekly]', { weekKey, ...results })
  return Response.json({ ok: true, weekKey, ...results })
}
