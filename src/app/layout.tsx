import type { Metadata } from 'next'
import { ClerkProviderWrapper } from '@/components/clerk-provider'
import { CookieBanner } from '@/components/cookie-banner'
import { PHProvider } from '@/components/posthog-provider'
import { PostHogUserIdentity } from '@/components/posthog-user-identity'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://optmizly.com'

export const metadata: Metadata = {
  metadataBase: APP_URL ? new URL(APP_URL) : undefined,
  title: {
    default: 'Optmizly – AI Content Optimizer',
    template: '%s | Optmizly',
  },
  description: 'Rank higher on Google and get cited by ChatGPT, Perplexity, and every AI engine. 17 AI-powered SEO tools for content teams, SEOs, and agencies.',
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
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 17 AI-powered SEO tools.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – AI Content Optimizer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Optmizly – AI Content Optimizer',
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 17 AI-powered SEO tools.',
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
      <body className={`${inter.variable} font-sans antialiased bg-white text-slate-900`}>
        <PHProvider>
          <ClerkProviderWrapper nonce={nonce}>
            {/* PostHogUserIdentity needs both Clerk context and PostHog initialised */}
            {hasPostHog && hasClerk && <PostHogUserIdentity />}
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

