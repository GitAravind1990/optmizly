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
