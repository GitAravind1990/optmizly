'use client'

import { useState } from 'react'
import Link from 'next/link'

const PRO_PRODUCT_ID = process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID!
const AGENCY_PRODUCT_ID = process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID!

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'gray',
    productId: null,
    features: [
      '3 analyses / month',
      'Content Analyzer (8-dimension score)',
      'Issues Audit',
      'Quick-win recommendations',
    ],
    cta: 'Get Started Free',
    href: '/signup',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    color: 'blue',
    featured: true,
    productId: PRO_PRODUCT_ID,
    features: [
      '50 analyses / month',
      'Everything in Free',
      '🚀 Enhanced Content Optimizer (7 analyses)',
      'Schema Markup Generator',
      'Topic Cluster Mapping',
      'Entity & E-E-A-T signals',
      'LSI Keywords analysis',
      'AI rewrites & suggestions',
    ],
    cta: 'Start Pro',
  },
  {
    name: 'Agency',
    price: '$49',
    period: '/month',
    color: 'amber',
    productId: AGENCY_PRODUCT_ID,
    features: [
      '200 analyses / month',
      'Everything in Pro',
      '⚡ AI Performance Fixer (exclusive)',
      'Priority support',
      'Team collaboration (coming soon)',
      'Bulk analysis (coming soon)',
      'White-label reports (coming soon)',
    ],
    cta: 'Start Agency',
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(plan: typeof PLANS[0]) {
    if (!plan.productId) {
      if (plan.href) window.location.href = plan.href
      return
    }
    setLoading(plan.name)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: plan.productId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Checkout failed')
      window.location.href = d.url
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 font-extrabold text-slate-900">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">◈</span>
            Optmizly
          </Link>
          <h1 className="text-4xl font-black tracking-tight mb-4">Simple, transparent pricing</h1>
          <p className="text-slate-500">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className={`relative rounded-2xl p-7 bg-white ${plan.featured ? 'border-2 border-blue-600 shadow-xl shadow-blue-100' : 'border border-slate-200'}`}>
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="text-sm font-bold text-slate-500 mb-2">{plan.name}</div>
              <div className={`text-4xl font-black mb-1 ${plan.color === 'blue' ? 'text-blue-600' : plan.color === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>
                {plan.price}
              </div>
              <div className="text-sm text-slate-400 mb-6">{plan.period}</div>
              <div className="h-px bg-slate-100 mb-6" />
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-2 text-sm mb-2.5">
                  <span className=”text-emerald-500 font-bold mt-0.5 flex-shrink-0”>✓</span>
                  <span>{f}</span>
                </div>
              ))}
              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-extrabold transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  plan.color === 'blue'
                    ? 'bg-blue-600 text-white'
                    : plan.color === 'amber'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {loading === plan.name ? 'Redirectingâ€¦' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10">
          Payments securely processed by{' '}
          <a href="https://dodopayments.com" target="_blank" rel="noopener noreferrer" className="underline">Dodo Payments</a>
          {' '}Â· Cancel anytime
        </p>

        <div className="mt-8 text-center text-xs text-slate-400 space-x-4">
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-slate-600">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}

