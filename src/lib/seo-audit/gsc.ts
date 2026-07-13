// Real Google Search Console data — upgrades a handful of SEO Audit checks from
// heuristic/manual to real, measured data when the user has a connected GSC account
// and it covers the audited domain. Same never-throws, gracefully-degrading contract
// as psi.ts and crawler.ts: any failure anywhere just leaves the affected check on its
// existing behavior, never a thrown error, never a fabricated result.

import type { AutoCheckResult } from './auto-checks'
import type { CheckStatus } from './framework'
import { getValidAccessToken, listSearchConsoleSites, matchGSCProperty } from '@/lib/search-console'

const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3'
const URL_INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
const CALL_TIMEOUT_MS = 8000

/** Checks whose regex/heuristic result is upgraded to real GSC data when available;
 *  always has a producer either way. */
export const GSC_UPGRADE_CHECK_IDS = ['indexing.0.0'] as const

/** Checks with NO regex fallback — only populated when GSC data is available;
 *  otherwise correctly fall back to the manual checklist. */
export const GSC_ONLY_CHECK_IDS = ['sitemap.0.1', 'cannibalization.0.0'] as const

export interface CannibalizationHit {
  query: string
  auditedPosition: number
  competingUrl: string
  competingPosition: number
}

export interface GSCAuditData {
  siteUrl: string
  sitemapSubmitted: boolean | null
  indexingState: string | null
  cannibalizationChecked: boolean
  cannibalization: CannibalizationHit[]
}

function dateRange(): { startDate: string; endDate: string } {
  // GSC data has a ~2-3 day processing lag; 90-day window gives enough volume to
  // separate signal from noise on lower-traffic pages.
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(Date.now() - 3 * 86400000)
  const start = new Date(end.getTime() - 90 * 86400000)
  return { startDate: fmt(start), endDate: fmt(end) }
}

async function fetchJSON(url: string, accessToken: string, init?: RequestInit): Promise<unknown | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

interface QueryRow { keys: string[]; clicks: number; impressions: number; position: number }

