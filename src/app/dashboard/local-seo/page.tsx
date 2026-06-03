'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Location = { id: string; name: string; city: string; state: string; averageRating: number | null; reviewCount: number | null; citationScore: number | null }
type Account = {
  id: string; name: string; accountType: string; createdAt: string
  locations: Location[]
  _count: { reviews: number; tasks: number; citations: number }
}

type LocForm = { name: string; address: string; city: string; state: string; zipCode: string; phone: string; website: string; industry: string }

const emptyLoc = (): LocForm => ({ name: '', address: '', city: '', state: '', zipCode: '', phone: '', website: '', industry: '' })

export default function LocalSEOPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState('multi-location')
  const [locations, setLocations] = useState<LocForm[]>([emptyLoc()])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/tools/local-seo/accounts')
    const d = await r.json()
    if (d.data) setAccounts(d.data)
    setLoading(false)
  }

  function updateLoc(i: number, field: keyof LocForm, val: string) {
    setLocations(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  async function create() {
    if (!name.trim()) { setError('Account name required'); return }
    const validLocs = locations.filter(l => l.name && l.address && l.city && l.state && l.phone)
    if (!validLocs.length) { setError('At least one complete location required (name, address, city, state, phone)'); return }
    setError(''); setCreating(true)
    try {
      const r = await fetch('/api/tools/local-seo/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accountType, locations: validLocs }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setShowCreate(false); setName(''); setLocations([emptyLoc()])
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setCreating(false) }
  }

  async function deleteAccount(id: string) {
    setDeleting(id)
    await fetch(`/api/tools/local-seo/accounts/${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const avgRating = (locs: Location[]) => {
    const rated = locs.filter(l => l.averageRating)
    return rated.length ? (rated.reduce((s, l) => s + l.averageRating!, 0) / rated.length).toFixed(1) : '—'
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Local SEO Suite</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage local SEO for multi-location businesses</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          + New Account
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">New Local SEO Account</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp — Local SEO"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Type</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="multi-location">Multi-location</option>
                    <option value="franchise">Franchise</option>
                    <option value="single-location">Single location</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Locations</label>
                  <button onClick={() => setLocations(prev => [...prev, emptyLoc()])}
                    className="text-xs text-blue-600 hover:underline">+ Add location</button>
                </div>

                {locations.map((loc, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 mb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Location {i + 1}</span>
                      {locations.length > 1 && (
                        <button onClick={() => setLocations(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={loc.name} onChange={e => updateLoc(i, 'name', e.target.value)} placeholder="Location name *"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.industry} onChange={e => updateLoc(i, 'industry', e.target.value)} placeholder="Industry (e.g. plumber)"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.address} onChange={e => updateLoc(i, 'address', e.target.value)} placeholder="Street address *"
                        className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.city} onChange={e => updateLoc(i, 'city', e.target.value)} placeholder="City *"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.state} onChange={e => updateLoc(i, 'state', e.target.value)} placeholder="State *"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.phone} onChange={e => updateLoc(i, 'phone', e.target.value)} placeholder="Phone *"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={loc.website} onChange={e => updateLoc(i, 'website', e.target.value)} placeholder="Website (optional)"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                ))}
              </div>

              {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

              <div className="flex gap-3 pt-1">
                <button onClick={create} disabled={creating}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
                <button onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">📍</div>
          <h2 className="text-lg font-bold text-slate-700">No local SEO accounts yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">Add a multi-location business to start tracking local rankings, reviews, and citations</p>
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Create Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-900">{a.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold uppercase">{a.accountType}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-3">{a.locations.length} location{a.locations.length !== 1 ? 's' : ''}</div>

                  <div className="flex gap-6 mb-3">
                    {[
                      { label: 'Avg Rating', value: avgRating(a.locations), icon: '⭐' },
                      { label: 'Reviews', value: a._count.reviews, icon: '💬' },
                      { label: 'Citations', value: a._count.citations, icon: '📋' },
                      { label: 'Open Tasks', value: a._count.tasks, icon: '✅' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-sm font-black text-slate-800">{s.icon} {s.value}</div>
                        <div className="text-[10px] text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {a.locations.map(l => (
                      <span key={l.id} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                        {l.name} · {l.city}, {l.state}
                        {l.averageRating && ` · ⭐ ${l.averageRating}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/dashboard/local-seo/${a.id}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 text-center">
                    Manage
                  </Link>
                  <button onClick={() => deleteAccount(a.id)} disabled={deleting === a.id}
                    className="rounded-lg border border-red-100 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-50 disabled:opacity-50">
                    {deleting === a.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
