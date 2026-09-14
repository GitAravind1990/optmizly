import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PagePricing } from '@/components/page-pricing'
import { PRICING_FAQ, PRICING_UPDATED } from '@/lib/pricing-faq'
import { FreeToolsSection } from '@/components/free-tools-section'

const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const muted = '#8A93A3'
const line2 = '#F0F2F6'

// Built from PRICING_FAQ rather than retyped. The two were separate lists until 2026-09-14
// and they had drifted on the one answer where drift costs money: the markup priced AI
// Visibility at three credits, the visible copy at two. There is now one list, and it is the
// one a reader sees — which is also what Google's structured-data guidelines require.
//
// `dateModified` is the same constant the page prints, so the freshness signal and the line
// under the FAQ can never disagree.
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  dateModified: PRICING_UPDATED,
  mainEntity: PRICING_FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})

export default function PricingPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: sans }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <PageHeader />
      {/* This section is the whole page here, so its headline is the page's h1. */}
      <PagePricing headingAs="h1" />
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
