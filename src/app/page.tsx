import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { HomeHero } from '@/components/home-hero'
import { PagePricing } from '@/components/page-pricing'
import { HomeEmailCapture } from '@/components/home-email-capture'
import { T } from '@/components/marketing/tokens'
import {
  ProblemSection,
  FreeAuditSection,
  PillarsSection,
  WorkflowSection,
  FeaturesSection,
  ExistingContentSection,
  SocialProofSection,
  FounderSection,
  FaqSection,
  FinalCtaSection,
  HOME_FAQS,
} from '@/components/marketing/sections'

/**
 * Title and description are both kept inside the lengths this site's own readiness audit
 * checks for — 65 and 165 characters. Running optmizly.com through the tool on the homepage
 * is the first thing a sceptical visitor will do, and it should not come back with our own
 * title flagged as too long. It did, at 72 and 171, until this.
 */
export const metadata: Metadata = {
  title: 'Optmizly — Optimize Your Website for Google + AI Search',
  description:
    'SEO + GEO + AEO optimization powered by AI. Run a free AI search readiness audit, no signup needed, and see what an AI crawler sees on your site.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Optmizly – Optimize Your Website for Google + AI Search',
    description:
      'SEO + GEO + AEO optimization powered by AI. Free AI search readiness audit, no signup required.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – Optimize Your Website for Google + AI Search' }],
  },
}

/**
 * The homepage FAQs, mirrored as structured data.
 *
 * Same array as the rendered accordion — the two cannot drift, which is the mistake the
 * pricing page's FAQ made twice by keeping a hand-written copy of its own answers. An
 * FAQPage whose questions differ from the visible page is exactly the kind of thing
 * this product's own audit flags.
 */
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
})

/**
 * Organization and WebSite markup — the entity signals this page spends a whole section
 * telling other people to add. The homepage had FAQPage and nothing else, which its own
 * audit scored 50 for structured data.
 *
 * `sameAs` is the part that resolves "Optmizly" to a known entity rather than a word.
 * It lists only profiles that actually exist; add to it as more do.
 */
const orgJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://optmizly.com/#organization',
      name: 'Optmizly',
      url: 'https://optmizly.com',
      logo: 'https://optmizly.com/logo.png',
      description:
        'AI search optimization platform covering SEO, GEO and AEO — auditing, optimizing and monitoring how websites appear in Google and in AI-generated answers.',
      email: 'hello@optmizly.com',
      sameAs: ['https://x.com/optmizly', 'https://linkedin.com/company/optmizly'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://optmizly.com/#website',
      url: 'https://optmizly.com',
      name: 'Optmizly',
      publisher: { '@id': 'https://optmizly.com/#organization' },
    },
  ],
})

export default function HomePage() {
  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <style>{`
        @media (max-width: 639px) {
          .opt-s  { padding-left: 20px !important; padding-right: 20px !important; }
          .opt-sy { padding-top: 64px !important; padding-bottom: 64px !important; }
          .opt-sy0 { padding-top: 48px !important; padding-bottom: 0 !important; }
          .opt-step-arrow { display: none !important; }
          .opt-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .opt-footer-brand { grid-column: span 2 !important; }
          .opt-footer-bottom { flex-direction: column !important; gap: 16px !important; }
          .opt-cta-pad { padding: 64px 20px !important; }
        }
        /* The connector arrows between workflow cards only make sense on one row. */
        @media (max-width: 1023px) { .opt-step-arrow { display: none !important; } }
      `}</style>

      <PageHeader />
      <HomeHero />

      {/* Attention → curiosity → reciprocity. The audit sits directly after the problem
          statement, so the question the section raises is answerable in the next scroll. */}
      <ProblemSection />
      <FreeAuditSection />

      {/* Understanding: what the three letters mean, then how the product joins them up. */}
      <PillarsSection />
      <WorkflowSection />
      <FeaturesSection />

      {/* Value: the investment they already made, not a new one. */}
      <ExistingContentSection />

      {/* Trust. */}
      <SocialProofSection />
      <FounderSection />

      {/* Decision. */}
      <PagePricing />
      <FaqSection />
      <HomeEmailCapture />
      <FinalCtaSection />

      {/* ── FOOTER ── */}
      <footer style={{ background: T.bgSoft, borderTop: `1px solid ${T.line2}` }}>
        <div className="opt-s" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 40px' }}>
          <div className="opt-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div className="opt-footer-brand" style={{ gridColumn: 'span 1', maxWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <img src="/logo.png" alt="Optmizly" style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 18, letterSpacing: -0.5, color: T.blue }}>
                  optmizly
                </span>
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, lineHeight: 1.6, margin: 0 }}>
                SEO, GEO and AEO in one platform. Optimize your website for Google and for the
                AI systems that now answer on its behalf.
              </p>
            </div>

            {/* Link columns */}
            {[
              ['Free tools', [
                ['AI Search Readiness Audit', '/tools/ai-search-readiness'],
                ['E-E-A-T Checker', '/tools/eeat'],
                ['AI Regex Generator', '/tools/ai-regex'],
              ]],
              ['Product', [['Pricing', '/pricing'], ['Sign in', '/login'], ['Start free', '/signup']]],
              ['Resources', [['Blog', '/blog'], ['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Refund Policy', '/refund-policy']]],
              ['Company', [['Contact', 'mailto:hello@optmizly.com']]],
            ].map(([h, items]) => (
              <div key={h as string}>
                <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 16 }}>{h as string}</div>
                {(items as [string, string][]).map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <a href={href} style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, textDecoration: 'none' }}>{label}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="opt-footer-bottom" style={{
            borderTop: `1px solid ${T.line2}`, paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12, fontFamily: T.sans, fontSize: 13, color: T.muted,
          }}>
            <div>© 2026 Optmizly, Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link href="/privacy" style={{ color: T.muted, textDecoration: 'none' }}>Privacy</Link>
              <Link href="/terms" style={{ color: T.muted, textDecoration: 'none' }}>Terms</Link>
              <a href="mailto:hello@optmizly.com" style={{ color: T.muted, textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
