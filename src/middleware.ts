import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/analyse(.*)', '/api/optimizer(.*)', '/api/fetch-url(.*)',
  '/api/checkout(.*)', '/api/portal(.*)', '/api/user(.*)',
])

const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)'])

const rateLimitMap = new Map<string, { count: number; reset: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isWebhookRoute(req)) return NextResponse.next()

  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
  }

  // Clerk v6: auth is now a function that returns a promise — await it then call protect()
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
