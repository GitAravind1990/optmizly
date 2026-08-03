// Search Console-specific API client. Consumes the generic OAuth helpers in
// google-oauth.ts. Never throws — returns null on any failure so a broken/expired
// connection degrades gracefully wherever it's read from.

import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import { refreshGoogleAccessToken } from '@/lib/google-oauth'

export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

const SITES_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites'

/** Returns a valid (non-expired) access token for the user's connection, refreshing it
 *  first if it's within 2 minutes of expiry. Returns null if there's no connection, or
 *  the stored tokens can't be decrypted/refreshed. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId } })
  if (!conn) return null

  const expiringSoon = conn.tokenExpiresAt.getTime() - Date.now() < 2 * 60 * 1000
  if (!expiringSoon) {
    try {
      return decrypt(conn.accessTokenEnc)
    } catch {
      return null
    }
  }

  let refreshToken: string
  try {
    refreshToken = decrypt(conn.refreshTokenEnc)
  } catch {
    return null
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken)
  if (!refreshed) return null

  await prisma.searchConsoleConnection.update({
    where: { userId },
    data: { accessTokenEnc: encrypt(refreshed.accessToken), tokenExpiresAt: refreshed.expiresAt },
  })

  return refreshed.accessToken
}

const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3'

/** Google's hard cap for a single searchAnalytics/query request. */
export const GSC_MAX_ROW_LIMIT = 25000

export interface GSCAnalyticsRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * One raw searchAnalytics/query call. Null means the call failed; `[]` means it
 * succeeded with nothing matching — the API omits the `rows` field entirely in that
 * case rather than returning an empty array, and conflating the two would make a
 * quota error look like "this site ranks for nothing".
 *
 * Lives here rather than in seo-audit/ because it is the entry point to the only
 * ground-truth data source in the product; the SEO Audit tool is one consumer.
 */
export async function searchAnalyticsQuery(
  siteUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
  timeoutMs = 8000
): Promise<GSCAnalyticsRow[] | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(
      `${WEBMASTERS_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { rows?: unknown }
    if (!Array.isArray(data.rows)) return []
    return data.rows.filter((r): r is GSCAnalyticsRow =>
      !!r && typeof r === 'object' && Array.isArray((r as GSCAnalyticsRow).keys)
    )
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * Pages through searchAnalytics/query until exhausted. Stops on the first failed page
 * and returns what it already has, so a mid-pull quota error yields a partial corpus
 * rather than nothing — the caller upserts, so the missing tail is picked up next run.
 */
export async function searchAnalyticsQueryAll(
  siteUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
  maxRows = 100000
): Promise<GSCAnalyticsRow[]> {
  const out: GSCAnalyticsRow[] = []
  for (let startRow = 0; startRow < maxRows; startRow += GSC_MAX_ROW_LIMIT) {
    const page = await searchAnalyticsQuery(
      siteUrl,
      accessToken,
      { ...body, rowLimit: GSC_MAX_ROW_LIMIT, startRow },
      30000
    )
    if (!page) break
    out.push(...page)
    if (page.length < GSC_MAX_ROW_LIMIT) break
  }
  return out
}

export interface GSCSite {
  siteUrl: string
  permissionLevel: string
}

/** Lists the Search Console properties the connected Google account can access.
 *  Best-effort caches the result on the connection row for cheap status reads. */
export async function listSearchConsoleSites(userId: string): Promise<GSCSite[] | null> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return null

  try {
    const res = await fetch(SITES_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) return null
    const data = await res.json()
    const entries = Array.isArray(data?.siteEntry) ? data.siteEntry : []
    const sites: GSCSite[] = entries
      .filter((s: unknown): s is { siteUrl: unknown; permissionLevel: unknown } => !!s && typeof s === 'object')
      .map((s: { siteUrl: unknown; permissionLevel: unknown }) => ({
        siteUrl: typeof s.siteUrl === 'string' ? s.siteUrl : '',
        permissionLevel: typeof s.permissionLevel === 'string' ? s.permissionLevel : '',
      }))
      .filter((s: GSCSite) => s.siteUrl)

    await prisma.searchConsoleConnection.update({
      where: { userId },
      data: { sitesCache: JSON.stringify(sites), sitesFetchedAt: new Date() },
    }).catch(() => {}) // best-effort cache write — don't fail the read over it

    return sites
  } catch {
    return null
  }
}

export interface GSCPropertyMatch {
  siteUrl: string
  type: 'domain' | 'url-prefix'
}

/**
 * Matches an audited URL to the most specific GSC property that covers it.
 * URL-prefix properties (scheme+host+path, scheme-sensitive) win over domain
 * properties (`sc-domain:`, scheme-agnostic, matches subdomains) when both apply,
 * since they're more specific; longest-prefix wins among multiple prefix matches.
 * `siteUnverifiedUser` entries are excluded — that permission level can't back real
 * read calls. Pure function, no network.
 */
export function matchGSCProperty(auditedUrl: string, sites: GSCSite[]): GSCPropertyMatch | null {
  let parsed: URL
  try {
    parsed = new URL(auditedUrl)
  } catch {
    return null
  }

  const hostname = parsed.hostname.toLowerCase()
  const normalizedAudited = `${parsed.protocol}//${hostname}${parsed.pathname}${parsed.search}`
  const verified = sites.filter(s => s.permissionLevel !== 'siteUnverifiedUser')

  const urlPrefixCandidates = verified
    .filter(s => !s.siteUrl.startsWith('sc-domain:'))
    .map(s => {
      let propUrl: URL
      try {
        propUrl = new URL(s.siteUrl)
      } catch {
        return null
      }
      const normalizedProp = `${propUrl.protocol}//${propUrl.hostname.toLowerCase()}${propUrl.pathname}`
      return normalizedAudited.startsWith(normalizedProp) ? { siteUrl: s.siteUrl, matchLen: normalizedProp.length } : null
    })
    .filter((x): x is { siteUrl: string; matchLen: number } => x !== null)
    .sort((a, b) => b.matchLen - a.matchLen)

  if (urlPrefixCandidates.length > 0) {
    return { siteUrl: urlPrefixCandidates[0].siteUrl, type: 'url-prefix' }
  }

  const domainCandidates = verified
    .filter(s => s.siteUrl.startsWith('sc-domain:'))
    .map(s => ({ siteUrl: s.siteUrl, domain: s.siteUrl.slice('sc-domain:'.length).toLowerCase() }))
    .filter(s => hostname === s.domain || hostname.endsWith(`.${s.domain}`))
    .sort((a, b) => b.domain.length - a.domain.length)

  if (domainCandidates.length > 0) {
    return { siteUrl: domainCandidates[0].siteUrl, type: 'domain' }
  }

  return null
}
