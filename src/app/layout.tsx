import type { Metadata } from 'next'
import { ClerkProviderWrapper } from '@/components/clerk-provider'
import { CookieBanner } from '@/components/cookie-banner'
import { PHProvider } from '@/components/posthog-provider'
import { PostHogUserIdentity } from '@/components/posthog-user-identity'
import { ReferralCapture } from '@/components/referral-capture'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import './globals.css'

export const dynamic = 'force-dynamic'

const switzer = localFont({
  src: [
    { path: '../fonts/switzer/Switzer-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/switzer/Switzer-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/switzer/Switzer-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/switzer/Switzer-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://optmizly.com'

export const metadata: Metadata = {
  metadataBase: APP_URL ? new URL(APP_URL) : undefined,
  title: {
    default: 'Optmizly – AI Content Optimizer',
    template: '%s | Optmizly',
  },
  // Tool counts drift. 23 is the Agency figure and the only one to quote in marketing copy —
  // see the canonical table in CLAUDE.md before changing it.
  description: 'Rank higher on Google and get cited in AI Overviews, AI Mode, ChatGPT and Perplexity. 24 AI-powered SEO tools for content teams, SEOs, and agencies.',
  keywords: [
    'AI SEO tools', 'content optimizer', 'E-E-A-T analysis', 'AI citations',
    'semantic SEO', 'content gap analysis', 'topical authority', 'SERP audit',
    'AI visibility', 'Core Web Vitals fixer', 'local SEO', 'backlink finder',
  ],
  authors: [{ name: 'Optmizly' }],
  creator: 'Optmizly',
  openGraph: {
    type: 'website',
    siteName: 'Optmizly',
    title: 'Optmizly – AI Content Optimizer',
    description: 'Rank higher on Google and get cited in AI Overviews, AI Mode, ChatGPT and Perplexity. 24 AI tools.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – AI Content Optimizer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Optmizly – AI Content Optimizer',
    description: 'Rank higher on Google and get cited in AI Overviews, AI Mode, ChatGPT and Perplexity. 24 AI tools.',
    creator: '@Optmizly',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  const hasPostHog = !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${switzer.variable} font-sans antialiased bg-white text-slate-900`}>
        <PHProvider>
          <ClerkProviderWrapper nonce={nonce}>
            {/* PostHogUserIdentity needs both Clerk context and PostHog initialised */}
            {hasPostHog && hasClerk && <PostHogUserIdentity />}
            {/* Records ?ref= site-wide. In Suspense because it reads useSearchParams, which
                opts its subtree out of static rendering — without the boundary every page
                under this layout would become dynamic. */}
            <Suspense fallback={null}>
              <ReferralCapture />
            </Suspense>
            {children}
            <CookieBanner />
          </ClerkProviderWrapper>
        </PHProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

