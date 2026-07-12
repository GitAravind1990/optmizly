import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getOrganicRank, isDataForSEOConfigured, settledOrNull } from '@/lib/dataforseo'
import { rankNDaysAgo } from '@/lib/rank-history'

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
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { projectId } = await params

    if (!isDataForSEOConfigured()) {
      throw new AuthError(503, 'Rank checking is temporarily unavailable. Please try again later.')
    }

    const project = await prisma.rankTrackingProject.findUnique({
      where: { id: projectId },
      include: { keywords: true },
    })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alerts: { projectId: string; keyword: string; alertType: string; oldRank: number | null; newRank: number | null; message: string }[] = []
    let skipped = 0

    // Real per-keyword SERP lookups run concurrently — each is an independent paid
    // DataForSEO call, well within its 2000/min rate limit at our scale.
    const results = await Promise.allSettled(
      project.keywords.map(kw => getOrganicRank(kw.keyword, project.domain, project.targetLocation, project.deviceType))
    )

    for (let i = 0; i < project.keywords.length; i++) {
      const kw = project.keywords[i]
      const result = settledOrNull(results[i])

      // null = the lookup itself failed (network/auth/parse) — skip this keyword this
      // run rather than recording a false "lost ranking" over a transient API hiccup.
      if (result === null) { skipped++; continue }

      const newRank = result.found ? result.rank : null
      const newUrl = result.found ? result.url : null

      const [rank7dAgo, rank30dAgo] = await Promise.all([
        rankNDaysAgo(prisma.rankHistory, kw.id, 7),
        rankNDaysAgo(prisma.rankHistory, kw.id, 30),
      ])

      const rankChange7d = (rank7dAgo !== null && newRank !== null) ? rank7dAgo - newRank : null
      const rankChange30d = (rank30dAgo !== null && newRank !== null) ? rank30dAgo - newRank : null
      const rankTrendPercent = (rank30dAgo !== null && newRank !== null && rank30dAgo > 0)
        ? parseFloat((((rank30dAgo - newRank) / rank30dAgo) * 100).toFixed(1))
        : null

      // Detect alerts vs previous rank
      const alert = detectAlerts(kw.keyword, kw.currentRank, newRank)
      if (alert) alerts.push({ projectId, keyword: kw.keyword, alertType: alert.alertType, oldRank: alert.oldRank, newRank: alert.newRank, message: alert.message })

      await prisma.rankTrackingKeyword.update({
        where: { id: kw.id },
        data: {
          currentRank: newRank,
          currentUrl: newUrl,
          rankChange7d,
          rankChange30d,
          rankTrendPercent,
          // Only advance "last ranked" when a rank was actually observed this run —
          // stamping today's date while the keyword is confirmed not ranking would
          // misrepresent when it last really ranked (shown in the CSV export).
          ...(newRank !== null ? { lastRanked: new Date() } : {}),
        },
      })

      // Upsert today's history point
      try {
        await prisma.rankHistory.upsert({
          where: { keywordId_checkedDate: { keywordId: kw.id, checkedDate: today } },
          create: { projectId, keywordId: kw.id, rank: newRank, url: newUrl, checkedDate: today },
          update: { rank: newRank, url: newUrl },
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

    return apiSuccess({
      data: {
        checked: project.keywords.length - skipped,
        skipped,
        alerts: alerts.length,
        updatedAt: new Date(),
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/rank-tracker/[projectId]/check' })
    return apiError(e)
  }
}
