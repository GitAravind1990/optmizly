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
    name: 'Starter',
    audience: 'For one site you have outgrown the free plan on',
    price: '$9',
    period: '/mo',
    anchor: '15 analyses a month — 5× the Free plan, same two tools',
    tagline: 'For running the core analysis often enough to act on it.',
    color: 'gray',
    featured: false,
    /**
     * Starter sells volume, not access. The features list says so in its second line
     * rather than implying more: a plan whose first run refuses a tool the card seemed to
     * promise is worse than one that never promised it.
     */
    features: [
      'Everything in Free, plus:',
      '15 analyses / month (5× the Free plan)',
      'Same two tools as Free — Content Analysis and On-Page SEO',
      'Analysis history kept',
      'Email support',
    ],
    cta: 'Get Starter',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID,
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
      '2 team seats — invite a colleague into the same account',
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
  {
    name: 'Agency Plus',
    audience: 'For agencies past ten clients',
    price: '$99',
    period: '/mo',
    anchor: 'Unlimited clients, 5 seats, 500 analyses a month',
    tagline: 'For agencies running search for a full book of clients.',
    color: 'amber',
    featured: false,
    features: [
      'Everything in Agency, plus:',
      'Unlimited client projects, instead of 10',
      '5 team seats — a whole team in one account',
      '500 analyses / month',
      '10 prospect searches / day',
      'Priority support',
    ],
    cta: 'Get Agency Plus',
    signedOutHref: '/signup',
    checkoutProductId: process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_PRODUCT_ID,
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
    {/* Wider than the 1200 the prose sections use. Five cards inside 1200 left each one
        210px, where "SEO Client Finder — find local businesses to pitch" wrapped to three
        lines. 1360 with a tighter gutter gives ~250px, which is the difference between a
        feature reading as a phrase and reading as a column of fragments. */}
    <section id="pricing" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(64px,8vw,120px) clamp(20px,4vw,32px)' }}>
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

        /* Explicit column counts rather than auto-fit.
           With four plans, 'repeat(auto-fit, minmax(280px, 1fr))' could not fit a fourth
           column inside this section — 4x280 plus three 22px gaps is 1186px against a
           1136px content box — so it silently wrapped to 3 + 1 and left an orphan card on
           its own row. auto-fit also has no way to express "never 3", which is the actual
           requirement: 4, then 2x2, then stacked. */
        /* Five plans, so some width always shows a remainder — the aim is the least ugly
           one. Three across gives 3+2, which reads as two rows; two across gives 2+2+1 and
           leaves a card alone. So the 3-column band is deliberately wide (900–1279px) and
           2 columns only takes over below that, where three cards would be too narrow to
           read. Measured: 1024px was landing on 2 columns and orphaning the fifth card. */
        .pricing-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        @media (max-width: 1279px) { .pricing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 899px)  { .pricing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 639px)  { .pricing-grid { grid-template-columns: minmax(0, 1fr); } }

        /* Four across leaves each card ~267px, where 32px of padding either side eats a
           quarter of the width. Roomier again as soon as there are only two columns. */
        .pricing-card { padding: 26px; }
        /* Roomier once there are at most two columns, where cards are wide again. Tied to
           the same 900px boundary as the grid so padding and column count never disagree. */
        @media (max-width: 899px) { .pricing-card { padding: 32px; } }

        /* Reserved heights, so the price row and the CTA land on the same line in all five
           cards. Sized for the worst wrap at five columns and released once the cards are
           wide enough that these strings fit on fewer lines — holding three lines open on a
           350px card would just be a gap. */
        .pricing-audience       { min-height: 36px; }
        .pricing-anchor         { min-height: 38px; }
        .pricing-toggle-spacer  { height: 48px; }
        @media (max-width: 1279px) {
          .pricing-audience     { min-height: 20px; }
          .pricing-anchor       { min-height: 38px; }
        }
        @media (max-width: 899px) {
          .pricing-audience     { min-height: 0; }
          .pricing-anchor       { min-height: 0; }
          .pricing-toggle-spacer { height: 0; }
        }

      `}</style>

      {/* Cards */}
      {/* `stretch`, not `start`. With five tiers the feature lists run from five items to
          nine, so start-aligned cards ended up between 654px and 1020px tall and the row
          had a ragged bottom edge. Stretching makes every card the height of the tallest,
          which is what makes a price table read as one object rather than five. */}
      <div className="pricing-grid" style={{
        display: 'grid', gap: 18, marginTop: 60, alignItems: 'stretch',
      }}>
        {plans.map((p) => {
        // True only for the Agency card, and only when its annual product is configured.
        const isAnnual = !!p.annualProductId && annualBilling
        return (
          <div key={p.name} className={`pricing-card${p.featured ? ' pricing-card-featured' : ''}`} style={{
            // Padding lives in CSS, not here, because it now varies with column count and an
            // inline value would outrank the media query trying to change it.
            borderRadius: 24, position: 'relative', overflow: 'hidden',
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

            <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontSize: 15, fontWeight: 600, marginBottom: 4,
                color: p.featured ? '#fff' : T.ink, fontFamily: T.sans,
              }}>{p.name}</div>
              {/* Fixed height so the price sits on the same line across all five cards.
                  "For agencies managing several clients" wraps to two lines at five columns
                  while "For marketers optimizing every week" takes one, and without this
                  every card below started at a different offset. */}
              <div className="pricing-audience" style={{
                fontSize: 13, marginBottom: 16, fontFamily: T.sans, lineHeight: 1.4,
                color: p.featured ? 'rgba(255,255,255,0.62)' : T.muted,
              }}>{p.audience}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <span style={{
                  fontFamily: T.sans, fontSize: 52, fontWeight: 600, letterSpacing: -2.4, lineHeight: 1,
                  color: p.featured ? '#fff' : (p.color === 'amber' ? '#D97706' : T.ink),
                }}>{/* Free and Starter have no annual product, so on the annual toggle they
                      keep showing their real monthly price rather than rendering `undefined`. */}
                  {(isAnnual ? p.annualPrice : p.price) ?? p.price}</span>
                <span style={{
                  fontSize: 16,
                  color: p.featured ? 'rgba(255,255,255,0.6)' : T.muted,
                }}>{(isAnnual ? p.annualPeriod : p.period) ?? p.period}</span>
              </div>

              {/* What that price buys, stated rather than left to be worked out from three
                  numbers in three cards. */}
              {/* Reserves three lines. At five columns these run from one line ("3 analyses
                  a month, no card") to three, and that difference alone put the five CTA
                  buttons at five different heights. */}
              <div className="pricing-anchor" style={{
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
              {/* The space is reserved on every card, not just the two that have a toggle.
                  Without it Free, Starter and Agency Plus pulled their buttons ~48px higher
                  than Pro and Agency, which is the difference the eye actually notices. */}
              {!p.annualProductId && <div className="pricing-toggle-spacer" />}
              {p.annualProductId && (
                <div className="pricing-toggle" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
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

              {/* `tagline` is deliberately not rendered.
                  It said the same thing as `audience` in different words — "For one site you
                  want to understand" above "For trying AI search optimization on one site" —
                  and at five columns each was wrapping to three lines. Two paragraphs of the
                  same idea is what was pushing the CTAs to five different heights. The field
                  is kept on the data so the wording is not lost if a use for it appears. */}

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
                {/* Resolve the id for the *selected* billing period before deciding whether
                    a checkout is possible. Starter is monthly-only, so on the annual toggle
                    it has no product to buy — the old `annualProductId!` assertion would have
                    handed checkout `undefined` and failed at the payment provider instead of
                    here. Falling through to the dashboard link is the same safe branch an
                    unconfigured product already uses. */}
                {(isAnnual ? p.annualProductId : p.checkoutProductId) ? (
                  <CheckoutButton
                    productId={(isAnnual ? p.annualProductId : p.checkoutProductId)!}
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
          {/* Raised again with the fifth plan column — six columns at 720 crushed the
              feature labels to two words a line. The wrapper above scrolls horizontally, so
              a wider minimum costs nothing on a phone. */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.sans, fontSize: 14, minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 13, borderBottom: `2px solid ${T.line}`, width: '34%' }}>Feature</th>
                {/* Pro stays the highlighted column, but it is index 2 now that Starter sits
                    between Free and Pro. The old `i === 1` would have highlighted Starter. */}
                {['Free', 'Starter', 'Pro', 'Agency', 'Agency Plus'].map((plan, i) => (
                  <th key={plan} style={{
                    padding: '14px 16px', textAlign: 'center', fontWeight: 700,
                    borderBottom: `2px solid ${T.line}`, fontSize: 14,
                    color: i === 2 ? T.blue : T.ink,
                  }}>{plan}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                row.type === 'category'
                  ? (
                    <tr key={i} style={{ background: T.line2 }}>
                      <td colSpan={6} style={{
                        padding: '8px 16px', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted,
                      }}>{row.label}</td>
                    </tr>
                  ) : (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.line2}` }}>
                      <td style={{ padding: '13px 16px', color: T.ink }}>{row.label}</td>
                      {/* `row.starter ?? row.free` — see COMPARISON_ROWS. Column indices
                          shifted by one, so Pro's accent is ci === 2, not 1. */}
                      {[row.free, row.starter ?? row.free, row.pro, row.agency, row.agencyPlus ?? row.agency].map((val, ci) => (
                        <td key={ci} style={{ padding: '13px 16px', textAlign: 'center' }}>
                          {val === true
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ci === 2 ? T.blue : T.good} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}><path d="M5 12l5 5L20 7"/></svg>
                            : val === false
                            ? <span style={{ color: T.muted, fontSize: 18, lineHeight: 1 }}>—</span>
                            : <span style={{ fontWeight: 600, color: ci === 2 ? T.blue : T.ink }}>{val}</span>
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

/**
 * `starter` is optional and falls back to `free` when omitted.
 *
 * Starter is the Free tool set with a bigger allowance, so on 15 of these 17 rows the two
 * columns are identical by definition. Defaulting keeps them that way permanently — adding
 * a tool to Free can never leave Starter silently showing a dash — and means only the two
 * rows that genuinely differ carry a value. If Starter ever gains a tool of its own, give
 * that row an explicit `starter`.
 *
 * `agencyPlus` works the same way and defaults to `agency`. Agency Plus has the identical
 * tool set — it sells volume, unlimited clients and seats — so only the four rows measuring
 * those carry a value of their own.
 */
const COMPARISON_ROWS: Array<
  | { type: 'category'; label: string }
  | { type: 'row'; label: string; free: boolean | string; starter?: boolean | string; pro: boolean | string; agency: boolean | string; agencyPlus?: boolean | string }
> = [
  { type: 'category', label: 'Usage limits' },
  { type: 'row', label: 'Analyses / month', free: '3', starter: '15', pro: '50', agency: '200', agencyPlus: '500' },
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
  { type: 'row', label: 'SEO Client Finder', free: false, pro: false, agency: '5 searches / day', agencyPlus: '10 searches / day' },
  { type: 'row', label: 'Client projects', free: false, pro: false, agency: '10', agencyPlus: 'Unlimited' },
  { type: 'row', label: 'Team seats', free: '1', pro: '1', agency: '2', agencyPlus: '5' },
  { type: 'row', label: 'SERP Competitor Audit', free: false, pro: false, agency: true },
  { type: 'row', label: 'Topical Authority Mapper', free: false, pro: false, agency: true },
  { type: 'row', label: 'Local SEO Suite (4 tools)', free: false, pro: false, agency: true },
  { type: 'row', label: 'AI Performance Fixer', free: false, pro: false, agency: true },
  { type: 'category', label: 'Support' },
  { type: 'row', label: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', agency: 'Priority' },
]

const FAQS = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan is free forever, no credit card required. You get 3 analyses per month and full access to content scoring, so you can see Optmizly\'s value before committing.',
  },
  {
    q: 'What counts as one analysis?',
    a: 'Each time you submit content or a URL for scoring, it uses one analysis credit. Most tools cost one credit. Tools that pull more live data from third-party providers on your behalf cost more, and each one tells you its cost before you run it. Three credits: Keyword Research, Competitor Spy, Ranking Engine, Geogrid and the Local SEO suite. Two credits: Backlinks, Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Visibility, Content Gap and Content Planner. Credits reset at the start of each billing month, and the Free plan\'s tools all cost one. SEO Client Finder is the exception: it does not use analysis credits at all, and has its own limit of 5 searches a day.',
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
    a: 'Starter is $9 monthly only. Pro is $19 monthly or $228 a year, and Agency is $49 monthly or $588 a year, chosen at checkout \u2013 the annual price is twelve months at the same rate, so paying yearly costs the same and simply renews once instead of twelve times. If you have a discount code that applies to the first billing cycle, it covers your first year and the subscription renews at the full $588 after that.',
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
