import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth, requireToolAccess, refundUsage } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getLocalPackRank, isDataForSEOConfigured, resolveBusinessCoordinates, settledOrNull } from '@/lib/dataforseo'
import { rankNDaysAgo } from '@/lib/rank-history'

export const runtime = 'nodejs'
/**
 * One batch of keywords per request, with the client walking the remainder.
 *
 * This was 90 because it fired a live DataForSEO local-pack call for every tracked keyword in
 * a single POST — around nine for a seeded location, and slow enough in aggregate that the
 * earlier sequential version blew the function timeout on database round-trips alone. A
 * signed-in POST that long is a promise the platform may not keep: Clerk's session token
 * expires 61s after minting, a POST cannot be refreshed through the handshake, and the
 * rejection can arrive *after* the handler finished — charging a unit for a response that
 * reads "Not authenticated", which this route never sees and so cannot refund.
 *
 * Batched, each request is a coordinate lookup plus at most BATCH parallel rank calls.
 */
export const maxDuration = 60

/**
 * Four is picked to keep one request comfortably inside 60s rather than measured precisely:
 * the rank calls run in parallel, so wall time tracks the slowest rather than the sum, but
 * DataForSEO queues them in practice. Lower it if a location with many keywords still runs
 * long; raising it trades the safety margin this split exists to create.
 */
const BATCH = 4