async function searchAnalyticsQuery(
  siteUrl: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<QueryRow[] | null> {
  const data = await fetchJSON(
    `${WEBMASTERS_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    accessToken,
    { method: 'POST', body: JSON.stringify(body) }
  ) as { rows?: unknown } | null
  // The API returns 200 with no `rows` field at all (not `rows: []`) when nothing
  // matches the filters — that's a successful "no data" response, not a failure.
  if (!data) return null
  if (!Array.isArray(data.rows)) return []
  return data.rows.filter((r): r is QueryRow =>
    !!r && typeof r === 'object' && Array.isArray((r as QueryRow).keys)
  )
}

function normalizeUrl(u: string): string {
  try {
    const p = new URL(u)
    // Compare on host+path only: scheme and a leading "www." are the same page for
    // this purpose, and GSC/the audited URL may disagree on either. Query/hash are
    // dropped too, since GSC's page dimension is already the canonical page URL.
    const host = p.hostname.toLowerCase().replace(/^www\./, '')
    const path = p.pathname.replace(/\/$/, '')
    return `${host}${path}`
  } catch {
    return u.toLowerCase()
  }
}

/**
 * Never throws. Returns null if not connected, no matching verified property, or the
 * access token can't be obtained. Individual fields within the returned data are
 * independently null/false when their specific API call fails — a partial result is
 * still returned rather than discarded, so one quota error doesn't blank out the
 * other checks.
 */
export async function fetchGSCAuditData(
  userId: string,
  auditedUrl: string,
  discoveredSitemapUrl: string | null
): Promise<GSCAuditData | null> {
  try {
    const sites = await listSearchConsoleSites(userId)
    if (!sites) return null

    const match = matchGSCProperty(auditedUrl, sites)
    if (!match) return null

    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) return null

    const { siteUrl } = match
    const { startDate, endDate } = dateRange()

    const [sitemapsResult, inspectionResult, pageQueryResult] = await Promise.allSettled([
      discoveredSitemapUrl
        ? fetchJSON(`${WEBMASTERS_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, accessToken)
        : Promise.resolve(null),
      fetchJSON(URL_INSPECTION_ENDPOINT, accessToken, {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: auditedUrl, siteUrl }),
      }),
      searchAnalyticsQuery(siteUrl, accessToken, {
        startDate, endDate,
        dimensions: ['query'],
        dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: auditedUrl }] }],
        rowLimit: 25,
      }),
    ])

    // Sitemap submission status
    let sitemapSubmitted: boolean | null = null
    if (discoveredSitemapUrl && sitemapsResult.status === 'fulfilled' && sitemapsResult.value) {
      const data = sitemapsResult.value as { sitemap?: Array<{ path?: string }> }
      if (Array.isArray(data.sitemap)) {
        sitemapSubmitted = data.sitemap.some(s => typeof s.path === 'string' && normalizeUrl(s.path) === normalizeUrl(discoveredSitemapUrl))
      }
    }

    // Real indexing status
    let indexingState: string | null = null
    if (inspectionResult.status === 'fulfilled' && inspectionResult.value) {
      const data = inspectionResult.value as { inspectionResult?: { indexStatusResult?: { indexingState?: string } } }
      indexingState = data.inspectionResult?.indexStatusResult?.indexingState ?? null
    }

    // Cannibalization: cross-check the audited page's top queries site-wide
    let cannibalizationChecked = false
    const cannibalization: CannibalizationHit[] = []
    if (pageQueryResult.status === 'fulfilled' && pageQueryResult.value) {
      const candidates = pageQueryResult.value
        .map(r => ({ query: r.keys[0], position: r.position, impressions: r.impressions }))
        .filter(r => r.query && r.impressions >= 10 && r.position <= 20)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 5)

      if (candidates.length > 0) {
        const crossChecks = await Promise.allSettled(
          candidates.map(c => searchAnalyticsQuery(siteUrl, accessToken, {
            startDate, endDate,
            dimensions: ['page'],
            dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'equals', expression: c.query }] }],
            rowLimit: 10,
          }))
        )

        for (let i = 0; i < candidates.length; i++) {
          const result = crossChecks[i]
          if (result.status !== 'fulfilled' || !result.value) continue
          cannibalizationChecked = true
          const competitor = result.value
            .map(r => ({ url: r.keys[0], position: r.position, impressions: r.impressions }))
            .find(r => r.url && normalizeUrl(r.url) !== normalizeUrl(auditedUrl) && r.impressions >= 10 && r.position <= 20)
          if (competitor) {
            cannibalization.push({
              query: candidates[i].query,
              auditedPosition: Math.round(candidates[i].position),
              competingUrl: competitor.url,
              competingPosition: Math.round(competitor.position),
            })
          }
        }
      } else {
        // Page-level call succeeded but had no queries worth cross-checking — that IS
        // a real check (nothing to flag), not a failure to check.
        cannibalizationChecked = true
      }
    }

    return { siteUrl, sitemapSubmitted, indexingState, cannibalizationChecked, cannibalization }
  } catch {
    return null
  }
}

const pass = (detail: string): AutoCheckResult => ({ status: 'pass', detail })
const warn = (detail: string): AutoCheckResult => ({ status: 'warn', detail })
const fail = (detail: string): AutoCheckResult => ({ status: 'fail', detail })

/** Pure. Overwrites only the checks for which real data is present; anything missing
 *  leaves the existing autoResults entry (heuristic or unset) untouched. */
export function applyGSCOverrides(autoResults: Record<string, AutoCheckResult>, data: GSCAuditData | null): void {
  if (!data) return

  if (data.sitemapSubmitted != null) {
    autoResults['sitemap.0.1'] = data.sitemapSubmitted
      ? pass('Sitemap is submitted and known to Google (Search Console)')
      : fail('Sitemap was not found in Search Console\'s submitted sitemaps for this property')
  }

  if (data.indexingState != null) {
    const status: CheckStatus | null =
      data.indexingState === 'INDEXING_ALLOWED' ? 'pass'
      : data.indexingState.startsWith('BLOCKED_') ? 'fail'
      : null
    if (status === 'pass') autoResults['indexing.0.0'] = pass(`Google reports this page is indexable (${data.indexingState}, Search Console)`)
    else if (status === 'fail') autoResults['indexing.0.0'] = fail(`Google reports this page is blocked from indexing (${data.indexingState}, Search Console)`)
    // unrecognized state: leave the existing heuristic result untouched
  }

  if (data.cannibalizationChecked) {
    autoResults['cannibalization.0.0'] = data.cannibalization.length > 0
      ? warn(
          data.cannibalization.slice(0, 3)
            .map(h => `"${h.query}" — this page ranks #${h.auditedPosition}, ${h.competingUrl} ranks #${h.competingPosition} (Search Console, last 90 days)`)
            .join('; ')
        )
      : pass('No competing pages found for this page\'s top queries (Search Console, last 90 days)')
  }
}
