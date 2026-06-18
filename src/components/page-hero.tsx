'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

export function PageHero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 mb-8">
        ⚡ NEW – Content Optimizer: The Only Tool That FIXES Your Content
      </div>
      <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 mb-6 md:text-6xl">
        Detect Issues.<br />
        <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
          AI-Fix Them Automatically.
        </span>
      </h1>
      <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        Optmizly is the only platform that detects AND fixes your content issues – with 11 specialist tools covering content analysis, E-E-A-T, citations, local SEO, topical authority, and automated optimization.
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <SignedOut>
          <Link href="/signup" className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5">
            Start Analysing Free →
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5">
            Open Dashboard →
          </Link>
        </SignedIn>
        <a href="#pricing" className="rounded-full border-2 border-slate-300 px-7 py-4 text-base font-bold text-slate-700 hover:border-brand-600 transition-colors">
          See Pricing
        </a>
      </div>
      <div className="mt-16 flex justify-center gap-12 border-t border-slate-100 pt-12 flex-wrap">
        {[['17', 'AI-powered tools'], ['8', 'Score dimensions'], ['3', 'Pricing plans'], ['500+', 'content teams']].map(([n, l]) => (
          <div key={l} className="text-center">
            <div className="text-3xl font-black text-slate-900">{n}</div>
            <div className="text-sm text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
