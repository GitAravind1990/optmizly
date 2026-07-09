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
