'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Client = {
  id: string
  name: string
  email: string
  website: string
  industry: string | null
  createdAt: string
  _count: { reports: number }
}

export default function AgencyClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', website: '', industry: '', keywords: '', competitors: '',
  })

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const res = await fetch('/api/agency/clients')
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to add client')
      } else {
        setForm({ name: '', email: '', website: '', industry: '', keywords: '', competitors: '' })
        setShowForm(false)
        loadClients()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This will also delete all their reports.`)) return
    await fetch(`/api/agency/clients/${id}`, { method: 'DELETE' })
    loadClients()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Client Reports</h1>
            <p className="text-sm text-slate-500 mt-1">Manage clients and generate monthly SEO reports</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Client'}
          </button>
        </div>

        {/* Add client form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">New Client</h2>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="contact@acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Website *</label>
                <input
                  required
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Industry</label>
                <input
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="E-commerce"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Track Keywords (comma-separated)</label>
                <input
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="seo services, digital marketing, content strategy"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Competitors (comma-separated URLs)</label>
                <input
                  value={form.competitors}
                  onChange={e => setForm(f => ({ ...f, competitors: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://competitor1.com, https://competitor2.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Client list */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-slate-600 font-medium">No clients yet</p>
            <p className="text-slate-400 text-sm mt-1">Add your first client to start generating reports</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {clients.map(client => (
              <div key={client.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                    <a href={client.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">{client.website}</a>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-medium">
                    {client._count.reports} report{client._count.reports !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  <span>{client.email}</span>
                  {client.industry && <span className="ml-3 text-slate-400">· {client.industry}</span>}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/agency/clients/${client.id}/reports`}
                    className="flex-1 text-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    View Reports
                  </Link>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
