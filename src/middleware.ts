import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

let rateLimiter: ((ip: string) => Promise<{ success: boolean }>) | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Ratelimit } = require('@upstash/ratelimit')
  const { Redis } = require('@upstash/redis')

  const ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'rl:optmizly',
  })

  rateLimiter = (ip: string) => ratelimit.limit(ip)
}

const IS_PROD = process.env.NODE_ENV === 'production'

const REPORT_URI = '/api/csp-report'

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    // Modern browsers: 'nonce-...' + 'strict-dynamic' enforces nonce; 'unsafe-inline' is ignored.
    // Older browsers: 'unsafe-inline' acts as fallback (strict-dynamic not understood).
    // Host sources: last-resort fallback for browsers that understand neither.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https://cdn.clerk.com https://*.clerk.com https://clerk.optmizly.com https://maps.googleapis.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com https://maps.gstatic.com https://maps.googleapis.com https://*.google.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.clerk.com https://*.clerk.com wss://*.clerk.com https://clerk.optmizly.com wss://clerk.optmizly.com https://maps.googleapis.com",
    "frame-src 'self' https://*.clerk.com https://clerk.optmizly.com",
    "worker-src blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    `report-uri ${REPORT_URI}`,
    "report-to csp-endpoint",
  ].join('; ')
}

export default clerkMiddleware(async (_auth, req: NextRequest) => {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (!rateLimiter) {
      if (IS_PROD) {
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
      }
    } else {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
      const { success } = await rateLimiter(ip)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests — slow down.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    }
  }

  // Per-request nonce. Next.js reads x-nonce from request headers and automatically
  // adds nonce="..." to its own inline RSC hydration scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCSP(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  // report-to (CSP Level 3, Chrome/Edge); report-uri above covers Firefox/Safari
  response.headers.set(
    'reporting-endpoints',
    `csp-endpoint="${REPORT_URI}"`
  )
  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
