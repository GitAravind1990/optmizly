'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

type DomainAnalysis = {
  id: string
  domain: string
  backlinksTotal: number
  dofollowLinks: number
  nofollowLinks: number
  referringDomains: number
  referringIPs: number
  spamScore: number
  domainRank: number
  oprScore: number
  newBacklinks14d: number
  lostBacklinks14d: number
  newReferringDomains14d: number
  lostReferringDomains14d: number
  brokenBacklinks: number
  createdAt: string
}

type ProjectSummary = {
  id: string
  name: string
  domain: string
  niche: string
  totalOpportunities: number
  contactedCount: number
  securedCount: number
  aiSummary: string | null
  createdAt: string
}

const NICHE_EXAMPLES = [
  'SaaS / B2B Software', 'Health & Wellness', 'Finance / Fintech',
  'Marketing / SEO', 'E-commerce / Retail', 'Education / EdTech',
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

// ─── Domain Analysis Card ───────────────────────────────────────────────────

function oprColor(score: number) {
  if (score >= 6) return 'text-green-600'
  if (score >= 3) return 'text-amber-600'
  return 'text-slate-500'
}

function AnalysisCard({ a, onDelete }: { a: DomainAnalysis; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tools/backlinks/domain-analysis/${a.id}`, { method: 'DELETE' })
    onDelete(a.id)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-bold text-slate-800 text-base">{a.domain}</div>
          <div className="text-xs text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Authority Score</div>
          <div className={`text-2xl font-black ${oprColor(a.oprScore)}`}>
            {a.oprScore > 0 ? a.oprScore.toFixed(1) : '—'}<span className="text-sm font-normal text-slate-400">/10</span>
          </div>
        </div>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-700">
            {a.oprScore > 0 ? a.oprScore.toFixed(2) : '—'}
          </div>
          <div className="text-[10px] text-slate-500">Domain Authority</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-slate-700">
            {a.domainRank > 0 ? `#${fmt(a.domainRank)}` : '—'}
          </div>
          <div className="text-[10px] text-slate-500">Global Rank</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/backlinks/analysis/${a.id}`}
          className="flex-1 text-center text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          Full Report
        </Link>
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

// ─── AI Project Card ─────────────────────────────────────────────────────────

function ProjectCard({ p, onDelete }: { p: ProjectSummary; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const total = p.totalOpportunities

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tools/backlinks/${p.id}`, { method: 'DELETE' })
    onDelete(p.id)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
          <div className="text-xs text-slate-400">{p.domain} · {p.niche}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-green-600">{p.securedCount}</div>
          <div className="text-[10px] text-slate-400">secured</div>
        </div>
      </div>
      <div className="flex gap-2 text-xs text-slate-500 mb-3">
        <span className="bg-slate-100 rounded px-2 py-0.5">{total} opportunities</span>
        <span className="bg-blue-50 text-blue-600 rounded px-2 py-0.5">{p.contactedCount} contacted</span>
      </div>
      <div className="flex gap-2">
        <Link href={`/dashboard/backlinks/${p.id}`}
          className="flex-1 text-center text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors font-medium">
          Manage Outreach
        </Link>
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function BacklinksClient() {
  const [tab, setTab] = useState<'data' | 'outreach'>('data')

  // Real data state
  const [analyses, setAnalyses] = useState<DomainAnalysis[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  const [domainInput, setDomainInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  // Outreach state
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [niche, setNiche] = useState('')
  const [keywords, setKeywords] = useState('')
  const [brief, setBrief] = useState('')

  useEffect(() => { loadAnalyses(); loadProjects() }, [])

  async function loadAnalyses() {
    setLoadingAnalyses(true)
    try {
      const r = await fetch('/api/tools/backlinks/domain-analysis')
      const d = await r.json()
      if (Array.isArray(d)) setAnalyses(d)
    } catch {
      // network error — leave existing data
    } finally {
      setLoadingAnalyses(false)
    }
  }

  async function loadProjects() {
    setLoadingProjects(true)
    try {
      const r = await fetch('/api/tools/backlinks')
      const d = await r.json()
      if (Array.isArray(d)) setProjects(d)
    } catch {
      // network error — leave existing data
    } finally {
      setLoadingProjects(false)
    }
  }

  async function runAnalysis() {
    if (!domainInput.trim()) { setAnalyzeError('Enter a domain'); return }
    setAnalyzeError('')
    setAnalyzing(true)
    try {
      const r = await fetch('/api/tools/backlinks/domain-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setDomainInput('')
      loadAnalyses()
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function generateProject() {
    if (!name.trim() || !domain.trim() || !niche.trim()) {
      setProjectError('Name, domain and niche required'); return
    }
    setProjectError('')
    setGenerating(true)
    try {
      const kwList = keywords.split('\n').map(k => k.trim()).filter(Boolean)
      const r = await fetch('/api/tools/backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, niche, targetKeywords: kwList, contentBrief: brief }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setShowProjectForm(false)
      setName(''); setDomain(''); setNiche(''); setKeywords(''); setBrief('')
      loadProjects()
    } catch (e: unknown) {
      setProjectError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          Backlinks
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">PRO</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Domain authority checker · AI outreach planner with status tracking</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('data')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'data' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Domain Authority
        </button>
        <button onClick={() => setTab('outreach')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'outreach' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          AI Outreach Planner
        </button>
      </div>

      {/* ── TAB: Real Data ── */}
      {tab === 'data' && (
        <>
          {/* Analyze form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-700 mb-2">Check domain authority</div>
            <div className="flex gap-2">
              <input
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                placeholder="example.com"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={e => e.key === 'Enter' && runAnalysis()}
              />
              <button onClick={runAnalysis} disabled={analyzing}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors min-w-[130px]">
                {analyzing ? 'Fetching...' : 'Analyze'}
              </button>
            </div>
            {analyzeError && <p className="text-xs text-red-500 mt-2">{analyzeError}</p>}
            {analyzing && <p className="text-xs text-slate-400 mt-2">Fetching domain authority...</p>}
          </div>

          {loadingAnalyses ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="9" y="7" width="4" height="13" rx="1"/><rect x="15" y="3" width="4" height="17" rx="1"/></svg>
              </div>
              <div className="text-lg font-bold text-slate-700">No analyses yet</div>
              <div className="text-sm text-slate-400 mt-1">Enter a domain above to fetch real backlink data</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyses.map(a => (
                <AnalysisCard key={a.id} a={a} onDelete={id => setAnalyses(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: AI Outreach ── */}
      {tab === 'outreach' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setShowProjectForm(!showProjectForm); setProjectError('') }}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
              {showProjectForm ? '✕ Cancel' : '+ New Project'}
            </button>
          </div>

          {showProjectForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4">New Link Building Project</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Project Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Q3 Link Building"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Domain *</label>
                  <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Niche *</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {NICHE_EXAMPLES.map(n => (
                    <button key={n} onClick={() => setNiche(n)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${niche === n ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:border-blue-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Or type your niche..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Target Keywords (one per line)</label>
                  <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={3}
                    placeholder={"seo tools\nrank tracker"} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Content Brief</label>
                  <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3}
                    placeholder="What your site is about..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
              </div>
              {projectError && <p className="text-xs text-red-500 mb-3">{projectError}</p>}
              <div className="flex gap-3 items-center">
                <button onClick={generateProject} disabled={generating}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {generating ? 'Generating...' : 'Generate 12 Opportunities'}
                </button>
                {generating && <span className="text-xs text-slate-400">Claude is researching real sites (~20 sec)</span>}
              </div>
            </div>
          )}

          {loadingProjects ? (
            <div className="text-center py-16 text-slate-400">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><rect x="5" y="2" width="12" height="14" rx="2"/><path d="M5 8H3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2"/><path d="M17 8h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="13" y1="18" x2="13" y2="22"/><line x1="7" y1="22" x2="15" y2="22"/></svg>
              </div>
              <div className="text-lg font-bold text-slate-700">No outreach projects yet</div>
              <div className="text-sm text-slate-400 mt-1">Create a project to get AI-generated pitch angles and track outreach status</div>
              <button onClick={() => setShowProjectForm(true)}
                className="mt-4 px-5 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                + Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <ProjectCard key={p.id} p={p} onDelete={id => setProjects(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
