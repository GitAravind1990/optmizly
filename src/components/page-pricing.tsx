'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SignedIn, SignedOut } from './clerk-provider'

const T = {
  sans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  blue: '#0000FF',
  blueMid: '#3B5BFF',
  cyan: '#4DEEFF',
  ink: '#0B1120',
  ink900: '#070B16',
  body: '#4B5563',
  muted: '#8A93A3',
  line: '#E8EBF0',
  line2: '#F0F2F6',
  good: '#10B981',
  grad: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 45%, #4DEEFF 100%)',
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    tagline: 'For trying AI search optimization on one site.',
    color: 'gray',
    featured: false,
    features: [
      'AI SEO audit — 1 project',
      'SEO + GEO + AEO scores',
      '3 analyses / month',
      '8-dimension content score',
      'Community support',
    ],
    cta: 'Start Free',
    signedOutHref: '/signup',
    signedInHref: '/dashboard',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    tagline: 'For growth teams optimizing across every search surface.',
    color: 'blue',
    featured: true,
    features: [
      'Everything in Free, plus:',
      '50 analyses / month',
      'Content Optimizer + Full Rewrite',
      'E-E-A-T deep analysis',
      'Relevant Backlinks finder',
      'AI Visibility (Citation + Queries)',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID,
  },
  {
    name: 'Agency',
    price: '$49',
    period: '/mo',
    tagline: 'For agencies & brands running search at scale.',
    color: 'amber',
    featured: false,
    features: [
      'Everything in Pro, plus:',
      '200 analyses / month',
      'AI Citation Tracker',
      'Local SEO Suite (4 tools)',
      'SERP Competitor Audit',
      'Topical Authority Mapper',
      'AI Performance Fixer',
    ],
    cta: 'Start Agency Trial',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID,
  },
]

function CheckoutButton({ productId, cta, featured }: { productId: string; cta: string; featured: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', height: 52, borderRadius: 14, cursor: 'pointer',
        fontFamily: T.sans, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
        background: featured ? T.grad : '#fff',
        color: featured ? '#fff' : T.ink,
        boxShadow: featured
          ? '0 8px 24px -8px rgba(0,0,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 1px 3px rgba(11,17,32,0.08)',
        border: featured ? '1px solid transparent' : `1px solid ${T.line}`,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Redirecting…' : cta} {!loading && '→'}
    </button>
  )
}

export function PagePricing() {
  return (
    <section id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(64px,8vw,120px) clamp(20px,4vw,32px)' }}>
      {/* Section head */}
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          fontFamily: T.mono, fontSize: 12, fontWeight: 500, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 16, color: T.blue,
        }}>Pricing</div>
        <h2 style={{
          fontFamily: T.sans, fontSize: 'clamp(30px, 3.8vw, 46px)',
          fontWeight: 600, letterSpacing: -1.8, lineHeight: 1.05, color: T.ink, margin: 0,
        }}>Start free. Scale as you rank.</h2>
        <p style={{
          fontFamily: T.sans, fontSize: 18, lineHeight: 1.55, color: T.body, marginTop: 18,
        }}>
          Every plan optimizes for Google, AI overviews, and answer engines. No API keys needed.
        </p>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .pricing-card-featured { transform: none !important; }
        }
      `}</style>

      {/* Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 22, marginTop: 60, alignItems: 'start',
      }}>
        {plans.map((p) => (
          <div key={p.name} className={p.featured ? 'pricing-card-featured' : ''} style={{
            padding: 32, borderRadius: 24, position: 'relative', overflow: 'hidden',
            background: p.featured ? T.ink900 : '#fff',
            color: p.featured ? '#fff' : T.ink,
            border: p.featured ? '1px solid transparent' : `1px solid ${T.line}`,
            boxShadow: p.featured
              ? '0 30px 64px -22px rgba(0,0,255,0.45)'
              : '0 2px 10px rgba(11,17,32,0.04)',
            transform: p.featured ? 'translateY(-10px)' : 'none',
          }}>
            {/* Featured bg glow */}
            {p.featured && (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(120% 80% at 100% 0%, rgba(77,238,255,0.14), transparent 60%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', top: 24, right: 24,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: T.grad, color: '#fff',
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                  padding: '5px 11px', borderRadius: 999,
                }}>★ MOST POPULAR</div>
              </>
            )}

            <div style={{ position: 'relative' }}>
              <div style={{
                fontSize: 15, fontWeight: 600, marginBottom: 16,
                color: p.featured ? '#fff' : T.ink, fontFamily: T.sans,
              }}>{p.name}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <span style={{
                  fontFamily: T.sans, fontSize: 52, fontWeight: 600, letterSpacing: -2.4, lineHeight: 1,
                  color: p.featured ? '#fff' : (p.color === 'amber' ? '#D97706' : T.ink),
                }}>{p.price}</span>
                <span style={{
                  fontSize: 16,
                  color: p.featured ? 'rgba(255,255,255,0.6)' : T.muted,
                }}>{p.period}</span>
              </div>

              <p style={{
                fontSize: 14, lineHeight: 1.5, margin: '0 0 26px', minHeight: 42,
                color: p.featured ? 'rgba(255,255,255,0.72)' : T.body,
                fontFamily: T.sans,
              }}>{p.tagline}</p>

              {/* CTA button */}
              <SignedOut>
                <Link href={p.signedOutHref} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', height: 52, borderRadius: 14,
                  fontFamily: T.sans, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
                  textDecoration: 'none',
                  background: p.featured ? T.grad : (p.color === 'amber' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#fff'),
                  color: p.featured || p.color === 'amber' ? '#fff' : T.ink,
                  boxShadow: p.featured
                    ? '0 8px 24px -8px rgba(0,0,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : '0 1px 3px rgba(11,17,32,0.08)',
                  border: p.featured || p.color === 'amber' ? '1px solid transparent' : `1px solid ${T.line}`,
                }}>
                  {p.cta} →
                </Link>
              </SignedOut>
              <SignedIn>
                {p.checkoutProductId ? (
                  <CheckoutButton productId={p.checkoutProductId} cta={p.cta} featured={p.featured ?? false} />
                ) : (
                  <Link href="/dashboard" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', height: 52, borderRadius: 14,
                    fontFamily: T.sans, fontSize: 15, fontWeight: 600,
                    textDecoration: 'none',
                    background: '#fff', color: T.ink,
                    border: `1px solid ${T.line}`,
                  }}>
                    Open Dashboard →
                  </Link>
                )}
              </SignedIn>

              {/* Features */}
              <div style={{
                marginTop: 28, paddingTop: 26,
                borderTop: `1px solid ${p.featured ? 'rgba(255,255,255,0.14)' : T.line2}`,
              }}>
                {p.features.map((f, i) => {
                  const isHeader = f.endsWith('plus:')
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 11,
                      fontSize: 14, lineHeight: 1.45, marginBottom: 14,
                      color: isHeader
                        ? (p.featured ? 'rgba(255,255,255,0.5)' : T.muted)
                        : (p.featured ? 'rgba(255,255,255,0.9)' : T.ink),
                      fontWeight: isHeader ? 500 : 400,
                      fontFamily: T.sans,
                    }}>
                      {!isHeader && (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                          stroke={p.featured ? T.cyan : T.blue}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, marginTop: 1 }}>
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                      <span>{f}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        textAlign: 'center', marginTop: 36,
        fontSize: 14, color: T.muted, fontFamily: T.sans,
      }}>
        14-day money-back on paid plans · Cancel anytime · No credit card to start
      </div>
    </section>
  )
}
