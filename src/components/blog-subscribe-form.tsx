'use client'

import { useState } from 'react'
import posthog from 'posthog-js'

export function BlogSubscribeForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const r = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      })
      if (r.ok) {
        posthog.capture('blog_subscribed', { has_first_name: !!firstName.trim() })
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <polyline points="3,9 7,13 15,5"/>
          </svg>
        </div>
        <p className="font-bold text-slate-900 mb-1">You're in!</p>
        <p className="text-sm text-slate-500">Check your inbox for a confirmation and your first SEO tip.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Free newsletter</p>
      <h3 className="text-lg font-black text-slate-900 mb-1">Weekly SEO insights</h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Practical tips on content optimisation, E-E-A-T, and AI search — no fluff, one email a week.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-white transition-colors"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe — it\'s free'}
        </button>
        {status === 'error' && (
          <p className="text-xs text-red-500 text-center">Something went wrong. Please try again.</p>
        )}
        <p className="text-xs text-slate-400 text-center">No spam. Unsubscribe any time.</p>
      </form>
    </div>
  )
}
