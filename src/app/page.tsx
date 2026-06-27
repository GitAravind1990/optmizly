import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { HomeHero } from '@/components/home-hero'
import { PagePricing } from '@/components/page-pricing'

export const metadata: Metadata = {
  title: 'Optmizly – AI Search Optimization Platform | SEO, GEO & AEO',
  description: 'Rank higher everywhere search happens. Optimize for Google, AI Overviews, ChatGPT, Perplexity and answer engines — one intelligent platform for SEO, GEO & AEO.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Optmizly – AI Search Optimization Platform',
    description: 'One platform for SEO, GEO & AEO. Rank everywhere search happens.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – AI Search Optimization Platform' }],
  },
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  sans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  blue: '#0000FF',
  blueMid: '#3B5BFF',
  cyan: '#4DEEFF',
  blueSoft: '#EEF1FF',
  blueBorder: '#CBD4FF',
  blueDark: '#0000CC',
  ink: '#0B1120',
  ink2: '#1F2937',
  ink900: '#070B16',
  body: '#4B5563',
  muted: '#8A93A3',
  line: '#E8EBF0',
  line2: '#F0F2F6',
  bg: '#FFFFFF',
  bgSoft: '#FAFAFA',
  good: '#10B981',
  goodSoft: '#ECFDF5',
  grad: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 45%, #4DEEFF 100%)',
  gradText: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 48%, #28C8E8 100%)',
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }: {
  name: string; size?: number; color?: string; strokeWidth?: number
}) {
  const paths: Record<string, string> = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    check: 'M5 12l5 5L20 7',
    sparkle: 'M12 3l1.6 5L19 10l-5.4 2L12 17l-1.6-5L5 10l5.4-2L12 3z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0 -18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0 -10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0 -2 0',
    pin: 'M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    chart: 'M3 3v18h18M7 14l4-4 4 4 6-6',
    bars: 'M5 21V11M12 21V4M19 21v-7',
    search: 'M11 11m-8 0a8 8 0 1 0 16 0 8 8 0 1 0 -16 0M21 21l-4.3-4.3',
    layers: 'M12 2L2 8l10 6 10-6-10-6zM2 14l10 6 10-6M2 11l10 6 10-6',
    cluster: 'M12 4v6m0 0L7 16m5-6l5 6M5 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M10 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    mic: 'M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zM5 11a7 7 0 0 0 14 0M12 18v3',
    bot: 'M12 3v3M9 12h.01M15 12h.01M6 8h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM2 13h2M20 13h2',
    globe: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0 -18 0M3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z',
    store: 'M3 9l1.5-5h15L21 9M4 9v10h16V9M4 9h16M9 19v-5h6v5',
    building: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M8 8h.01M8 12h.01M11 8h.01M11 12h.01',
    feather: 'M20 4a8 8 0 0 0-11 0L3 10v11h11l6-6a8 8 0 0 0 0-11zM16 8L2 22M17 7H9',
    star: 'M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
    google: 'M21 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.05a4.3 4.3 0 0 1-1.87 2.8v2.3h3.02C19.96 17.3 21 15 21 12.2z',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={paths[name] || paths.arrow} />
    </svg>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ kicker, title, body, align = 'center', dark = false, maxW = 720 }: {
  kicker?: string; title: string; body?: string
  align?: 'center' | 'left'; dark?: boolean; maxW?: number
}) {
  return (
    <div style={{ textAlign: align, maxWidth: maxW, margin: align === 'center' ? '0 auto' : 0 }}>
      {kicker && (
        <div style={{
          fontFamily: T.mono, fontSize: 12, fontWeight: 500, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 16,
          color: dark ? T.cyan : T.blue,
        }}>{kicker}</div>
      )}
      <h2 style={{
        fontFamily: T.sans, fontSize: 'clamp(30px, 3.8vw, 46px)',
        fontWeight: 600, letterSpacing: -1.8, lineHeight: 1.05,
        color: dark ? '#fff' : T.ink, margin: 0,
      }}>{title}</h2>
      {body && (
        <p style={{
          fontFamily: T.sans, fontSize: 18, lineHeight: 1.55,
          color: dark ? 'rgba(255,255,255,0.62)' : T.body,
          marginTop: 18, marginBottom: 0,
        }}>{body}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans }}>
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
      `}</style>
      <PageHeader />
      <HomeHero />

      {/* ── TRUSTED ── */}
      <section className="opt-s opt-sy0" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 0' }}>
        <div style={{
          textAlign: 'center', fontFamily: T.mono, fontSize: 12,
          color: T.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 28,
        }}>
          Trusted by growth teams of every kind
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          {[
            ['building', 'Digital Agencies'],
            ['layers', 'SaaS Businesses'],
            ['store', 'Ecommerce Brands'],
            ['feather', 'Publishers'],
            ['bolt', 'Startups'],
          ].map(([ic, n]) => (
            <div key={n} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '10px 18px', border: `1px solid ${T.line}`,
              borderRadius: 999, background: '#fff',
              fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: T.ink2,
            }}>
              <Icon name={ic} size={17} color={T.blue} />{n}
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="opt-s opt-sy" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 32px' }}>
        <SectionHead
          kicker="The shift"
          title="Search has changed. Traditional SEO isn't enough."
          body="Your customers now find answers across Google, AI assistants, and answer engines. Modern brands need visibility on every surface — not just the ten blue links."
        />
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 56 }}>
          {[
            ['google', 'Google Search'],
            ['sparkle', 'AI Overviews'],
            ['bot', 'ChatGPT'],
            ['sparkle', 'Gemini'],
            ['search', 'Perplexity'],
            ['mic', 'Voice Search'],
            ['target', 'Answer Engines'],
          ].map(([ic, n]) => (
            <div key={n} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 20px', border: `1px solid ${T.line}`,
              borderRadius: 14, background: '#fff',
              fontFamily: T.sans, fontSize: 15, fontWeight: 500, color: T.ink,
              boxShadow: '0 1px 3px rgba(11,17,32,0.04)',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, background: T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={ic} size={15} color={T.blue} />
              </span>
              {n}
              <Icon name="check" size={15} color={T.good} />
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: T.bgSoft, borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}` }}>
        <div className="opt-s opt-sy" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 32px' }}>
          <SectionHead
            kicker="The platform"
            title="One platform for the future of search."
            body="SEO, GEO, and AEO working together — so you show up whether your customer types into Google or asks an AI."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 60 }}>
            {[
              ['sparkle', 'AI SEO Optimization', 'Automate technical SEO and on-page content improvements at scale.'],
              ['bot', 'GEO Optimization', 'Increase your visibility and citations inside generative AI search results.'],
              ['search', 'AEO Optimization', 'Structure content for answer engines and AI assistants to surface you first.'],
              ['target', 'Content Intelligence', 'Find ranking opportunities and intent gaps before your competitors do.'],
              ['cluster', 'Keyword Clustering', 'Group thousands of keywords intelligently with AI-driven topic mapping.'],
              ['bars', 'Competitor Insights', 'Discover ranking gaps, share-of-voice, and growth opportunities instantly.'],
            ].map(([ic, n, d]) => (
              <div key={n} style={{
                padding: 28, background: '#fff', border: `1px solid ${T.line}`,
                borderRadius: 20, boxShadow: '0 2px 8px rgba(11,17,32,0.03)',
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 13, background: T.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, boxShadow: '0 6px 16px -6px rgba(0,0,255,0.4)',
                }}>
                  <Icon name={ic} size={22} color="#fff" />
                </div>
                <div style={{ fontFamily: T.sans, fontSize: 19, fontWeight: 600, letterSpacing: -0.4, color: T.ink, marginBottom: 8 }}>{n}</div>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: T.body, margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="opt-s opt-sy" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 32px' }}>
        <SectionHead kicker="How Optmizly works" title="From audit to growth in four steps." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 60, position: 'relative' }}>
          {[
            ['01', 'Analyze', 'Audit your website across SEO, GEO & AEO in minutes.', 'search'],
            ['02', 'Optimize', 'Get prioritized AI recommendations and auto-fixes.', 'sparkle'],
            ['03', 'Publish', 'Implement changes and structured data in one click.', 'bolt'],
            ['04', 'Grow', 'Track rankings, citations, and organic traffic over time.', 'chart'],
          ].map(([n, t, d, ic], i) => (
            <div key={n} style={{ position: 'relative', padding: 26, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 20 }}>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.blue, letterSpacing: 1, marginBottom: 16 }}>STEP {n}</div>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>
                <Icon name={ic} size={21} color={T.blue} />
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 600, letterSpacing: -0.5, color: T.ink, marginBottom: 8 }}>{t}</div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: T.body, margin: 0 }}>{d}</p>
              {i < 3 && (
                <div className="opt-step-arrow" style={{
                  position: 'absolute', right: -12, top: '50%', zIndex: 2,
                  width: 24, height: 24, borderRadius: 999, background: '#fff',
                  border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transform: 'translateY(-50%)',
                }}>
                  <Icon name="arrow" size={12} color={T.blue} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <PagePricing />

      {/* ── FOOTER CTA ── */}
      <section style={{ background: T.ink900, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(60% 90% at 50% 0%, rgba(59,91,255,0.35), transparent 65%), radial-gradient(40% 70% at 80% 100%, rgba(77,238,255,0.18), transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative', maxWidth: 820, margin: '0 auto',
          padding: 'clamp(64px, 10vw, 130px) clamp(20px, 4vw, 32px)', textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: T.sans, fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 600, letterSpacing: -2.6, lineHeight: 1.04,
            color: '#fff', margin: '0 auto 22px', maxWidth: 720,
          }}>
            Future-proof your search strategy.
          </h2>
          <p style={{ fontSize: 19, color: 'rgba(255,255,255,0.72)', maxWidth: 540, margin: '0 auto 38px', lineHeight: 1.5 }}>
            Optimize for Google and AI search platforms with Optmizly — the AI Search Optimization Platform.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 28px', height: 52, borderRadius: 14,
              fontFamily: T.sans, fontSize: 16, fontWeight: 600,
              background: T.grad, color: '#fff', textDecoration: 'none',
              boxShadow: '0 8px 24px -8px rgba(0,0,255,0.6), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}>
              Start Free Today →
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 28px', height: 52, borderRadius: 14,
              fontFamily: T.sans, fontSize: 16, fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none',
            }}>
              View Plans
            </Link>
          </div>
        </div>
      </section>

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
                The AI Search Optimization Platform. Rank everywhere search happens — Google, AI overviews, and answer engines.
              </p>
            </div>

            {/* Link columns */}
            {[
              ['Resources', [['Blog', '/blog'], ['Pricing', '/pricing'], ['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Refund Policy', '/refund-policy']]],
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
