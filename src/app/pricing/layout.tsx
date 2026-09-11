import type { Metadata } from 'next'

// Both strings predated Starter and Agency Plus and named three of the five plans. The
// description was also 185 characters, over the 140-160 Optmizly's own readiness audit
// enforces — the pricing page failing the check the pricing page sells. Now 149.
// Plan names, prices and tool counts here are part of the drift checklist in CLAUDE.md.
export const metadata: Metadata = {
  title: 'Pricing – Plans from Free to Agency Plus',
  description: 'Start free with 3 analyses a month. Starter ($9) unlocks all 12 tools, Pro ($19) triples the volume, and Agency ($49) opens all 23. No card to start.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Optmizly Pricing – Free to Agency Plus',
    description: 'Start free. Starter $9, Pro $19, Agency $49, Agency Plus $99. AI-powered SEO tools for every team size.',
    url: '/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}

