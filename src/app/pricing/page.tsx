import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PagePricing } from '@/components/page-pricing'

const sans = "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const muted = '#8A93A3'
const line2 = '#F0F2F6'

export default function PricingPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: sans }}>
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
