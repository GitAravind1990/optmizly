import { NextRequest, NextResponse } from 'next/server'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { exchangeCodeForTokens } from '@/lib/google-oauth'
import { encrypt } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function redirectToSettings(req: NextRequest, query: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations${query}`, req.url))
  res.cookies.delete('gsc_oauth_state')
  return res
}

export async function GET(req: NextRequest) {
  let user
  try {
    user = await requireToolAccess('search-console')
  } catch (e) {
    if (e instanceof AuthError && e.status === 401) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
    return redirectToSettings(req, '&error=plan')
  }

  const oauthError = req.nextUrl.searchParams.get('error')
  if (oauthError) {
    // User declined consent on Google's screen, or Google itself errored — not a bug.
    return redirectToSettings(req, '&error=denied')
  }

  const state = req.nextUrl.searchParams.get('state')
  const expectedState = req.cookies.get('gsc_oauth_state')?.value
  if (!state || !expectedState || state !== expectedState) {
    return redirectToSettings(req, '&error=invalid_state')
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return redirectToSettings(req, '&error=missing_code')
  }

  const redirectUri = `${req.nextUrl.origin}/api/integrations/search-console/callback`
  const tokens = await exchangeCodeForTokens(code, redirectUri)
  if (!tokens) {
    return redirectToSettings(req, '&error=exchange_failed')
  }

  const data = {
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: encrypt(tokens.refreshToken),
    scope: tokens.scope,
    tokenExpiresAt: tokens.expiresAt,
  }
  await prisma.searchConsoleConnection.upsert({
    where: { userId: user.userId },
    create: { userId: user.userId, ...data },
    update: data,
  })

  return redirectToSettings(req, '&connected=1')
}
