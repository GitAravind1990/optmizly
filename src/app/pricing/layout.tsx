import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing â€” Free, Pro & Agency Plans',
  description: 'Start free with Optmizly. Upgrade to Pro ($19/mo) for 50 analyses and AI-powered content optimization, or Agency ($49/mo) for 200 analyses and exclusive tools like AI Performance Fixer.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Optmizly Pricing â€” Free, Pro & Agency',
    description: 'Start free. Pro at $19/mo. Agency at $49/mo. AI-powered SEO tools for every team size.',
    url: '/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}

