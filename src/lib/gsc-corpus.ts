// Builds and refreshes the stored Search Console corpus (GscQueryRow).
//
// Why this exists: every keyword metric in the product is a vendor estimate that
// nobody has ever scored. Search Console is Google's own measurement of impressions,
// clicks and average position for queries a connected property actually ranks for —
// the only ground truth reachable without buying a clickstream panel. Accumulating it
// is a prerequisite for calibrating volume, fitting real CTR curves, and building a
// difficulty signal from observed rankings rather than a link-count proxy.
//
// Timing matters more than it looks: Google retains roughly 16 months of Search
// Analytics history and drops the rest. History not captured is not recoverable later,
// which is why this stores rather than reads through.

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getValidAccessToken, searchAnalyticsQueryAll } from '@/lib/search-console'

/** Google retains ~16 months of Search Analytics data. */
const RETENTION_MONTHS = 16

/** GSC finalises data on a 2-3 day lag; querying nearer than this returns partial days. */
const PROCESSING_LAG_DAYS = 3

/**
 * Dimension tuple stored per row. `page` is deliberately excluded by default: it is by
 * far the largest cardinality multiplier (every query × every ranking URL) and adds
 * little to volume calibration, which needs query-level impressions. The column exists
 * so a page-level sync can be added later without a migration.
 */
const DIMENSIONS = ['date', 'query', 'country', 'device'] as const

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Month boundaries, newest first — the recent months matter most if a run is cut short. */
function monthWindows(months: number): Array<{ startDate: string; endDate: string }> {
  const out: Array<{ startDate: string; endDate: string }> = []
  const latest = new Date(Date.now() - PROCESSING_LAG_DAYS * 86400000)
  for (let i = 0; i < months; i++) {
    const end = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - i + 1, 0))
    const start = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - i, 1))
    if (start > latest) continue
    out.push({ startDate: fmtDate(start), endDate: fmtDate(end > latest ? latest : end) })
  }
  return out
}

/** Joined on NUL, written as an escape so no raw NUL byte lands in this source file —
 *  a literal one makes git treat the whole file as binary and stop diffing it.
 *
 *  A separator that cannot occur inside a dimension value is the point: with a printable
 *  one, a query containing that character could hash identically to a different
 *  dimension tuple and silently overwrite an unrelated row. */
function dimHash(siteUrl: string, keys: string[]): string {
  return createHash('sha256').update([siteUrl, ...keys].join('\u0000')).digest('hex')
}

export interface GscSyncResult {
  siteUrl: string
  monthsRequested: number
  rowsFetched: number
  rowsWritten: number
  failed: boolean
}

/**
 * Pulls Search Analytics rows for one property and upserts them.
 *
 * Never throws — a missing connection, revoked grant or quota error returns a result
 * with `failed: true` rather than breaking the caller, matching the contract of every
 * other integration in the codebase.
 *
 * Idempotent: rows are keyed by a hash of (siteUrl + dimension values), so re-running
 * over a window that was already synced refreshes the metrics in place. That matters
 * because GSC keeps revising recent days for a while after they first appear.
 */
export async function syncGscProperty(
  userId: string,
  siteUrl: string,
  months = RETENTION_MONTHS
): Promise<GscSyncResult> {
  const result: GscSyncResult = {
    siteUrl, monthsRequested: months, rowsFetched: 0, rowsWritten: 0, failed: false,
  }

  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) { result.failed = true; return result }

  for (const window of monthWindows(months)) {
    const rows = await searchAnalyticsQueryAll(siteUrl, accessToken, {
      ...window,
      dimensions: DIMENSIONS,
      type: 'web',
      dataState: 'final',
    })
    result.rowsFetched += rows.length

    for (const r of rows) {
      const [date, query, country, device] = r.keys
      if (!date || !query) continue
      const hash = dimHash(siteUrl, r.keys)
      const data = {
        userId, siteUrl, date: new Date(`${date}T00:00:00.000Z`), query,
        country: country ?? '', device: device ?? '',
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
        dimHash: hash,
        fetchedAt: new Date(),
      }
      try {
        await prisma.gscQueryRow.upsert({
          where: { userId_dimHash: { userId, dimHash: hash } },
          create: data,
          update: {
            clicks: data.clicks, impressions: data.impressions,
            ctr: data.ctr, position: data.position, fetchedAt: data.fetchedAt,
          },
        })
        result.rowsWritten++
      } catch {
        // One bad row must not abort the pull; the rest of the window is still worth having.
      }
    }
  }

  return result
}

/** Coverage snapshot — the honest measure of whether the corpus can support calibration yet. */
export async function getGscCorpusStats(userId: string) {
  const [total, distinctQueries, range] = await Promise.all([
    prisma.gscQueryRow.count({ where: { userId } }),
    prisma.gscQueryRow.findMany({ where: { userId }, select: { query: true }, distinct: ['query'] }),
    prisma.gscQueryRow.aggregate({ where: { userId }, _min: { date: true }, _max: { date: true } }),
  ])
  return {
    rows: total,
    distinctQueries: distinctQueries.length,
    earliest: range._min.date,
    latest: range._max.date,
  }
}
