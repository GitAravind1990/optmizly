'use client'

import { useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

type PublicProspect = {
  id: string
  name: string
  website: string | null
  location: string
  opportunityScore: number
  opportunityLevel: string
  topIssues: string[]
  status: string
  siteReachable: boolean
}

const LEVEL_STYLES: Record<string, string> = {
  High: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Good: 'bg-amber-50 text-amber-800 border-amber-200',
  Fair: 'bg-slate-50 text-slate-700 border-slate-200',
  Low: 'bg-slate-50 text-slate-500 border-slate-200',
}

export function PublicProspectFinder() {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prospects, setProspects] = useState<PublicProspect[] | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  // Capacity fallback — the shared daily Google ceiling, not the visitor's own allowance.
  const [capacity, setCapacity] = useState('')
  const [waitEmail, setWaitEmail] = useState('')
  const [waitDone, setWaitDone] = useState(false)
  const [waitBusy, setWaitBusy] = useState(false)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (!industry.trim() || !location.trim()) return
    setLoading(true)
    setError('')
    setNotice('')
    setCapacity('')
    setProspects(null)
    posthog.capture('prospect_finder_started', { location: 'public' })

    try {
      const res = await fetch('/api/public/prospect-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, location }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        posthog.capture('prospect_finder_failed', { location: 'public', status: res.status })
        return
      }
      if (data.capacityReached) {
        setCapacity(data.message)
        setWaitDone(false)
        posthog.capture('prospect_finder_capacity_reached', { location: 'public' })
        return
      }

      setProspects(data.prospects ?? [])
      setRemaining(typeof data.remaining === 'number' ? data.remaining : null)
      if (data.message) setNotice(data.message)
      posthog.capture('prospect_finder_completed', {
        location: 'public',
        found: (data.prospects ?? []).length,
      })
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function joinWaitlist() {
    setWaitBusy(true)
    try {
      const res = await fetch('/api/tools/client-finder/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitEmail, industry, location }),
      })
      if (res.ok) {
        setWaitDone(true)
        posthog.capture('prospect_finder_waitlist_joined', { location: 'public' })
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Could not add you to the list.')
      }
    } finally {
      setWaitBusy(false)
    }
  }

  return (
    <div>
      <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kind of business
            </span>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="dental clinics"
              className="mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Town or city
            </span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Coimbatore"
              className="mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !industry.trim() || !location.trim()}
          className="mt-4 w-full rounded-xl bg-brand-600 px-6 py-3.5 font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Checking their websites…' : 'Find prospects'}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          3 free searches a month · no account, no card
          {remaining !== null && <> · <strong>{remaining} left</strong></>}
        </p>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && !error && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </p>
      )}

      {/* Shared daily ceiling. Amber, and it offers something back. */}
      {capacity && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="m-0 text-sm font-semibold text-amber-900">Live business data is at today&rsquo;s limit</p>
          <p className="mt-1 mb-0 text-sm text-amber-800">{capacity}</p>
          {waitDone ? (
            <p className="mt-3 mb-0 text-sm font-medium text-amber-900">
              We&rsquo;ll email you the moment it resets.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={waitEmail}
                onChange={e => setWaitEmail(e.target.value)}
                placeholder="you@agency.com"
                className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
              <button
                onClick={joinWaitlist}
                disabled={waitBusy || !waitEmail.trim()}
                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {waitBusy ? 'Saving…' : 'Tell me when it resets'}
              </button>
            </div>
          )}
        </div>
      )}

      {prospects && prospects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">
            {prospects.length} prospects worth a conversation
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Scored on what we could see from their public website. A higher score means more
            fixable SEO problems — which means more to sell.
          </p>

          <ul className="mt-5 space-y-3 list-none pl-0">
            {prospects.map(p => (
              <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-slate-900">{p.name}</p>
                    <p className="m-0 mt-0.5 truncate text-sm text-slate-500">
                      {p.website ?? 'No website found'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      LEVEL_STYLES[p.opportunityLevel] ?? LEVEL_STYLES.Fair
                    }`}
                  >
                    {p.opportunityScore} · {p.opportunityLevel}
                  </span>
                </div>
                {p.topIssues.length > 0 && (
                  <ul className="mt-3 space-y-1 pl-4 text-sm text-slate-600">
                    {p.topIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* The gate, stated plainly. Not a blur over the data - the data above is real and
              complete. What is missing is the means to act on it at scale. */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="m-0 font-bold text-slate-900">Ready to contact them?</p>
            <p className="mt-1.5 mb-0 text-sm leading-relaxed text-slate-600">
              These ten are yours — copy them down, they are real. Optmizly Agency adds the part
              that takes the time: email addresses and contact pages pulled from each site, the
              full issue list per prospect, CSV export, saved searches so you can track who you
              have pitched, and drafted outreach for each one.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/signup"
                onClick={() => posthog.capture('signup_started', { location: 'prospect_finder' })}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-brand-700"
              >
                Create a free account →
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 no-underline hover:border-slate-400"
              >
                See Agency pricing
              </Link>
            </div>
          </div>
        </div>
      )}

      {prospects && prospects.length === 0 && !notice && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Nothing matched that search. Try a broader industry, or a larger nearby city.
        </p>
      )}
    </div>
  )
}
