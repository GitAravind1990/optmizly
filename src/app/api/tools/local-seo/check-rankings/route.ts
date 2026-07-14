import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getLocalPackRank, isDataForSEOConfigured, resolveBusinessCoordinates, settledOrNull } from '@/lib/dataforseo'
import { rankNDaysAgo } from '@/lib/rank-history'

export const runtime = 'nodejs'
export const maxDuration = 90

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
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

    // The DB writes per keyword (history lookups + rank update + history upsert) used
    // to run one keyword at a time in a sequential loop — with ~9 seeded keywords that
    // was enough round-trips to blow past Vercel's function timeout on its own, on top
    // of the DataForSEO latency. Running all keywords' post-processing concurrently
    // instead cut this from O(keywords × db latency) to roughly one round's worth.
    const perKeyword = await Promise.all(location.keywords.map(async (kw, i) => {
      const result = settledOrNull(results[i])

      // null = the lookup itself failed (network/auth/parse) — skip this keyword this
      // run rather than recording a false ranking-drop task over a transient API hiccup.
      if (result === null) return { skipped: true as const }

      const newRank = result.found ? result.rank : null

      const [rank7dAgo, rank30dAgo] = await Promise.all([
        rankNDaysAgo(prisma.localRankHistory, kw.id, 7),
        rankNDaysAgo(prisma.localRankHistory, kw.id, 30),
      ])
      const change7d = (rank7dAgo !== null && newRank !== null) ? rank7dAgo - newRank : null
      const change30d = (rank30dAgo !== null && newRank !== null) ? rank30dAgo - newRank : null
      const dropped = kw.currentRank !== null && newRank === null

      await Promise.all([
        prisma.localKeywordRank.update({
          where: { id: kw.id },
          data: {
            previousRank: kw.currentRank,
            currentRank: newRank,
            rankChange7d: change7d,
            rankChange30d: change30d,
          },
        }),
        prisma.localRankHistory.upsert({
          where: { keywordId_checkedDate: { keywordId: kw.id, checkedDate: today } },
          create: { keywordId: kw.id, rank: newRank, checkedDate: today },
          update: { rank: newRank },
        }).catch(() => { /* skip duplicate */ }),
      ])

      return {
        skipped: false as const,
        update: { keyword: kw.keyword, old: kw.currentRank, new: newRank },
        newTask: dropped ? {
          accountId: location.accountId,
          locationId: location.id,
          title: `Investigate ranking drop: "${kw.keyword}"`,
          category: 'keywords',
          priority: 'high',
          description: `"${kw.keyword}" dropped out of the local pack in ${location.city}. Review content and local signals.`,
        } : null,
      }
    }))

    for (const r of perKeyword) {
      if (r.skipped) { skipped++; continue }
      updates.push(r.update)
      if (r.newTask) newTasks.push(r.newTask)
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
