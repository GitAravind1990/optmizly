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