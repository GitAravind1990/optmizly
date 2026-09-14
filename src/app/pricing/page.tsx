import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PagePricing } from '@/components/page-pricing'
import { PRICING_FAQ, PRICING_UPDATED } from '@/lib/pricing-faq'
import { buildPageGraph } from '@/lib/site-schema'
import { FreeToolsSection } from '@/components/free-tools-section'

const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const muted = '#8A93A3'
const line2 = '#F0F2F6'

// One graph, not four scripts: the Optmizly entity, this page, the trail to it, and the FAQ.
//
// The FAQ questions are built from PRICING_FAQ rather than retyped. The two were separate
// lists until 2026-09-14 and they had drifted on the one answer where drift costs money: the
// markup priced AI Visibility at three credits, the visible copy at two. There is now one
// list, and it is the one a reader sees -- which is also what Google's structured-data
// guidelines require.
//
// Organization and BreadcrumbList come from site-schema.ts, which the homepage uses too. Both
// are plain statements of fact about this page: Optmizly is a real company, and /pricing does
// sit one level under the homepage. Compare the sixth AEO check, which wants Article or HowTo
// schema here -- that one stays failing, because a pricing page is neither and saying
// otherwise to win a point is the exact move this audit exists to catch.
//
// `dateModified` is the same constant the page prints, so the freshness signal and the line
// under the FAQ can never disagree.
const pricingJsonLd = buildPageGraph({
  path: '/pricing',
  name: 'Optmizly Pricing - Plans from Free to Agency Plus',
  dateModified: PRICING_UPDATED,
  breadcrumb: [{ name: 'Pricing', path: '/pricing' }],
  extra: [{
    '@type': 'FAQPage',
    '@id': 'https://optmizly.com/pricing#faq',
    dateModified: PRICING_UPDATED,
    mainEntity: PRICING_FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }],
})

export default function PricingPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: sans }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: pricingJsonLd }} />
      <PageHeader />
      {/* Visible because the BreadcrumbList above says it is there. Markup describing a trail
          a reader cannot see is the same fault as an FAQ that only exists in JSON-LD. */}
      <nav aria-label="Breadcrumb" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
        <ol style={{
          display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none',
          margin: 0, padding: 0, fontSize: 13, color: muted, fontFamily: sans,
        }}>
          <li><Link href="/" style={{ color: muted, textDecoration: 'none' }}>Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" style={{ color: '#0B1120' }}>Pricing</li>
        </ol>
      </nav>
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
