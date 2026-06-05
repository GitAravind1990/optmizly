import type { Metadata } from 'next'
import { ClerkProviderWrapper } from '@/components/clerk-provider'
import { Inter } from 'next/font/google'
import './globals.css'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://optmizly.com'

export const metadata: Metadata = {
  metadataBase: APP_URL ? new URL(APP_URL) : undefined,
  title: {
    default: 'Optmizly â€” AI Content Optimizer',
    template: '%s | Optmizly',
  },
  description: 'Rank higher on Google and get cited by ChatGPT, Perplexity, and every AI engine. 11 AI-powered SEO tools for content teams, SEOs, and agencies.',
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
    title: 'Optmizly â€” AI Content Optimizer',
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 11 AI-powered SEO tools.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Optmizly â€” AI Content Optimizer',
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 11 AI-powered SEO tools.',
    creator: '@Optmizly',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-white text-slate-900`}>
        <ClerkProviderWrapper>
          {children}
        </ClerkProviderWrapper>
      </body>
    </html>
  )
}

