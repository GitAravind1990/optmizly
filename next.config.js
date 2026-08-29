/** @type {import('next').NextConfig} */

// CSP is set dynamically per-request in middleware (src/middleware.ts) using a per-request
// nonce. It cannot be set here because next.config.js headers() override middleware headers
// on Vercel, which would strip the nonce from the CSP.
const securityHeaders = [
  // X-Frame-Options kept for older browsers; CSP frame-ancestors 'none' covers modern ones
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

/**
 * When the marketing pages last actually changed, resolved at build time.
 *
 * Feeds `dateModified` on the homepage. It has to come from something real: a hardcoded
 * date goes stale the day after it is written, and `new Date()` at render time would claim
 * the page changed on every request, which is a freshness signal that is always "today" —
 * fabricating exactly the kind of number this codebase refuses to fabricate elsewhere.
 *
 * Three sources, each a truthful reading of "last changed", degrading in precision:
 *   1. the last commit touching the marketing sources — the accurate answer
 *   2. the last commit at all — right when a shallow clone cannot see further back
 *   3. build time — right in the sense that this is when the served page was produced
 *
 * **In production it is source 3, and that is worth knowing rather than assuming.**
 * Deploys here go out through `vercel deploy`, which uploads a source tarball with no
 * `.git` directory, so both git lookups fail and the build timestamp is what ships —
 * confirmed on the live page, which carries a `dateModified` ending in `Z` rather than the
 * `+05:30` a local commit produces. The published meaning is therefore "last deployed",
 * which is true, and close to "last changed" for a site where nearly every deploy touches
 * the marketing surface. It does move on an unrelated deploy; if that ever matters, the fix
 * is a build step that writes the commit date into the tarball, not a literal in here.
 *
 * Sources 1 and 2 still earn their place: they are what `next build` uses locally, which is
 * where the value gets eyeballed before it ships.
 *
 * Wrapped so a missing git, a shallow clone or a detached build can never fail a build.
 * A slightly less precise date is not worth blocking a deploy over.
 */
function resolveLastModified() {
  const { execFileSync } = require('child_process')
  const paths = [
    'src/app/page.tsx',
    'src/components/marketing',
    'src/components/home-hero.tsx',
    'src/components/page-pricing.tsx',
    'src/components/page-header.tsx',
  ]
  const git = args => {
    try {
      const out = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
      return out && !Number.isNaN(Date.parse(out)) ? out : null
    } catch {
      return null
    }
  }
  return (
    git(['log', '-1', '--format=%cI', '--', ...paths]) ??
    git(['log', '-1', '--format=%cI']) ??
    new Date().toISOString()
  )
}

const nextConfig = {
  poweredByHeader: false,
  env: {
    SITE_LAST_MODIFIED: resolveLastModified(),
  },
  // re2 is a native addon (.node binary) — bundling it breaks the require, so it must
  // stay external and be resolved at runtime, same as the Prisma client.
  serverExternalPackages: ['@prisma/client', 're2'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig