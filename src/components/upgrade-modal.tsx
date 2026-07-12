'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PlanCopy = {
  heading: string
  body: string
  benefits: string[]
  cta: { label: string; href: string } | null
}

function copyForPlan(plan: string, limit: number | null): PlanCopy {
  if (plan === 'AGENCY') {
    return {
      heading: "You've reached this month's limit",
      body: `You've used all ${limit ?? 200} analyses in your Agency plan this month. Your quota resets on the 1st of next month.`,
      benefits: [
        'Your usage resets automatically every month',
        'All your saved audits, trackers and reports stay available',
        'Need a higher limit for your team? Reach out from the settings page',
      ],
      cta: null,
    }
  }
  if (plan === 'PRO') {
    return {
      heading: "You've hit your Pro limit",
      body: `You've used all ${limit ?? 50} analyses this month. Upgrade to Agency for 4× the volume and the full agency toolkit.`,
      benefits: [
        '200 analyses every month (vs 50 on Pro)',
        'SEO Audit, Local SEO Suite, SERP & Topical Authority unlocked',
        'Geogrid, Review Velocity & white-label client reports',
      ],
      cta: { label: 'Upgrade to Agency ($49/mo) →', href: '/pricing' },
    }
  }
  return {
    heading: "You've hit your free limit",
    body: "You've used all your free analyses this month. Upgrade to Pro for more runs across all 17 tools.",
    benefits: [
      '50 content analyses every month',
      'All Pro SEO tools unlocked (E-E-A-T, Gap, Rank Tracker…)',
      'Ranking Engine, Backlinks & AI citation optimiser',
    ],
    cta: { label: 'Upgrade to Pro ($19/mo) →', href: '/pricing' },
  }
}

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [plan, setPlan] = useState('FREE')
  const [limit, setLimit] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (d?.plan) setPlan(d.plan)
        if (typeof d?.limit === 'number') setLimit(d.limit)
      })
      .catch(() => {})
  }, [])

  const c = copyForPlan(plan, limit)

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
          {c.heading}
        </h2>
        <p className="text-slate-500 text-center text-sm mb-7 leading-relaxed">
          {c.body}
        </p>

        <ul className="space-y-3 mb-7">
          {c.benefits.map(item => (
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

        {c.cta && (
          <Link
            href={c.cta.href}
            className="block w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3.5 text-center text-sm font-bold text-white transition-colors"
          >
            {c.cta.label}
          </Link>
        )}

        <button
          onClick={onClose}
          className="block w-full mt-3 text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          {c.cta ? 'Maybe later' : 'Close'}
        </button>
      </div>
    </div>
  )
}
