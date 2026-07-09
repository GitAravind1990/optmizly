import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { buildGoogleAuthUrl } from '@/lib/google-oauth'
import { GSC_SCOPE } from '@/lib/search-console'

export const runtime = 'nodejs'

// Redirect URI is derived from the actual request origin (not NEXT_PUBLIC_APP_URL,
// which is pinned to the production URL even in .env.local) so this works against
// both localhost and production without any env-specific branching.
export async function GET(req: NextRequest) {
  try {
    await requireToolAccess('search-console')
  } catch (e) {
    if (e instanceof AuthError && e.status === 401) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&error=plan', req.url))
  }

  const redirectUri = `${req.nextUrl.origin}/api/integrations/search-console/callback`
  const state = randomBytes(32).toString('hex')
  const authUrl = buildGoogleAuthUrl({ scope: GSC_SCOPE, redirectUri, state })

  if (!authUrl) {
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&error=not_configured', req.url))
  }

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('gsc_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
