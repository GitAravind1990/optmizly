'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { SignedIn, SignedOut } from './clerk-provider'

const T = {
  sans: "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
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

/**
 * Three tiers, read left to right.
 *
 * `audience` is the compromise-effect half of this: a visitor comparing three prices with
 * no idea who each is for defaults to the cheapest. Naming the buyer on each card turns the
 * question from "how little can I spend" into "which one am I", which is the question that
 * has a correct answer. Pro is `featured` — the middle option, and the one most people
 * comparing the three should land on.
 *
 * `anchor` states the usage difference in plain arithmetic rather than leaving three
 * numbers to be compared in the reader's head. Both are copy, not pricing: the prices,
 * limits and product ids below are unchanged.
 */
const plans = [
  {
    name: 'Free',
    audience: 'For one site you want to understand',
    price: '$0',
    period: '/forever',
    anchor: '3 analyses a month, no card',
    tagline: 'For trying AI search optimization on one site.',
    color: 'gray',
    featured: false,
    features: [
      'AI SEO audit (1 project)',
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
    audience: 'For marketers optimizing every week',
    price: '$19',
    period: '/mo',
    anchor: '50 analyses a month — 16× the Free plan, for $19',
    tagline: 'For growth teams optimizing across every search surface.',
    color: 'blue',
    featured: true,
    features: [
      'Everything in Free, plus:',
      '50 analyses / month (data-heavy tools count as 2–3)',
      'Content Optimizer + Full Rewrite',
      'E-E-A-T deep analysis',
      'Relevant Backlinks finder',
      'AI Ranking Engine',
      'AI Visibility (Citation + Queries)',
      'Priority support',
    ],
    cta: 'Get Pro',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID,
    annualProductId: process.env.NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID,
    annualPrice: '$228',
    annualPeriod: '/yr',
  },
  {
    name: 'Agency',
    audience: 'For agencies managing several clients',
    price: '$49',
    period: '/mo',
    anchor: '200 analyses a month, plus client reporting and prospecting',
    tagline: 'For agencies & brands running search at scale.',
    color: 'amber',
    featured: false,
    features: [
      'Everything in Pro, plus:',
      '200 analyses / month (data-heavy tools count as 2–3)',
      'SEO Client Finder — find local businesses to pitch',
      'AI Citation Tracker',
      'Local SEO Suite (4 tools)',
      'SERP Competitor Audit',
      'Topical Authority Mapper',
      'AI Performance Fixer',
    ],
    cta: 'Get Agency',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID,
    // Annual billing exists only on Agency. Absent until the product is configured, and the
    // toggle simply does not render - so an unset variable degrades to today's behaviour
    // rather than to a broken checkout.
    annualProductId: process.env.NEXT_PUBLIC_DODO_AGENCY_ANNUAL_PRODUCT_ID,
    annualPrice: '$588',
    annualPeriod: '/yr',
    /** Only this plan accepts a discount code. Mirrors isCouponEligibleProduct on the server. */
    couponEligible: true,
  },
]

function CheckoutButton({ productId, cta, featured, couponEligible, planName, isAnnual }: {
  productId: string
  cta: string
  featured: boolean
  /** True only for the Agency annual product - the one plan a code may be used on. */
  couponEligible?: boolean
  planName: string
  isAnnual: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [showCoupon, setShowCoupon] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')
    // Client-side counterpart to the server's checkout_started. Fired before the request
    // so a plan chosen but never reached — a refused code, a network failure — still
    // appears in the funnel rather than vanishing.
    posthog.capture('pricing_plan_selected', {
      plan: planName.toUpperCase(),
      billing: isAnnual ? 'annual' : 'monthly',
      signed_in: true,
    })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The code is only ever sent for the eligible product. The server checks this again
        // rather than trusting it - see isCouponEligibleProduct - because this is a browser.
        body: JSON.stringify({
          productId,
          ...(couponEligible && coupon.trim() ? { couponCode: coupon.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      // Previously this branch did nothing at all: a rejected checkout left the button idle
      // with no explanation. It matters more now, because refusing a code is a 400 with a
      // message the buyer needs to read.
      setError(data.error ?? 'Could not start checkout. Please try again.')
    } catch {
      setError('Could not start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
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
      {couponEligible && (
        <div style={{ marginTop: 10 }}>
          {!showCoupon ? (
            <button
              onClick={() => setShowCoupon(true)}
              style={{
                display: 'block', width: '100%', padding: '4px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 13, fontWeight: 500,
                color: featured ? 'rgba(255,255,255,0.6)' : T.muted,
              }}
            >
              Have a code?
            </button>
          ) : (
            <input
              value={coupon}
              onChange={e => setCoupon(e.target.value.toUpperCase())}
              placeholder="Discount code"
              autoFocus
              style={{
                width: '100%', height: 40, borderRadius: 10, padding: '0 12px',
                fontFamily: T.sans, fontSize: 14, letterSpacing: 0.5,
                border: `1px solid ${T.line}`, background: '#fff', color: T.ink,
              }}
            />
          )}
        </div>
      )}

      {error && (
        <p style={{
          margin: '10px 0 0', fontFamily: T.sans, fontSize: 13, lineHeight: 1.4,
          color: featured ? '#FCA5A5' : '#DC2626',
        }}>{error}</p>
      )}
    </div>
  )
}

export function PagePricing() {
  // Only Agency has an annual option, so one flag covers the page. Defaults to monthly so
  // the advertised headline price stays the one people already know.
  const [annualBilling, setAnnualBilling] = useState(false)

  // Founding-member availability, read from Dodo's own redemption count. Null while it
  // loads, and stays null if the code does not exist - the banner simply never appears
  // rather than showing a placeholder number.
  const [spots, setSpots] = useState<{ remaining: number | null; limit: number | null; soldOut: boolean } | null>(null)
  useEffect(() => {
    fetch('/api/founding-spots')
      .then(r => r.json())
      .then(d => { if (d?.configured && typeof d.remaining === 'number') setSpots(d) })
      .catch(() => { /* a scarcity claim we cannot verify is one we do not make */ })
  }, [])

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
        {plans.map((p) => {
        // True only for the Agency card, and only when its annual product is configured.
        const isAnnual = !!p.annualProductId && annualBilling
        return (
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
                fontSize: 15, fontWeight: 600, marginBottom: 4,
                color: p.featured ? '#fff' : T.ink, fontFamily: T.sans,
              }}>{p.name}</div>
              <div style={{
                fontSize: 13, marginBottom: 16, fontFamily: T.sans, lineHeight: 1.4,
                color: p.featured ? 'rgba(255,255,255,0.62)' : T.muted,
              }}>{p.audience}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <span style={{
                  fontFamily: T.sans, fontSize: 52, fontWeight: 600, letterSpacing: -2.4, lineHeight: 1,
                  color: p.featured ? '#fff' : (p.color === 'amber' ? '#D97706' : T.ink),
                }}>{isAnnual ? p.annualPrice : p.price}</span>
                <span style={{
                  fontSize: 16,
                  color: p.featured ? 'rgba(255,255,255,0.6)' : T.muted,
                }}>{isAnnual ? p.annualPeriod : p.period}</span>
              </div>

              {/* What that price buys, stated rather than left to be worked out from three
                  numbers in three cards. */}
              <div style={{
                fontSize: 13, fontWeight: 500, marginBottom: 14, lineHeight: 1.45,
                fontFamily: T.sans,
                color: p.featured ? T.cyan : (p.color === 'amber' ? '#D97706' : T.body),
              }}>{p.anchor}</div>

              {/* Founding Member availability. Shown only where the offer applies - the
                  Agency card, annual selected - because a scarcity line on a plan the code
                  cannot be used on is just noise. */}
              {isAnnual && p.couponEligible && spots && (
                <div style={{
                  marginBottom: 14, padding: '8px 12px', borderRadius: 10,
                  fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                  background: p.featured ? 'rgba(255,255,255,0.14)' : '#FFF7ED',
                  color: p.featured ? '#fff' : '#B45309',
                  border: `1px solid ${p.featured ? 'rgba(255,255,255,0.24)' : '#FDE68A'}`,
                }}>
                  {spots.soldOut
                    ? 'Founding Member places are gone'
                    : `Founding Member: ${spots.remaining} of ${spots.limit} places left`}
                </div>
              )}

              {/* Billing switch, Agency only. Hidden entirely when the annual product is not
                  configured, so a missing env var shows today's page rather than a toggle
                  that leads to a checkout with no product behind it. */}
              {p.annualProductId && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {([['monthly', 'Monthly'], ['annual', 'Annual']] as const).map(([key, label]) => {
                    const active = (key === 'annual') === annualBilling
                    return (
                      <button
                        key={key}
                        onClick={() => setAnnualBilling(key === 'annual')}
                        style={{
                          flex: 1, height: 34, borderRadius: 10, cursor: 'pointer',
                          fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                          background: active ? (p.featured ? 'rgba(255,255,255,0.16)' : '#FFF7ED') : 'transparent',
                          color: active ? (p.featured ? '#fff' : '#D97706') : (p.featured ? 'rgba(255,255,255,0.6)' : T.muted),
                          border: `1px solid ${active ? (p.featured ? 'rgba(255,255,255,0.28)' : '#FDE68A') : T.line}`,
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              <p style={{
                fontSize: 14, lineHeight: 1.5, margin: '0 0 26px', minHeight: 42,
                color: p.featured ? 'rgba(255,255,255,0.72)' : T.body,
                fontFamily: T.sans,
              }}>{p.tagline}</p>

              {/* CTA button */}
              <SignedOut>
                <Link
                  href={p.signedOutHref}
                  onClick={() => posthog.capture('pricing_plan_selected', {
                    plan: p.name.toUpperCase(),
                    billing: isAnnual ? 'annual' : 'monthly',
                    signed_in: false,
                  })}
                  style={{
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
                  <CheckoutButton
                    productId={isAnnual ? p.annualProductId! : p.checkoutProductId}
                    cta={p.cta}
                    featured={p.featured ?? false}
                    couponEligible={isAnnual && p.couponEligible === true}
                    planName={p.name}
                    isAnnual={isAnnual}
                  />
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
        )})}
      </div>

      <div style={{
        textAlign: 'center', marginTop: 36,
        fontSize: 14, fontWeight: 600, color: T.muted, fontFamily: T.sans,
      }}>
        Cancel anytime · No contract · Free plan needs no card
      </div>

      {/* ── FEATURE COMPARISON TABLE ── */}
      <div style={{ marginTop: 80 }}>
        <h3 style={{
          fontFamily: T.sans, fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 700, letterSpacing: -1, color: T.ink,
          textAlign: 'center', margin: '0 0 40px',
        }}>
          Compare all features
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.sans, fontSize: 14, minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 13, borderBottom: `2px solid ${T.line}`, width: '44%' }}>Feature</th>
                {['Free', 'Pro', 'Agency'].map((plan, i) => (
                  <th key={plan} style={{
                    padding: '14px 16px', textAlign: 'center', fontWeight: 700,
                    borderBottom: `2px solid ${T.line}`, fontSize: 14,
                    color: i === 1 ? T.blue : T.ink,
                  }}>{plan}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                row.type === 'category'
                  ? (
                    <tr key={i} style={{ background: T.line2 }}>
                      <td colSpan={4} style={{
                        padding: '8px 16px', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted,
                      }}>{row.label}</td>
                    </tr>
                  ) : (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.line2}` }}>
                      <td style={{ padding: '13px 16px', color: T.ink }}>{row.label}</td>
                      {[row.free, row.pro, row.agency].map((val, ci) => (
                        <td key={ci} style={{ padding: '13px 16px', textAlign: 'center' }}>
                          {val === true
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ci === 1 ? T.blue : T.good} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}><path d="M5 12l5 5L20 7"/></svg>
                            : val === false
                            ? <span style={{ color: T.muted, fontSize: 18, lineHeight: 1 }}>—</span>
                            : <span style={{ fontWeight: 600, color: ci === 1 ? T.blue : T.ink }}>{val}</span>
                          }
                        </td>
                      ))}
                    </tr>
                  )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ marginTop: 80, maxWidth: 720, margin: '80px auto 0' }}>
        <h3 style={{
          fontFamily: T.sans, fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 700, letterSpacing: -1, color: T.ink,
          textAlign: 'center', margin: '0 0 40px',
        }}>
          Frequently asked questions
        </h3>
        <FaqAccordion />
      </div>
    </section>
  )
}

const COMPARISON_ROWS: Array<
  | { type: 'category'; label: string }
  | { type: 'row'; label: string; free: boolean | string; pro: boolean | string; agency: boolean | string }
> = [
  { type: 'category', label: 'Usage limits' },
  { type: 'row', label: 'Analyses / month', free: '3', pro: '50', agency: '200' },
  { type: 'category', label: 'Content & SEO' },
  { type: 'row', label: '8-dimension content score', free: true, pro: true, agency: true },
  { type: 'row', label: 'SEO, GEO & AEO scores', free: true, pro: true, agency: true },
  { type: 'row', label: 'Content Optimizer & Rewriter', free: false, pro: true, agency: true },
  { type: 'row', label: 'E-E-A-T deep analysis', free: false, pro: true, agency: true },
  { type: 'row', label: 'Content Gap Finder', free: false, pro: true, agency: true },
  { type: 'row', label: 'Relevant Backlinks finder', free: false, pro: true, agency: true },
  { type: 'category', label: 'AI visibility' },
  { type: 'row', label: 'AI Ranking Engine', free: false, pro: true, agency: true },
  { type: 'row', label: 'AI Visibility Queries', free: false, pro: true, agency: true },
  { type: 'row', label: 'LLM Citation Tracker', free: false, pro: false, agency: true },
  { type: 'category', label: 'Agency tools' },
  { type: 'row', label: 'SEO Client Finder', free: false, pro: false, agency: '50 searches / day' },
  { type: 'row', label: 'SERP Competitor Audit', free: false, pro: false, agency: true },
  { type: 'row', label: 'Topical Authority Mapper', free: false, pro: false, agency: true },
  { type: 'row', label: 'Local SEO Suite (4 tools)', free: false, pro: false, agency: true },
  { type: 'row', label: 'AI Performance Fixer', free: false, pro: false, agency: true },
  { type: 'category', label: 'Support' },
  { type: 'row', label: 'Support', free: 'Community', pro: 'Priority', agency: 'Priority' },
]

const FAQS = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan is free forever, no credit card required. You get 3 analyses per month and full access to content scoring, so you can see Optmizly\'s value before committing.',
  },
  {
    q: 'What counts as one analysis?',
    a: 'Each time you submit content or a URL for scoring, it uses one analysis credit. Most tools cost one credit. Tools that pull more live data from third-party providers on your behalf cost more, and each one tells you its cost before you run it. Three credits: Keyword Research, Competitor Spy, Ranking Engine, Geogrid and the Local SEO suite. Two credits: Backlinks, Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Visibility, Content Gap and Content Planner. Credits reset at the start of each billing month, and the Free plan\'s tools all cost one. SEO Client Finder is the exception: it does not use analysis credits at all, and has its own limit of 50 searches a day.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings at any time, no hoops, no waiting. You keep full access until the end of your current billing period.',
  },
  {
    q: 'Can I try Optmizly before paying?',
    a: 'Yes. The Free plan gives you 2 tools and 3 analyses a month with no card required, for as long as you like. Paid plans are charged when you subscribe – there is no free trial – and you can cancel at any time from your account settings, keeping access until the end of the period you have paid for.',
  },
  {
    q: 'Do I need API keys or anything installed?',
    a: 'No. Optmizly is fully hosted and all AI analysis is included in your plan — you never need an AI provider key or any third-party setup to use it. Agency plan users can optionally connect Google Search Console for deeper SEO Audit insights, but it\'s never required.',
  },
  {
    q: 'Can I pay annually?',
    a: 'Pro is $19 monthly or $228 a year, and Agency is $49 monthly or $588 a year, chosen at checkout \u2013 the annual price is twelve months at the same rate, so paying yearly costs the same and simply renews once instead of twelve times. If you have a discount code that applies to the first billing cycle, it covers your first year and the subscription renews at the full $588 after that.',
  },
  {
    q: 'Can I upgrade or downgrade?',
    a: 'Yes. Upgrade instantly from your dashboard settings. The new limits apply immediately. Downgrades take effect at the start of your next billing cycle.',
  },
]

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden' }}>
      {FAQS.map((faq, i) => (
        <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? `1px solid ${T.line}` : 'none' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 16, padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', fontFamily: T.sans, fontSize: 15, fontWeight: 600,
              color: T.ink, lineHeight: 1.4,
            }}
          >
            <span>{faq.q}</span>
            <span style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
              background: open === i ? T.blue : T.line2,
              color: open === i ? '#fff' : T.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 400, lineHeight: 1, transition: 'background 0.15s',
            }}>
              {open === i ? '−' : '+'}
            </span>
          </button>
          {open === i && (
            <div style={{
              padding: '0 22px 18px',
              fontFamily: T.sans, fontSize: 14, color: T.body, lineHeight: 1.65,
            }}>
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
