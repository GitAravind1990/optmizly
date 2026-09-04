import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PagePricing } from '@/components/page-pricing'
import { FreeToolsSection } from '@/components/free-tools-section'

const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const muted = '#8A93A3'
const line2 = '#F0F2F6'

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Is there a free plan?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Free plan is free forever, no credit card required. You get 3 analyses per month and full access to content scoring.' } },
    { '@type': 'Question', name: 'What counts as one analysis?', acceptedAnswer: { '@type': 'Answer', text: 'Each time you submit content or a URL for scoring, it uses one analysis credit. Most tools cost one credit. Tools that pull more live data from third-party providers on your behalf cost more, and each one tells you its cost before you run it. Three credits: Keyword Research, Competitor Spy, Ranking Engine, Geogrid and the Local SEO suite. Two credits: Backlinks, Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Visibility, Content Gap and Content Planner. Credits reset at the start of each billing month, and the Free plan tools all cost one. SEO Client Finder is the exception: it does not use analysis credits at all, and has its own limit of 5 searches a day.' } },
    { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cancel from your account settings at any time. You keep full access until the end of your current billing period.' } },
    { '@type': 'Question', name: 'Can I pay annually?', acceptedAnswer: { '@type': 'Answer', text: 'Pro is $19 monthly or $228 a year, and Agency is $49 monthly or $588 a year, chosen at checkout \u2013 the annual price is twelve months at the same rate, so paying yearly costs the same and simply renews once instead of twelve times. If you have a discount code that applies to the first billing cycle, it covers your first year and the subscription renews at the full $588 after that.' } },
    { '@type': 'Question', name: 'Can I try Optmizly before paying?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Free plan gives you 2 tools and 3 analyses a month with no card required, for as long as you like. Paid plans are charged when you subscribe – there is no free trial – and you can cancel at any time from your account settings, keeping access until the end of the period you have paid for.' } },
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
      {/* After the plans here, rather than before them: a reader on /pricing arrived to
          compare prices, and the free tools are what to offer the ones who decide not to. */}
      <FreeToolsSection />
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
