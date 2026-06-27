/** @type {import('next').NextConfig} */

// CSP notes:
// - script-src needs 'unsafe-inline' because Next.js App Router injects inline hydration
//   scripts. Eliminating this requires nonce-based CSP wired through middleware — future work.
// - style-src needs 'unsafe-inline' for Tailwind + Clerk inline styles.
// - next/font/google self-hosts fonts at build time, so fonts.gstatic.com is not needed.
// - Google Maps scripts/images are only loaded on the /dashboard/tools/geogrid page.
// - All Anthropic/DoDo/Resend calls are server-side; no browser connect-src needed for them.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.clerk.com https://*.clerk.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://maps.gstatic.com https://maps.googleapis.com https://*.google.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.clerk.com https://*.clerk.com wss://*.clerk.com https://maps.googleapis.com",
  "frame-src 'self' https://*.clerk.com",
  "worker-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  // X-Frame-Options kept for older browsers; CSP frame-ancestors covers modern ones
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@prisma/client'],
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