'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Plan } from '@prisma/client'

/** The two steps every account starts with, whatever it pays. */
const FIRST_STEPS = [
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
]

/**
 * The third step, which depends on what the account already has.
 *
 * This was one hardcoded line pitching "Unlock all 12 tools from $9" to everybody, so a
 * paying Agency account — which already has all 24 — was shown an upsell to a cheaper plan
 * with fewer tools. A `Record<Plan, …>` rather than a lookup with a default, so adding a
 * tier is a compile error instead of silently inheriting someone else's pitch.
 *
 * The tier rules this has to obey: Free upsells point at Starter, not Pro, because Starter
 * is the cheapest plan that unlocks a Pro-tier tool. Starter and Pro see the identical 12
 * tools, so a Starter step sells volume and never "more tools". Agency Plus likewise adds no
 * tools over Agency — it sells clients, seats and volume. Agency Plus is the top plan and
 * has nothing above it, so it gets a product step instead of a pitch.
 */
const LAST_STEP: Record<Plan, { label: string; desc: string; href: string }> = {
  FREE: {
    label: 'Unlock all 12 tools from $9',
    desc: 'Starter adds rank tracking, E-E-A-T analysis, content gaps, backlinks and more.',
    href: '/pricing',
  },
  STARTER: {
    label: 'Run more than 15 analyses a month',
    desc: 'Pro is the same 12 tools at 50 analyses a month.',
    href: '/pricing',
  },
  PRO: {
    label: 'Unlock all 24 tools with Agency',
    desc: 'Agency adds SEO audits, local SEO, client reports, AI Visibility and more.',
    href: '/pricing',
  },
  AGENCY: {
    label: 'Add unlimited clients and seats',
    desc: 'Agency Plus is the same 24 tools with unlimited client projects and 5 seats.',
    href: '/pricing',
  },
  AGENCY_PLUS: {
    label: 'Connect Search Console',
    desc: 'Grounds Rank Tracker, AI Visibility and content gaps in your own query data.',
    href: '/dashboard/settings',
  },
}

export function WelcomeBanner({ plan }: { plan: Plan | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('optmizly_welcome_v1')) setVisible(true)
  }, [])

  // Nothing until the plan is known. A null plan means /api/user has not answered yet or
  // failed, and guessing costs more than waiting: the guess is a sales pitch, and the wrong
  // one tells a paying customer to buy something they already have.
  if (!visible || !plan) return null

  const STEPS = [...FIRST_STEPS, { n: 3, ...LAST_STEP[plan] }]

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
