// Generic Google OAuth 2.0 helpers — provider-agnostic (works for any Google API scope,
// e.g. Search Console today, Business Profile later). Never throws; callers get null on
// any failure so a broken token exchange/refresh degrades gracefully, same house style
// as src/lib/dataforseo.ts and src/lib/seo-audit/psi.ts.

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
}

export interface RefreshedToken {
  accessToken: string
  expiresAt: Date
}

/**
 * Why a refresh failed. Google's own `error` field is carried through rather than
 * flattened, because the distinction is the whole point: `invalid_grant` means the
 * grant is gone for good and the user must reconnect, while a network blip or a 5xx
 * is worth retrying. Collapsing both into null is what made a dead connection look
 * identical to a transient outage.
 */
export type RefreshFailure =
  | { reason: 'not_configured' }
  /** Google refused the grant — revoked, expired (Testing-status apps expire refresh
   *  tokens after 7 days), or the client credentials no longer match the token. */
  | { reason: 'grant_rejected'; googleError: string }
  /** Network error, timeout, or a non-OK response that wasn't a grant rejection. */
  | { reason: 'unreachable'; detail: string }

export type RefreshResult =
  | { ok: true; token: RefreshedToken }
  | ({ ok: false } & RefreshFailure)

function credentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function buildGoogleAuthUrl(opts: { scope: string; redirectUri: string; state: string }): string | null {
  const creds = credentials()
  if (!creds) return null
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: opts.scope,
    access_type: 'offline',
    prompt: 'consent',
    state: opts.state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokens | null> {
  const creds = credentials()
  if (!creds) return null
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.access_token || !data.refresh_token) return null
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      scope: data.scope ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Exchanges a refresh token for a fresh access token.
 *
 * Reports *why* it failed rather than returning null for everything. A refresh can
 * fail because the grant is permanently gone (reconnect required) or because Google
 * was momentarily unreachable (retry), and those need opposite responses — telling a
 * user to reconnect during a transient outage throws away a working connection.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<RefreshResult> {
  const creds = credentials()
  if (!creds) return { ok: false, reason: 'not_configured' }
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string }

    if (!res.ok) {
      // Google returns 400 + {"error":"invalid_grant"} for a revoked or expired refresh
      // token — the one failure a user can actually fix, by reconnecting.
      if (data.error === 'invalid_grant' || data.error === 'invalid_client') {
        return { ok: false, reason: 'grant_rejected', googleError: data.error }
      }
      return { ok: false, reason: 'unreachable', detail: `HTTP ${res.status}${data.error ? ` ${data.error}` : ''}` }
    }
    if (!data.access_token) {
      return { ok: false, reason: 'unreachable', detail: 'no access_token in response' }
    }

    return {
      ok: true,
      token: {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + ((data as { expires_in?: number }).expires_in ?? 3600) * 1000),
      },
    }
  } catch (e) {
    return { ok: false, reason: 'unreachable', detail: e instanceof Error ? e.message : 'network error' }
  }
}

/** Best-effort revoke — used on disconnect. Failure here shouldn't block deleting the local connection. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    })
  } catch {
    // best-effort; local disconnect proceeds regardless
  }
}
