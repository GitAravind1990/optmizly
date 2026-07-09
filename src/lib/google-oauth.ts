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

export async function refreshGoogleAccessToken(refreshToken: string): Promise<RefreshedToken | null> {
  const creds = credentials()
  if (!creds) return null
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
    const data = await res.json()
    if (!res.ok || !data.access_token) return null
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    }
  } catch {
    return null
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
