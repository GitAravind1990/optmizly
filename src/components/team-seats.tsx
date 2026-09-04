'use client'

import { useEffect, useState } from 'react'

type Member = {
  id: string
  email: string
  status: 'PENDING' | 'ACTIVE'
  invitedAt: string
  acceptedAt: string | null
}

type TeamState = {
  owner: { email: string }
  members: Member[]
  used: number
  limit: number
}

/**
 * Seat management, owner-only.
 *
 * The API refuses a non-owner independently; this component simply never renders for one,
 * because a member sees the owner's account and a disabled panel explaining why they cannot
 * touch it would be noise in someone else's settings.
 */
export function TeamSeats() {
  const [state, setState] = useState<TeamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { load() }, [])

  /**
   * Ownership is decided by the API, not passed in as a prop.
   *
   * The route already refuses a non-owner with 403 because it must — a member could
   * otherwise invite people into an account that is not theirs. Reading that answer here
   * means there is one place deciding who owns an account, rather than a server rule and a
   * client flag that can disagree.
   */
  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/agency/team')
      if (res.ok) setState(await res.json())
      else setState(null)
    } finally {
      setLoading(false)
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/agency/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not send that invite.'); return }
      setEmail('')
      setNotice(`Invited ${data.member.email}. They get access the first time they sign in with that address.`)
      load()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(m: Member) {
    if (!confirm(`Remove ${m.email}? They lose access to this account immediately and keep their own.`)) return
    setError(''); setNotice('')
    const res = await fetch(`/api/agency/team?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not remove that member.')
      return
    }
    load()
  }

  if (loading) return null
  // Either not the owner (403) or the request failed. Either way there is nothing useful to
  // show a member inside someone else's settings.
  if (!state) return null

  const full = state.used >= state.limit
  const singleUser = state.limit <= 1

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-base font-black text-slate-900 m-0">Team access</h3>
        <span className={`text-sm ${full ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
          {state.used} of {state.limit} {state.limit === 1 ? 'seat' : 'seats'} used
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Everyone on a seat shares this account — the same clients, analyses and monthly
        allowance. Only you can manage billing and seats.
      </p>

      <ul className="mt-4 space-y-2 list-none pl-0">
        <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-800 truncate">{state.owner.email}</span>
          <span className="shrink-0 text-xs font-semibold text-slate-500">Owner</span>
        </li>
        {state.members.map(m => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-800 truncate">{m.email}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className={`text-xs font-semibold ${m.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {m.status === 'ACTIVE' ? 'Active' : 'Invited'}
              </span>
              <button onClick={() => revoke(m)} className="text-xs font-semibold text-red-600 hover:underline">
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>

      {singleUser ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Your plan is single-user. Agency includes {2} seats so a colleague can work in the
          same account.
        </p>
      ) : full ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          All {state.limit} seats are in use. Remove someone to invite another person.
        </p>
      ) : (
        <form onSubmit={invite} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@agency.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
    </div>
  )
}
