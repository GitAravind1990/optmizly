'use client'

import Link from 'next/link'

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-900 text-center mb-2">
          You've hit your free limit
        </h2>
        <p className="text-slate-500 text-center text-sm mb-7 leading-relaxed">
          You've used all your free analyses this month. Upgrade to Pro for unlimited runs across all 17 tools.
        </p>

        <ul className="space-y-3 mb-7">
          {[
            'Unlimited content analyses every month',
            'All 17 SEO tools unlocked (SERP, E-E-A-T, Gap, Topical…)',
            'Rank Tracker, Ranking Engine & AI citation optimiser',
          ].map(item => (
            <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/pricing"
          className="block w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3.5 text-center text-sm font-bold text-white transition-colors"
        >
          Upgrade to Pro — $19/mo →
        </Link>

        <button
          onClick={onClose}
          className="block w-full mt-3 text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
