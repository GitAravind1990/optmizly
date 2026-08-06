// Search Console-specific API client. Consumes the generic OAuth helpers in
// google-oauth.ts. Never throws — returns null on any failure so a broken/expired
// connection degrades gracefully wherever it's read from.

import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import { refreshGoogleAccessToken } from '@/lib/google-oauth'

export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

const SITES_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites'

/**
 * Why a Search Console read could not be made. Every one of these used to surface as a
 * bare null, which meant a permanently dead connection, a rotated ENCRYPTION_KEY, an
 * unset env var and a momentary Google outage were indistinguishable at the call site —
 * and the user got one opaque message for all of them.
 *
 * `expired` is the one a user can fix themselves, and by far the most common: an OAuth
 * app left in "Testing" publishing status has its refresh tokens expired by Google after
 * 7 days, so connections die on their own about a week after they are made.
 */
export type GSCAuthError =
  | 'not_connected'
  | 'expired'
  | 'not_configured'
  /** Stored tokens exist but won't decrypt — normally a changed/missing ENCRYPTION_KEY. */
  | 'undecryptable'
  | 'unreachable'

/** Human-readable, user-facing text per failure. Kept beside the type so a new reason
 *  cannot be added without deciding what the user is told. */
export const GSC_AUTH_MESSAGES: Record<GSCAuthError, string> = {
  not_connected: 'Search Console is not connected.',
  expired: 'The Search Console connection has expired. Disconnect and connect again to restore it.',
  not_configured: 'Search Console is not configured on the server.',
  undecryptable: 'The stored Search Console credentials could not be read. Disconnect and connect again.',
  unreachable: 'Could not reach Google right now. This is usually temporary — try again shortly.',
}

export type GSCTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: GSCAuthError; detail?: string }

/**
 * Returns a valid (non-expired) access token, refreshing if it is within 2 minutes of
 * expiry, and reporting why when it cannot.
 *
 * Prefer this over getValidAccessToken() anywhere the reason reaches a human.
 */
export async function getAccessTokenResult(userId: string): Promise<GSCTokenResult> {
  const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId } })
  if (!conn) return { ok: false, error: 'not_connected' }

  const expiringSoon = conn.tokenExpiresAt.getTime() - Date.now() < 2 * 60 * 1000
  if (!expiringSoon) {
    try {
      return { ok: true, accessToken: decrypt(conn.accessTokenEnc) }
    } catch {
      return { ok: false, error: 'undecryptable' }
    }
  }

  let refreshToken: string
  try {
    refreshToken = decrypt(conn.refreshTokenEnc)
  } catch {
    return { ok: false, error: 'undecryptable' }
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken)
  if (!refreshed.ok) {
    if (refreshed.reason === 'grant_rejected') {
      return { ok: false, error: 'expired', detail: refreshed.googleError }
    }
    if (refreshed.reason === 'not_configured') return { ok: false, error: 'not_configured' }
    return { ok: false, error: 'unreachable', detail: refreshed.detail }
  }

  await prisma.searchConsoleConnection.update({
    where: { userId },
    data: { accessTokenEnc: encrypt(refreshed.token.accessToken), tokenExpiresAt: refreshed.token.expiresAt },
  })

  return { ok: true, accessToken: refreshed.token.accessToken }
}

/** Token or null, for callers that only branch on success (SEO Audit's GSC widget, the
 *  corpus sync). A thin wrapper over getAccessTokenResult so there is one implementation. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const result = await getAccessTokenResult(userId)
  return result.ok ? result.accessToken : null
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

export type GSCSitesResult =
  | { ok: true; sites: GSCSite[] }
  | { ok: false; error: GSCAuthError; detail?: string }

/** Lists the Search Console properties the connected account can access, reporting why
 *  when it cannot. Best-effort caches the result on the connection row. */
export async function listSearchConsoleSitesResult(userId: string): Promise<GSCSitesResult> {
  const token = await getAccessTokenResult(userId)
  if (!token.ok) return token

  try {
    const res = await fetch(SITES_ENDPOINT, { headers: { Authorization: `Bearer ${token.accessToken}` } })
    if (!res.ok) {
      // A 401/403 here means the token was accepted for refresh but is not good for this
      // API — usually the Search Console API is not enabled on the project, or the grant
      // lacks the scope. Neither is retryable, but both are fixed by reconnecting after
      // the Cloud Console setup is corrected.
      const error: GSCAuthError = res.status === 401 || res.status === 403 ? 'expired' : 'unreachable'
      return { ok: false, error, detail: `sites.list HTTP ${res.status}` }
    }
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

    return { ok: true, sites }
  } catch (e) {
    return { ok: false, error: 'unreachable', detail: e instanceof Error ? e.message : 'network error' }
  }
}

/** Sites or null, for callers that only branch on success. Thin wrapper over
 *  listSearchConsoleSitesResult so there is one implementation. */
export async function listSearchConsoleSites(userId: string): Promise<GSCSite[] | null> {
  const result = await listSearchConsoleSitesResult(userId)
  return result.ok ? result.sites : null
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
