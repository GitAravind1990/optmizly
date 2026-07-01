'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STEPS = [
  {
    n: 1,
    label: 'Analyse your first page',
    desc: 'Paste a URL or content to get an AI content score across 8 dimensions.',
    href: '/dashboard',
  },
  {
    n: 2,
    label: 'Audit on-page SEO',
    desc: 'Check title tags, headings, meta descriptions and keyword usage.',
    href: '/dashboard/onpage',
  },
  {
    n: 3,
    label: 'Unlock all 17 tools',
    desc: 'Pro adds rank tracking, E-E-A-T analysis, content gaps, backlinks and more.',
    href: '/pricing',
  },
]

export function WelcomeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('optmizly_welcome_v1')) setVisible(true)
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem('optmizly_welcome_v1', '1')
    setVisible(false)
  }

  return (
    <div className="mx-4 mt-4 md:mx-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-black text-blue-900">Welcome to Optmizly</p>
          <p className="text-xs text-blue-600 mt-0.5">Get started in 3 steps</p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-blue-300 hover:text-blue-500 transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {STEPS.map(step => (
          <Link
            key={step.n}
            href={step.href}
            onClick={dismiss}
            className="flex gap-3 rounded-xl bg-white border border-blue-100 px-3 py-2.5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">
              {step.n}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{step.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
