import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Upstash-backed rate limiter — only active when env vars are set.
// Falls back to no limiting if not configured (avoids breaking the site).
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

export default clerkMiddleware(async (_auth, req: NextRequest) => {
  if (req.nextUrl.pathname.startsWith('/api/') && rateLimiter) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { success } = await rateLimiter(ip)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests — slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
