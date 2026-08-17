import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listSearchConsoleSitesResult } from '@/lib/search-console'
import { syncGscProperty } from '@/lib/gsc-corpus'
import { captureServerException } from '@/lib/posthog-server'
import { cronAuthFailure, recordCronRun } from '@/lib/cron'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Months pulled on each run. The corpus is cumulative and the upsert is idempotent, so
 *  a weekly job only needs to cover the window Google is still revising — it keeps
 *  restating recent days for a while after they first appear. A wider window would mean
 *  re-fetching a year of settled rows every week for nothing. The initial 16-month
 *  backfill is what the manual "Pull history" button in Settings is for. */
const SYNC_MONTHS = 2

/**
 * Keeps the Search Console corpus current without anyone clicking anything.
 *
 * Google discards Search Analytics data past roughly 16 months, so a corpus that only
 * grows when someone remembers to press a button is a corpus with holes in it. This was
 * deliberately deferred when the corpus shipped ("until data volume justifies it"); the
 * justification is that the stored history is now the only measurement of whether SEO
 * changes worked, which makes gaps expensive rather than untidy.
 *
 * Not billed and not metered: it spends Google's quota on the user's own property, the
 * same reasoning as the manual sync route.
 */
export async function GET(req: NextRequest) {
  const denied = cronAuthFailure(req)
  if (denied) return denied

  const started = Date.now()
  const results = { users: 0, properties: 0, rowsWritten: 0, failed: 0, skipped: 0 }
  /** Why connections were skipped, tallied by reason (`expired`, `undecryptable`, …).
   *  The counts alone said a connection was skipped but never why, which is the only part
   *  that tells you whether a human has to do something or a provider was briefly down. */
  const skipReasons: Record<string, number> = {}
  let stoppedEarly = false
  let threw: string | null = null

  // Recorded in a finally because this job has two exits — the normal one and the time
  // budget below — and a run that ran out of time is exactly the one worth having a record
  // of. `stoppedEarly` is carried in the detail rather than failing the run: stopping is a
  // designed outcome on a large first sync, but a job that stops early *every* week is
  // never catching up, and that is only visible with the history to compare.
  //
  // The catch is what makes the finally honest. Everything inside the loop already handles
  // its own errors, so `results.failed` only counts per-user problems — an exception from
  // outside that loop would otherwise reach the finally with failed still 0 and be written
  // down as a successful run.
  try {
    // Only users who have actually connected. A connection row is the entire precondition.
    const connections = await prisma.searchConsoleConnection.findMany({
      select: { userId: true },
    })

    for (const { userId } of connections) {
      results.users++

      // Serial across users as well as within them. Search Console quota is per-user so
      // concurrency across users would be safe on Google's side, but each user's sync is
      // already several sequential paginated calls, and running them all at once is how a
      // 300s budget gets spent on connection overhead.
      try {
        const listed = await listSearchConsoleSitesResult(userId)
        if (!listed.ok) {
          // An expired grant is the expected failure here, not an exception: the user has
          // to reconnect and nothing this job does can fix it. Counted, not thrown — but
          // counted *with its reason*, because "skipped" on its own is indistinguishable
          // from "nothing to do". optmizly.com's own connection died on 2026-08-13 and
          // this job reported a healthy run every time for days afterwards.
          results.skipped++
          skipReasons[listed.error] = (skipReasons[listed.error] ?? 0) + 1
          console.log(`[GSC Cron] ${userId}: ${listed.error} — skipped`)
          continue
        }

        const verified = listed.sites.filter(s => s.permissionLevel !== 'siteUnverifiedUser')
        for (const site of verified) {
          // Stop before the platform kills us mid-write. A partial run is fine — the next
          // run picks up what was missed, because upserts make re-syncing free.
          if (Date.now() - started > 240_000) {
            console.log('[GSC Cron] approaching time budget, stopping early')
            stoppedEarly = true
            return Response.json({ ...results, stoppedEarly: true })
          }

          const r = await syncGscProperty(userId, site.siteUrl, SYNC_MONTHS)
          results.properties++
          results.rowsWritten += r.rowsWritten
          if (r.failed) results.failed++
        }
      } catch (e) {
        // One user's broken connection must not stop everyone else's sync.
        results.failed++
        await captureServerException(null, e, { route: '/api/cron/gsc-sync', userId })
      }
    }

    console.log(`[GSC Cron] ${JSON.stringify(results)} in ${Date.now() - started}ms`)
    return Response.json(results)
  } catch (e) {
    threw = e instanceof Error ? e.message : String(e)
    throw e
  } finally {
    // A run where every connection was skipped is not a success. It completed without
    // error and synced nothing, which is exactly what a dead grant looks like from the
    // inside — and marking it ok meant a corpus that had stopped growing reported itself
    // healthy indefinitely. With no connections at all there is genuinely nothing to do,
    // so that stays ok.
    const syncedNothing = results.users > 0 && results.skipped === results.users
    await recordCronRun(
      'gsc-sync',
      threw === null && results.failed === 0 && !syncedNothing,
      Date.now() - started,
      {
        ...results,
        stoppedEarly,
        ...(Object.keys(skipReasons).length > 0 ? { skipReasons } : {}),
        ...(threw ? { threw } : {}),
      }
    )
  }
}
