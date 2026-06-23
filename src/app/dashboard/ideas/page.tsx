'use client'

import { useEffect, useState, useCallback } from 'react'
import { exportContentIdeasCSV, exportContentIdeasPDF } from '@/lib/export'

// ─── Types ────────────────────────────────────────────────────────────────────

type Idea = {
  id: string
  title: string
  slug: string
  description: string | null
  primaryKeyword: string
  relatedKeywords: string
  searchVolume: number
  difficulty: number
  cpc: number | null
  contentType: string
  estimatedLength: number
  sections: string
  entitiesNeeded: string
  lsiKeywords: string
  semanticGaps: string
  eeatScore: number
  competitorCount: number
  opportunityScore: number
  status: string
  pinned: boolean
  notes: string | null
  aiOutline: string | null
  aiIntro: string | null
  createdAt: string
  project: { name: string; industry: string }
}

type Project = {
  id: string
  name: string
  industry: string
  targetAudience: string
  createdAt: string
  _count: { ideas: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTENT_TYPE_LABEL: Record<string, string> = {
  'how-to': 'How-To',
  listicle: 'Listicle',
  comparison: 'Comparison',
  guide: 'Guide',
  'case-study': 'Case Study',
  tutorial: 'Tutorial',
  article: 'Article',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea:        { label: 'Idea',        color: 'bg-slate-100 text-slate-600' },
  researching: { label: 'Researching', color: 'bg-blue-50 text-blue-700' },
  writing:     { label: 'Writing',     color: 'bg-amber-50 text-amber-700' },
  review:      { label: 'Review',      color: 'bg-purple-50 text-purple-700' },
  published:   { label: 'Published',   color: 'bg-green-50 text-green-700' },
}

function difficultyColor(d: number) {
  if (d <= 30) return 'text-green-600'
  if (d <= 60) return 'text-amber-600'
  return 'text-red-500'
}

function opportunityBar(score: number) {
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-6">{score}</span>
    </div>
  )
}

// ─── Generate Form ─────────────────────────────────────────────────────────────

function GenerateForm({ projectId, onDone }: { projectId?: string; onDone: (pid: string) => void }) {
  const [form, setForm] = useState({
    industry: '',
    targetAudience: '',
    seedKeywords: '',
    numberOfIdeas: '10',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tools/content-ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeywords: form.seedKeywords.split(',').map(k => k.trim()).filter(Boolean),
          industry: form.industry,
          targetAudience: form.targetAudience,
          numberOfIdeas: Number(form.numberOfIdeas),
          projectId: projectId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      onDone(data.projectId)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Industry *</label>
          <input
            required
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="SaaS, E-commerce, Healthcare..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Target Audience *</label>
          <input
            required
            value={form.targetAudience}
            onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Small business owners, CTOs..."
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Seed Keywords * (comma-separated)</label>
          <input
            required
            value={form.seedKeywords}
            onChange={e => setForm(f => ({ ...f, seedKeywords: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="content marketing, SEO strategy, blog writing"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Number of Ideas (1–20)</label>
          <select
            value={form.numberOfIdeas}
            onChange={e => setForm(f => ({ ...f, numberOfIdeas: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} ideas</option>)}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating ideas with AI... (15–30s)
          </>
        ) : `Generate ${form.numberOfIdeas} Content Ideas`}
      </button>
    </form>
  )
}

// ─── Idea Detail Modal ─────────────────────────────────────────────────────────

function IdeaModal({ idea, onClose, onUpdate }: {
  idea: Idea
  onClose: () => void
  onUpdate: (updated: Partial<Idea>) => void
}) {
  const [tab, setTab] = useState<'overview' | 'outline' | 'notes'>('overview')
  const [genLoading, setGenLoading] = useState(false)
  const [notes, setNotes] = useState(idea.notes ?? '')
  const [status, setStatus] = useState(idea.status)
  const [saving, setSaving] = useState(false)

  const sections: string[] = JSON.parse(idea.sections || '[]')
  const keywords: string[] = JSON.parse(idea.relatedKeywords || '[]')
  const entities: string[] = JSON.parse(idea.entitiesNeeded || '[]')
  const lsi: string[] = JSON.parse(idea.lsiKeywords || '[]')
  const gaps: string[] = JSON.parse(idea.semanticGaps || '[]')

  async function generateOutline() {
    setGenLoading(true)
    try {
      const res = await fetch(`/api/tools/content-ideas/${idea.id}/outline`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        onUpdate({ aiOutline: data.aiOutline, aiIntro: data.aiIntro })
      }
    } finally {
      setGenLoading(false)
    }
  }

  async function saveChanges() {
    setSaving(true)
    try {
      const res = await fetch('/api/tools/content-ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: idea.id, status, notes }),
      })
      if (res.ok) onUpdate({ status, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">{CONTENT_TYPE_LABEL[idea.contentType] ?? idea.contentType}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{idea.estimatedLength.toLocaleString()} words</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{idea.title}</h2>
            <p className="text-xs text-slate-500 mt-1">/{idea.slug}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
          {(['overview', 'outline', 'notes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${tab === t ? 'text-brand-700 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Search Volume', value: idea.searchVolume.toLocaleString(), sub: '/mo' },
                  { label: 'Difficulty', value: idea.difficulty, sub: '/100', color: difficultyColor(idea.difficulty) },
                  { label: 'CPC', value: idea.cpc != null ? `$${idea.cpc.toFixed(2)}` : 'N/A', sub: '' },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className={`text-2xl font-black ${m.color ?? 'text-slate-900'}`}>{m.value}<span className="text-sm font-normal text-slate-400">{m.sub}</span></div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">{m.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Opportunity Score</div>
                {opportunityBar(idea.opportunityScore)}
              </div>

              {idea.description && <p className="text-sm text-slate-600 leading-relaxed bg-brand-50 rounded-lg p-4">{idea.description}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sections</div>
                  <ul className="space-y-1">
                    {sections.map((s, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-slate-300 font-mono text-xs mt-0.5">{String(i+1).padStart(2,'0')}</span>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Related Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((k, i) => <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{k}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entities to Include</div>
                  <div className="flex flex-wrap gap-1.5">
                    {entities.map((e, i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{e}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Semantic Gaps</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gaps.map((g, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{g}</span>)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">LSI Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {lsi.map((l, i) => <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{l}</span>)}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {tab === 'outline' && (
            <div>
              {idea.aiOutline ? (
                <div>
                  {idea.aiIntro && (
                    <div className="mb-5 p-4 bg-brand-50 rounded-xl border-l-4 border-brand-400">
                      <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">Generated Introduction</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{idea.aiIntro}</p>
                    </div>
                  )}
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Full Outline</div>
                  <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{idea.aiOutline}</pre>
                  <button
                    onClick={generateOutline}
                    disabled={genLoading}
                    className="mt-4 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {genLoading ? 'Regenerating...' : 'Regenerate Outline'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
                      <rect x="2" y="2" width="14" height="14" rx="2"/><line x1="5" y1="6" x2="13" y2="6"/><line x1="5" y1="9" x2="13" y2="9"/><line x1="5" y1="12" x2="9" y2="12"/>
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium mb-2">No outline generated yet</p>
                  <p className="text-slate-400 text-sm mb-6">AI will generate a detailed outline + intro paragraph</p>
                  <button
                    onClick={generateOutline}
                    disabled={genLoading}
                    className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {genLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Generating Outline + Intro...
                      </>
                    ) : 'Generate AI Outline & Intro'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={10}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Add notes, research links, competitor URLs, writing guidelines..."
              />
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [sortBy, setSortBy] = useState('opportunityScore')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ sortBy })
    if (statusFilter) params.set('status', statusFilter)
    if (selectedProject) params.set('projectId', selectedProject)
    const res = await fetch(`/api/tools/content-ideas?${params}`)
    if (res.ok) {
      const data = await res.json()
      setIdeas(data.ideas)
      setProjects(data.projects)
    }
    setLoading(false)
  }, [sortBy, statusFilter, selectedProject])

  useEffect(() => { load() }, [load])

  async function handlePin(idea: Idea) {
    await fetch('/api/tools/content-ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: idea.id, pinned: !idea.pinned }),
    })
    setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, pinned: !i.pinned } : i))
  }

  async function handleDelete(ideaId: string) {
    if (!confirm('Delete this content idea?')) return
    await fetch(`/api/tools/content-ideas?ideaId=${ideaId}`, { method: 'DELETE' })
    setIdeas(prev => prev.filter(i => i.id !== ideaId))
  }

  function handleIdeaUpdate(updated: Partial<Idea>) {
    if (!selectedIdea) return
    const merged = { ...selectedIdea, ...updated }
    setSelectedIdea(merged)
    setIdeas(prev => prev.map(i => i.id === merged.id ? merged : i))
  }

  const pinnedIdeas = ideas.filter(i => i.pinned)
  const unpinnedIdeas = ideas.filter(i => !i.pinned)
  const displayIdeas = [...pinnedIdeas, ...unpinnedIdeas]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Content Planner</h1>
            <p className="text-xs text-slate-500 mt-0.5">{ideas.length} ideas across {projects.length} projects</p>
          </div>
          <div className="flex items-center gap-2">
            {displayIdeas.length > 0 && (
              <>
                <button
                  onClick={() => exportContentIdeasCSV({
                    ideas: displayIdeas,
                    projectName: selectedProject ? projects.find(p => p.id === selectedProject)?.name : undefined,
                    projectIndustry: selectedProject ? projects.find(p => p.id === selectedProject)?.industry : undefined,
                  })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportContentIdeasPDF({
                    ideas: displayIdeas,
                    projectName: selectedProject ? projects.find(p => p.id === selectedProject)?.name : undefined,
                    projectIndustry: selectedProject ? projects.find(p => p.id === selectedProject)?.industry : undefined,
                  })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Export PDF
                </button>
              </>
            )}
            <button
              onClick={() => setShowGenerate(v => !v)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors"
            >
              {showGenerate ? 'Cancel' : '+ Generate Ideas'}
            </button>
          </div>
        </div>

        {/* Generate form */}
        {showGenerate && (
          <div className="mt-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Generate AI Content Ideas</h2>
            <GenerateForm
              projectId={selectedProject || undefined}
              onDone={(pid) => {
                setShowGenerate(false)
                setSelectedProject(pid)
                load()
              }}
            />
          </div>
        )}
      </div>

      <div className="flex h-full">
        {/* Sidebar: projects */}
        <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1.5">Projects</div>
            <button
              onClick={() => setSelectedProject('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!selectedProject ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All Projects
              <span className="float-right text-slate-400">{ideas.length}</span>
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedProject === p.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span className="block truncate">{p.name}</span>
                <span className="text-[10px] text-slate-400">{p._count.ideas} ideas</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="opportunityScore">Sort: Opportunity Score</option>
              <option value="searchVolume">Sort: Search Volume</option>
              <option value="difficulty">Sort: Difficulty (Easiest)</option>
              <option value="createdAt">Sort: Date Added</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-xs text-slate-400 ml-auto">{displayIdeas.length} ideas</span>
          </div>

          {/* Ideas grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading ideas...</div>
          ) : displayIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
                  <line x1="11" y1="2" x2="11" y2="4"/><line x1="19.07" y1="3.93" x2="17.66" y2="5.34"/><line x1="22" y1="11" x2="20" y2="11"/>
                  <path d="M8 18h6M9 21h4M11 6a5 5 0 1 0 3.54 8.54"/>
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No content ideas yet</p>
              <p className="text-slate-400 text-sm mt-1">Click "+ Generate Ideas" to create AI-powered content ideas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayIdeas.map(idea => (
                <div
                  key={idea.id}
                  className={`group bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${idea.pinned ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200'}`}
                  onClick={() => setSelectedIdea(idea)}
                >
                  <div className="flex items-start gap-4">
                    {/* Opportunity bar (narrow left column) */}
                    <div className="w-16 flex-shrink-0 pt-1">
                      <div className="text-center">
                        <div className={`text-lg font-black ${idea.opportunityScore >= 70 ? 'text-green-600' : idea.opportunityScore >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {idea.opportunityScore}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">score</div>
                      </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {idea.pinned && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_CONFIG[idea.status]?.color ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_CONFIG[idea.status]?.label ?? idea.status}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {CONTENT_TYPE_LABEL[idea.contentType] ?? idea.contentType}
                        </span>
                        {idea.aiOutline && <span className="text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Outline ready</span>}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">{idea.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{idea.primaryKeyword}</span>
                        <span>{idea.searchVolume.toLocaleString()} vol</span>
                        <span className={`font-semibold ${difficultyColor(idea.difficulty)}`}>KD {idea.difficulty}</span>
                        <span>{idea.estimatedLength.toLocaleString()} words</span>
                        <span className="text-slate-400">{idea.project.industry}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handlePin(idea)}
                        title={idea.pinned ? 'Unpin' : 'Pin'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={idea.pinned ? 'text-amber-500' : 'text-slate-400'}>
                          <path d="M7 1v8M4 9l3 4 3-4M3 5h8"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Idea detail modal */}
      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={handleIdeaUpdate}
        />
      )}
    </div>
  )
}
