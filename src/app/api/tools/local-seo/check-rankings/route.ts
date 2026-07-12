import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getLocalPackRank, isDataForSEOConfigured, resolveBusinessCoordinates } from '@/lib/dataforseo'

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

// Closest real history point at or before N days ago — real check-ins don't land on
// exact daily boundaries (skipped runs, off-schedule manual checks).
async function rankNDaysAgo(keywordId: string, daysAgo: number): Promise<number | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysAgo)
  cutoff.setHours(23, 59, 59, 999)
  const row = await prisma.localRankHistory.findFirst({
    where: { keywordId, checkedDate: { lte: cutoff } },
    orderBy: { checkedDate: 'desc' },
  })
  return row?.rank ?? null
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { locationId } = await req.json()
    if (!locationId) throw new AuthError(400, 'locationId required')

    if (!isDataForSEOConfigured()) {
      throw new AuthError(503, 'Rank checking is temporarily unavailable. Please try again later.')
    }

    const location = await prisma.localSEOLocation.findUnique({
      where: { id: locationId },
      include: { account: true, keywords: true },
    })
    if (!location || location.account.userId !== user.id) throw new AuthError(404, 'Location not found')

    // Real local-pack rank checks need a lat/lng centroid, but the location only has a
    // street address on file — resolve its real Google Business Profile coordinates
    // once per check run (not stored, since geocoding is cheap and this avoids a
    // schema migration for a coordinate cache).
    const coords = await resolveBusinessCoordinates(location.name, location.city, location.state)
    if (!coords) {
      throw new AuthError(502, `Could not find "${location.name}" on Google in ${location.city}, ${location.state}. Verify the business name and city match its Google Business Profile.`)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const updates: { keyword: string; old: number | null; new: number | null }[] = []
    const newTasks: { accountId: string; locationId: string; title: string; category: string; priority: string; description: string }[] = []
    let skipped = 0

    // Real per-keyword local-pack lookups run concurrently — each is an independent
    // paid DataForSEO call.
    const results = await Promise.allSettled(
      location.keywords.map(kw => getLocalPackRank(kw.keyword, coords, location.name, coords.placeId))
    )

    for (let i = 0; i < location.keywords.length; i++) {
      const kw = location.keywords[i]
      const result = results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Awaited<ReturnType<typeof getLocalPackRank>>>).value : null

      // null = the lookup itself failed (network/auth/parse) — skip this keyword this
      // run rather than recording a false ranking-drop task over a transient API hiccup.
      if (result === null) { skipped++; continue }

      const newRank = result.found ? result.rank : null

      const [rank7dAgo, rank30dAgo] = await Promise.all([
        rankNDaysAgo(kw.id, 7),
        rankNDaysAgo(kw.id, 30),
      ])
      const change7d = (rank7dAgo !== null && newRank !== null) ? rank7dAgo - newRank : null
      const change30d = (rank30dAgo !== null && newRank !== null) ? rank30dAgo - newRank : null

      updates.push({ keyword: kw.keyword, old: kw.currentRank ?? null, new: newRank })

      if (kw.currentRank !== null && newRank === null) {
        newTasks.push({
          accountId: location.accountId,
          locationId: location.id,
          title: `Investigate ranking drop: "${kw.keyword}"`,
          category: 'keywords',
          priority: 'high',
          description: `"${kw.keyword}" dropped out of the local pack in ${location.city}. Review content and local signals.`,
        })
      }

      await prisma.localKeywordRank.update({
        where: { id: kw.id },
        data: {
          previousRank: kw.currentRank,
          currentRank: newRank,
          rankChange7d: change7d,
          rankChange30d: change30d,
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

    return apiSuccess({
      data: {
        success: true,
        keywordsChecked: location.keywords.length - skipped,
        skipped,
        updates,
        newTasks: newTasks.length,
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/check-rankings' })
    return apiError(e)
  }
}
