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
    { '@type': 'Question', name: 'What counts as one analysis?', acceptedAnswer: { '@type': 'Answer', text: 'Each time you submit content or a URL for scoring (a content analysis, E-E-A-T check, SERP audit, or other tool), it uses one analysis credit. Credits reset at the start of each billing month.' } },
    { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cancel from your account settings at any time. You keep full access until the end of your current billing period.' } },
    { '@type': 'Question', name: 'How does the free trial work?', acceptedAnswer: { '@type': 'Answer', text: 'Pro and Agency plans include a 14-day free trial. We ask for a card to start, but you won\'t be charged until the trial ends. Cancel anytime before then and you won\'t be charged at all.' } },
    { '@type': 'Question', name: 'Do I need API keys or anything installed?', acceptedAnswer: { '@type': 'Answer', text: 'No. Optmizly is fully hosted. All AI analysis is included in your plan. No third-party API keys or setup required.' } },
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
