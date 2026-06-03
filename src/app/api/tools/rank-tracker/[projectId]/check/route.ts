import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === 'FREE') throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

// Seeded rank simulation — consistent per domain+keyword, drifts slowly over time
function simulateRank(domain: string, keyword: string, daysAgo = 0): number | null {
  const seed = simpleHash(domain + '::' + keyword)
  // Base rank 1-100, some keywords not ranking (return null ~15% of time)
  if (seed % 7 === 0) return null
  const baseRank = (seed % 95) + 1

  // Daily drift: ±3 positions per day, seeded so it's deterministic
  const drift = Math.round(((simpleHash(domain + keyword + String(daysAgo)) % 7) - 3))
  const rank = Math.max(1, Math.min(100, baseRank + drift))
  return rank
}

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function rankUrl(domain: string, keyword: string): string {
  const slug = keyword.toLowerCase().replace(/\s+/g, '-')
  const paths = ['/', '/blog/' + slug, '/' + slug, '/guide/' + slug, '/resources/' + slug]
  const idx = simpleHash(domain + keyword) % paths.length
  return 'https://' + domain + paths[idx]
}

function detectAlerts(
  keyword: string,
  oldRank: number | null,
  newRank: number | null
): { alertType: string; message: string; oldRank: number | null; newRank: number | null } | null {
  if (oldRank === null && newRank === null) return null

  if (oldRank !== null && newRank === null) {
    return { alertType: 'lost_ranking', message: `"${keyword}" dropped out of top 100`, oldRank, newRank }
  }
  if (oldRank === null && newRank !== null) {
    return { alertType: 'new_ranking', message: `"${keyword}" entered rankings at position ${newRank}`, oldRank, newRank }
  }
  if (oldRank !== null && newRank !== null) {
    const change = oldRank - newRank // positive = improved
    if (newRank <= 3 && oldRank > 3) {
      return { alertType: 'top_3', message: `"${keyword}" reached top 3! Now at #${newRank}`, oldRank, newRank }
    }
    if (newRank <= 10 && oldRank > 10) {
      return { alertType: 'first_page', message: `"${keyword}" reached first page at #${newRank}`, oldRank, newRank }
    }
    if (change >= 10) {
      return { alertType: 'position_gain', message: `"${keyword}" gained ${change} positions (${oldRank} → ${newRank})`, oldRank, newRank }
    }
    if (change <= -10) {
      return { alertType: 'position_drop', message: `"${keyword}" dropped ${Math.abs(change)} positions (${oldRank} → ${newRank})`, oldRank, newRank }
    }
  }
  return null
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.rankTrackingProject.findUnique({
      where: { id: projectId },
      include: { keywords: true },
    })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alerts: { projectId: string; keyword: string; alertType: string; oldRank: number | null; newRank: number | null; message: string }[] = []

    for (const kw of project.keywords) {
      const newRank = simulateRank(project.domain, kw.keyword, 0)
      const rank7dAgo = simulateRank(project.domain, kw.keyword, 7)
      const rank30dAgo = simulateRank(project.domain, kw.keyword, 30)

      const rankChange7d = (rank7dAgo !== null && newRank !== null) ? rank7dAgo - newRank : null
      const rankChange30d = (rank30dAgo !== null && newRank !== null) ? rank30dAgo - newRank : null
      const rankTrendPercent = (rank30dAgo !== null && newRank !== null && rank30dAgo > 0)
        ? parseFloat((((rank30dAgo - newRank) / rank30dAgo) * 100).toFixed(1))
        : null

      // Detect alerts vs previous rank
      const alert = detectAlerts(kw.keyword, kw.currentRank ?? null, newRank)
      if (alert) alerts.push({ projectId, keyword: kw.keyword, alertType: alert.alertType, oldRank: alert.oldRank, newRank: alert.newRank, message: alert.message })

      await prisma.rankTrackingKeyword.update({
        where: { id: kw.id },
        data: {
          currentRank: newRank,
          currentUrl: newRank !== null ? rankUrl(project.domain, kw.keyword) : null,
          rankChange7d,
          rankChange30d,
          rankTrendPercent,
          lastRanked: new Date(),
        },
      })

      // Upsert today's history point
      try {
        await prisma.rankHistory.upsert({
          where: { keywordId_checkedDate: { keywordId: kw.id, checkedDate: today } },
          create: { projectId, keywordId: kw.id, rank: newRank, url: newRank ? rankUrl(project.domain, kw.keyword) : null, checkedDate: today },
          update: { rank: newRank, url: newRank ? rankUrl(project.domain, kw.keyword) : null },
        })
      } catch {
        // skip duplicate
      }
    }

    // Save alerts
    if (alerts.length > 0) {
      await prisma.rankAlert.createMany({ data: alerts })
    }

    await prisma.rankTrackingProject.update({
      where: { id: projectId },
      data: { lastUpdatedAt: new Date() },
    })

    // Backfill 30 days of history for new projects with no history
    const historyCount = await prisma.rankHistory.count({ where: { projectId } })
    if (historyCount <= project.keywords.length) {
      const backfillData: { projectId: string; keywordId: string; rank: number | null; checkedDate: Date }[] = []
      for (const kw of project.keywords) {
        for (let d = 30; d >= 1; d--) {
          const date = new Date()
          date.setDate(date.getDate() - d)
          date.setHours(0, 0, 0, 0)
          const rank = simulateRank(project.domain, kw.keyword, d)
          backfillData.push({ projectId, keywordId: kw.id, rank, checkedDate: date })
        }
      }
      // Insert ignoring conflicts
      for (const entry of backfillData) {
        try {
          await prisma.rankHistory.create({ data: entry })
        } catch {
          // skip duplicate
        }
      }
    }

    return apiSuccess({
      checked: project.keywords.length,
      alerts: alerts.length,
      updatedAt: new Date(),
    })
  } catch (e) {
    return apiError(e)
  }
}
