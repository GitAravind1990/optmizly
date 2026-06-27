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

export default clerkMiddleware(async (_auth, req: NextRequest) => {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (!rateLimiter) {
      // In production, missing Upstash config means rate limiting is broken — fail closed.
      // In development, allow through so local work isn't blocked.
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

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
