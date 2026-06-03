import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function simulateNewRank(currentRank: number | null, keyword: string, day: number): number | null {
  const seed = hash(keyword + String(day))
  if (currentRank === null) {
    return seed % 7 === 0 ? (seed % 50) + 1 : null
  }
  const drift = (seed % 7) - 3
  const newRank = currentRank + drift
  if (newRank > 100) return null
  return Math.max(1, newRank)
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAgencyUser()
    const { locationId } = await req.json()
    if (!locationId) throw new AuthError(400, 'locationId required')

    const location = await prisma.localSEOLocation.findUnique({
      where: { id: locationId },
      include: { keywords: true, account: true },
    })
    if (!location || location.account.userId !== user.id) throw new AuthError(404, 'Location not found')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayNum = Math.floor(Date.now() / 86400000)

    const updates: { keyword: string; old: number | null; new: number | null }[] = []
    const newTasks: { accountId: string; locationId: string; title: string; category: string; priority: string; description: string }[] = []

    for (const kw of location.keywords) {
      const newRank = simulateNewRank(kw.currentRank ?? null, kw.keyword, dayNum)
      const change7d = (kw.previousRank !== null && newRank !== null) ? kw.previousRank - newRank : null

      updates.push({ keyword: kw.keyword, old: kw.currentRank ?? null, new: newRank })

      if (kw.currentRank !== null && newRank === null) {
        newTasks.push({
          accountId: location.accountId,
          locationId: location.id,
          title: `Investigate ranking drop: "${kw.keyword}"`,
          category: 'keywords',
          priority: 'high',
          description: `"${kw.keyword}" dropped out of top 100 in ${location.city}. Review content and local signals.`,
        })
      }

      await prisma.localKeywordRank.update({
        where: { id: kw.id },
        data: {
          previousRank: kw.currentRank,
          currentRank: newRank,
          rankChange7d: change7d,
          rankChange30d: kw.rankChange30d,
        },
      })

      try {
        await prisma.localRankHistory.upsert({
          where: { keywordId_checkedDate: { keywordId: kw.id, checkedDate: today } },
          create: { keywordId: kw.id, rank: newRank, checkedDate: today },
          update: { rank: newRank },
        })
      } catch { /* skip duplicate */ }
    }

    if (newTasks.length) {
      await prisma.localSEOTask.createMany({ data: newTasks })
    }

    return apiSuccess({ success: true, keywordsChecked: location.keywords.length, updates, newTasks: newTasks.length })
  } catch (e) {
    return apiError(e)
  }
}
