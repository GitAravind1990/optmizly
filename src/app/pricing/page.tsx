import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PagePricing } from '@/components/page-pricing'

const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const muted = '#8A93A3'
const line2 = '#F0F2F6'

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Is there a free plan?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Free plan is free forever, no credit card required. You get 3 analyses per month and full access to content scoring.' } },
    { '@type': 'Question', name: 'What counts as one analysis?', acceptedAnswer: { '@type': 'Answer', text: 'Each time you submit content or a URL for scoring, it uses one analysis credit. Most tools cost one credit. Tools that pull more live data from third-party providers on your behalf cost more, and each one tells you its cost before you run it. Three credits: Keyword Research, Competitor Spy, Ranking Engine, Geogrid and the Local SEO suite. Two credits: Backlinks, Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Visibility, Content Gap and Content Planner. Credits reset at the start of each billing month, and the Free plan tools all cost one. SEO Client Finder is the exception: it does not use analysis credits at all, and has its own limit of 50 searches a day.' } },
    { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cancel from your account settings at any time. You keep full access until the end of your current billing period.' } },
    { '@type': 'Question', name: 'How does the free trial work?', acceptedAnswer: { '@type': 'Answer', text: 'Pro and Agency plans include a 7-day free trial. We ask for a card to start, but you won\'t be charged until the trial ends. Cancel anytime before then and you won\'t be charged at all.' } },
    { '@type': 'Question', name: 'Do I need API keys or anything installed?', acceptedAnswer: { '@type': 'Answer', text: 'No. Optmizly is fully hosted and all AI analysis is included in your plan. Agency plan users can optionally connect Google Search Console for deeper SEO Audit insights, but no third-party API keys or setup are ever required.' } },
    { '@type': 'Question', name: 'Can I upgrade or downgrade my plan?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Upgrade instantly from your dashboard settings. Downgrades take effect at the start of your next billing cycle.' } },
  ],
})

export default function PricingPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: sans }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <PageHeader />
      <PagePricing />
      <footer style={{ background: '#FAFAFA', borderTop: `1px solid ${line2}` }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '24px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, fontSize: 13, color: muted, fontFamily: sans,
        }}>
          <div>© 2026 Optmizly, Inc. · Payments processed by Dodo Payments · Cancel anytime</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/terms" style={{ color: muted, textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ color: muted, textDecoration: 'none' }}>Privacy</Link>
            <Link href="/refund-policy" style={{ color: muted, textDecoration: 'none' }}>Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