export async function POST(req: NextRequest) {
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const { locationId, continueRun } = await req.json()
    if (!locationId) throw new AuthError(400, 'locationId required')

    /**
     * Only the first request of a run charges. Every batch writes rank rows the user keeps,
     * so billing per batch would charge one click three times for a nine-keyword location.
     *
     * A continuation is not trusted on the client's word. It is only accepted when this
     * location already has rank history recorded *today*, which only the charged first batch
     * can have created — so the free continuation path cannot be entered without paying for
     * the run, and once every keyword has today's row there is nothing left for it to do.
     * That bounds the whole thing to one paid pass per location per day.
     *
     * Was getAgencyUser() (tier check only, no quota) — this fires one real DataForSEO
     * local-pack call per tracked keyword, every time it's run, with no limit on how often a
     * user can re-check the same location. Belongs behind monthly-quota enforcement like
     * every other billable analysis.
     */
    const wantsContinue = continueRun === true
    const user = wantsContinue ? await requireToolAccess('local-seo') : await requireAuth('local-seo')
    clerkId = user.clerkId
    // No assertQuotaAvailable on the continuation: the first batch's own charge can be the one
    // that takes the user to their limit, and refusing the rest of a run they just paid for
    // would strand it half-finished.
    if (!wantsContinue) charged = user.userId

    if (!isDataForSEOConfigured()) {
      throw new AuthError(503, 'Rank checking is temporarily unavailable. Please try again later.')
    }

    const location = await prisma.localSEOLocation.findUnique({
      where: { id: locationId },
      include: { account: true, keywords: true },
    })
    if (!location || location.account.userId !== user.userId) throw new AuthError(404, 'Location not found')

    // Real local-pack rank checks need a lat/lng centroid, but the location only has a
    // street address on file — resolve its real Google Business Profile coordinates
    // once per check run (not stored, since geocoding is cheap and this avoids a
    // schema migration for a coordinate cache).
    const lookup = await resolveBusinessCoordinates(location.name, location.city, location.state)
    if (!lookup.ok) {
      // Two different failures, two different things for the user to do. Telling someone to
      // check their business name when the lookup service itself is down sends them to fix
      // data that is already correct.
      throw lookup.reason === 'not_found'
        ? new AuthError(404, `Could not find "${location.name}" on Google in ${location.city}, ${location.state}. Verify the business name and city match its Google Business Profile.`)
        : new AuthError(502, 'The business lookup service is not responding right now. Nothing was saved - please try again in a moment.')
    }
    const coords = lookup.coords

    // setUTCHours, not setHours. These rows are the run's batch boundary and the "one paid
    // pass per location per day" limit, so the day has to mean the same thing everywhere.
    // setHours resolves against the process timezone: identical on Vercel, which runs UTC,
    // but IST midnight (18:30Z the day before) in local dev or a maintenance script — where
    // it silently matches nothing and makes a healthy run look like it wrote no history.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Today's history rows are the run's progress marker, so the batch boundary is derived
    // from stored state rather than from anything the client sends.
    const doneToday = new Set(
      (await prisma.localRankHistory.findMany({
        where: { keywordId: { in: location.keywords.map(k => k.id) }, checkedDate: today },
        select: { keywordId: true },
      })).map(r => r.keywordId)
    )

    // A continuation is only real if the charged first batch has already run today.
    if (wantsContinue && doneToday.size === 0) {
      throw new AuthError(409, 'No rank check is in progress for this location. Start a new check.')
    }

    const pending = location.keywords.filter(k => !doneToday.has(k.id))
    const batch = pending.slice(0, BATCH)
    const remaining = pending.length - batch.length

    if (batch.length === 0) {
      return apiSuccess({
        data: { success: true, keywordsChecked: 0, skipped: 0, updates: [], newTasks: 0, remaining: 0, done: true },
      })
    }

    const updates: { keyword: string; old: number | null; new: number | null }[] = []
    const newTasks: { accountId: string; locationId: string; title: string; category: string; priority: string; description: string }[] = []
    let skipped = 0

    // Real per-keyword local-pack lookups run concurrently — each is an independent
    // paid DataForSEO call.
    const results = await Promise.allSettled(
      batch.map(kw => getLocalPackRank(kw.keyword, coords, location.name, coords.placeId))
    )

    // The DB writes per keyword (history lookups + rank update + history upsert) used
    // to run one keyword at a time in a sequential loop — with ~9 seeded keywords that
    // was enough round-trips to blow past Vercel's function timeout on its own, on top
    // of the DataForSEO latency. Running all keywords' post-processing concurrently
    // instead cut this from O(keywords × db latency) to roughly one round's worth.
    const perKeyword = await Promise.all(batch.map(async (kw, i) => {
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
        }).catch((err: unknown) => {
          // This was a bare `.catch(() => {})`, which is now unsafe to keep: today's history
          // rows are what the batch boundary and the continuation gate read, so a swallowed
          // failure here does not just lose a data point — it stalls the run with no
          // explanation, and the symptom is a 409 "no rank check is in progress".
          //
          // P2002 is the case the original catch was for: a concurrent run already wrote
          // today's row. The row exists, which is all this run needed, so stay quiet.
          const code = (err as { code?: string } | null)?.code
          if (code === 'P2002') return
          // Anything else is a real write failure. Logged rather than thrown so one keyword's
          // hiccup does not fail a batch that otherwise succeeded — the keyword simply keeps
          // no row, stays pending, and is retried by the next batch. If it keeps failing the
          // client's no-progress guard ends the walk instead of looping.
          console.error(
            `[local-seo] rank history write failed for keyword ${kw.id} ("${kw.keyword}"):`,
            err instanceof Error ? err.message : err
          )
        }),
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
        keywordsChecked: batch.length - skipped,
        skipped,
        updates,
        newTasks: newTasks.length,
        // The client walks these. `remaining` is recomputed from stored state each request,
        // not counted down, so a keyword whose lookup failed stays pending and the next batch
        // retries it — deliberately, since a failed lookup writes no history row rather than
        // recording a false drop out of the local pack.
        //
        // The consequence is that `remaining` is not guaranteed to reach zero: a keyword
        // failing every time keeps it pinned. The caller must stop when a batch makes no
        // progress, which is what the dashboard does — never loop on `done` alone.
        remaining,
        done: remaining === 0,
      },
    })
  } catch (e) {
    // requireAuth charged before any work happened, so a run that ends here
    // never delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'local-seo')

    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/check-rankings' })
    return apiError(e)
  }
}
