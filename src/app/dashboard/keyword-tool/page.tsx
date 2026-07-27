'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ProjectSummary = {
  id: string
  name: string
  targetLocation: string
  createdAt: string
  updatedAt: string
  keywordCount: number
}

export default function KeywordToolPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [location, setLocation] = useState('US')
  const [seedKeyword, setSeedKeyword] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/tools/keyword-tool')
    const d = await r.json()
    if (d.data) setProjects(d.data)
    setLoading(false)
  }

  async function create() {
    if (!name.trim() || !seedKeyword.trim()) {
      setError('List name and a seed keyword are required.')
      return
    }
    setError('')
    setCreating(true)
    try {
      const r = await fetch('/api/tools/keyword-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetLocation: location, seedKeyword }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to create list')
      setShowCreate(false)
      setName(''); setSeedKeyword('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  async function deleteProject(id: string) {
    setDeleting(id)
    await fetch(`/api/tools/keyword-tool/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Keyword Research</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real search volume, difficulty, and related keywords for any topic</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          + New List
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">New Keyword List</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">List Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Q3 Blog Topics"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seed Keyword</label>
                  <input value={seedKeyword} onChange={e => setSeedKeyword(e.target.value)} placeholder="content marketing"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location</label>
                  <select value={location} onChange={e => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['US','GB','AU','CA','IN','DE','FR','SG','NZ'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

              <div className="flex gap-3 pt-1">
                <button onClick={create} disabled={creating}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Researching...' : 'Create List'}
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

      {/* Lists */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><circle cx="10" cy="10" r="7"/><line x1="15" y1="15" x2="20" y2="20"/></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-700">No keyword lists yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">Enter a seed keyword to get real search volume, difficulty, and related terms</p>
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Create First List
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold uppercase">{p.targetLocation}</span>
                  </div>

                  <div className="flex gap-6 mt-3">
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-800">{p.keywordCount}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Keywords</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mt-2">
                    Created {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/dashboard/keyword-tool/${p.id}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 text-center">
                    View Details
                  </Link>
                  <button onClick={() => deleteProject(p.id)} disabled={deleting === p.id}
                    className="rounded-lg border border-red-100 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-50 disabled:opacity-50">
                    {deleting === p.id ? '...' : 'Delete'}
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
