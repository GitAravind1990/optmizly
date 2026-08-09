import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
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
  // Local dev uses Clerk's own *.clerk.accounts.dev test instance domain (there's no
  // custom Clerk domain locally); production uses the clerk.optmizly.com custom domain
  // already allowlisted below. Keep this out of the production policy — no need to
  // widen it there since prod never talks to accounts.dev.
  const devClerk = IS_PROD ? '' : ' https://*.clerk.accounts.dev wss://*.clerk.accounts.dev'
  // next dev's webpack Fast Refresh uses eval() for dev-only source maps — harmless in
  // dev, never present in a `next build` output, so this must never leak into prod CSP.
  const devEval = IS_PROD ? '' : " 'unsafe-eval'"
  return [
    "default-src 'self'",
    // Modern browsers: 'nonce-...' + 'strict-dynamic' enforces nonce; 'unsafe-inline' is ignored.
    // Older browsers: 'unsafe-inline' acts as fallback (strict-dynamic not understood).
    // Host sources: last-resort fallback for browsers that understand neither.
    // 'wasm-unsafe-eval': the vector Map ID's rendering engine (used for AdvancedMarker
    // support in Geogrid) compiles a WebAssembly module — narrower than 'unsafe-eval',
    // it only permits WASM compilation, not arbitrary eval()/Function() of JS strings.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'wasm-unsafe-eval'${devEval} https://cdn.clerk.com https://*.clerk.com https://clerk.optmizly.com https://us-assets.i.posthog.com https://maps.googleapis.com https://challenges.cloudflare.com${devClerk}`,
    // fonts.googleapis.com: the PlaceAutocompleteElement widget loads its own Google
    // Sans/Roboto stylesheet for the suggestions dropdown.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://img.clerk.com https://maps.gstatic.com https://maps.googleapis.com https://*.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // places.googleapis.com (Places API "New", used by PlaceAutocompleteElement's
    // AutocompletePlaces RPC) is a distinct domain from maps.googleapis.com — both
    // are needed, they aren't interchangeable. www.gstatic.com: the vector map's
    // own style/legend resource fetch (also distinct from maps.gstatic.com below).
    `connect-src 'self' https://api.clerk.com https://*.clerk.com wss://*.clerk.com https://clerk.optmizly.com wss://clerk.optmizly.com https://us.i.posthog.com https://us-assets.i.posthog.com https://maps.googleapis.com https://places.googleapis.com https://www.gstatic.com https://challenges.cloudflare.com${devClerk}`,
    // Clerk's bot-protection (Cloudflare Turnstile) renders an invisible challenge iframe from
    // this origin before letting sign-in/sign-up (incl. OAuth) proceed — without it here the
    // iframe is silently blocked and the "Continue with Google" button spins forever.
    `frame-src 'self' https://*.clerk.com https://clerk.optmizly.com https://challenges.cloudflare.com${devClerk}`,
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

/**
 * Pages that require a signed-in user.
 *
 * Only /dashboard. The API routes authenticate themselves and return 401, which is the
 * right answer for a fetch; /admin redirects from its own layout via requireAdmin(); and
 * /agency/reports/[reportId] is deliberately public, because that is the link an agency
 * shares with its client.
 */
const isProtectedPage = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Before this existed, /dashboard/* rendered for signed-out visitors: the middleware
  // ran Clerk but never asked it to protect anything, and no page had its own guard. No
  // data leaked, since every API returns 401 — but a logged-out visitor could fill in a
  // tool, submit it, and get an error instead of being asked to sign in.
  if (isProtectedPage(req)) {
    const { userId } = await auth()
    if (!userId) {
      // Explicit path rather than Clerk's redirectToSignIn(): that resolves through
      // NEXT_PUBLIC_CLERK_SIGN_IN_URL, which has been empty in production before now
      // (see the June sign-in loop), and its default of /sign-in does not exist here —
      // the sign-in page is /login. A hardcoded path cannot 404 on a misconfigured env.
      const login = new URL('/login', req.url)
      login.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search)
      return NextResponse.redirect(login)
    }
  }

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
          { error: 'Too many requests, slow down.' },
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
