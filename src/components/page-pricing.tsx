'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

const plans = [
  {
    name: 'Free', price: '$0', period: 'forever', color: 'gray',
    features: ['3 analyses / month', '8-dimension content score', 'Issues audit (tab)', 'Entity gaps (tab)'],
    cta: 'Get Started Free', signedOutHref: '/signup', signedInHref: '/dashboard',
  },
  {
    name: 'Pro', price: '$19', period: 'per month', color: 'blue', featured: true,
    features: ['50 analyses / month', 'Everything in Free', '⚡ Content Optimizer + Full Rewrite', 'E-E-A-T deep analysis', 'Relevant Backlinks finder', '🔭 AI Visibility (Citation + Queries)', 'Content Gap analyzer'],
    cta: 'Start Pro Trial', signedOutHref: '/signup', signedInHref: '/pricing',
  },
  {
    name: 'Agency', price: '$49', period: 'per month', color: 'amber',
    features: ['200 analyses / month', 'Everything in Pro', 'AI Citation Tracker', 'Local SEO Suite (4 tools)', 'SERP Competitor Audit', 'Topical Authority Mapper ☆', 'AI Performance Fixer (Core Web Vitals)'],
    cta: 'Start Agency Trial', signedOutHref: '/signup', signedInHref: '/pricing',
  },
]

export function PagePricing() {
  return (
    <section id="pricing" className="py-20 px-6 bg-slate-50">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">Simple pricing</p>
        <h2 className="text-4xl font-extrabold text-center tracking-tight mb-4">Start Free. Scale as You Grow.</h2>
        <p className="text-center text-slate-500 max-w-lg mx-auto mb-12">All analysis happens securely on our servers. No API keys needed.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`relative rounded-2xl p-7 ${p.featured ? 'bg-white border-2 border-brand-600 shadow-xl shadow-blue-100' : 'bg-white border border-slate-200'}`}>
              {p.featured && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-bold text-white whitespace-nowrap">Most Popular</div>}
              <div className="text-sm font-bold text-slate-500 mb-2">{p.name}</div>
              <div className={`text-4xl font-black mb-1 ${p.color === 'blue' ? 'text-brand-600' : p.color === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>{p.price}</div>
              <div className="text-sm text-slate-400 mb-6">{p.period}</div>
              <div className="h-px bg-slate-100 mb-6" />
              {p.features.map(f => (
                <div key={f} className="flex items-start gap-2 text-sm mb-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span>{f}</span>
                </div>
              ))}
              <SignedOut>
                <Link href={p.signedOutHref} className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-extrabold transition-opacity hover:opacity-90 ${
                  p.color === 'blue' ? 'bg-brand-600 text-white' :
                  p.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
                  'bg-slate-100 text-slate-700'
                }`}>{p.cta}</Link>
              </SignedOut>
              <SignedIn>
                <Link href={p.signedInHref} className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-extrabold transition-opacity hover:opacity-90 ${
                  p.color === 'blue' ? 'bg-brand-600 text-white' :
                  p.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
                  'bg-slate-100 text-slate-700'
                }`}>{p.cta}</Link>
              </SignedIn>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
