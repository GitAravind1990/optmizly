'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Keyword = { keyword: string; position: number; volume: number; traffic: number }
type BacklinkSource = { domain: string; links: number; da: number }
type Page = { title: string; url: string; traffic: number }
type GapKeyword = { keyword: string; volume: number; difficulty: number }
type ContentOpp = { title: string; opportunity: string; traffic: number }

type Analysis = {
  id: string
  domainUrl: string
  domainName: string
  estimatedTraffic: number
  domainAuthority: number
  pageAuthority: number
  backlinksTotal: number
  backlinksNew: number
  topKeywords: string
  keywordCount: number
  topPages: string
  topBacklinks: string
  gapKeywords: string
  contentOpps: string
  aiInsights: string | null
  createdAt: string
}

function diffBadge(d: number) {
  const color = d < 40 ? 'bg-green-100 text-green-700' : d < 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{d}</span>
}

function AnalysisCard({ analysis, onDelete }: { analysis: Analysis; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const keywords: Keyword[] = JSON.parse(analysis.topKeywords || '[]')
  const backlinks: BacklinkSource[] = JSON.parse(analysis.topBacklinks || '[]')
  const pages: Page[] = JSON.parse(analysis.topPages || '[]')
  const gaps: GapKeyword[] = JSON.parse(analysis.gapKeywords || '[]')
  const opps: ContentOpp[] = JSON.parse(analysis.contentOpps || '[]')
  const insights = analysis.aiInsights ? JSON.parse(analysis.aiInsights) : null
  const threatColor = insights?.threatLevel === 'high' ? 'text-red-600' : insights?.threatLevel === 'medium' ? 'text-amber-600' : 'text-green-600'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{analysis.domainName}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{analysis.domainUrl} · Analyzed {new Date(analysis.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {insights?.threatLevel && (
            <span className={`text-xs font-bold uppercase ${threatColor}`}>{insights.threatLevel} threat</span>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Monthly Traffic', value: analysis.estimatedTraffic.toLocaleString(), bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Domain Authority', value: analysis.domainAuthority.toString(), bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Backlinks', value: analysis.backlinksTotal.toLocaleString(), bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Keywords Ranked', value: analysis.keywordCount.toLocaleString(), bg: 'bg-purple-50', text: 'text-purple-600' },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-lg p-3 text-center`}>
            <div className={`text-xl font-black ${m.text}`}>{m.value}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Top keywords */}
      <div className="mb-3">
        <div className="text-xs font-bold text-slate-500 mb-1.5">Top Keywords</div>
        <div className="flex flex-wrap gap-1.5">
          {keywords.slice(0, 10).map((k, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{k.keyword}</span>
          ))}
        </div>
      </div>

      {/* Top backlink sources */}
      <div className="mb-4">
        <div className="text-xs font-bold text-slate-500 mb-1.5">Top Backlink Sources</div>
        <div className="flex flex-wrap gap-2">
          {backlinks.slice(0, 5).map((b, i) => (
            <span key={i} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {b.domain} <span className="text-slate-400">· {b.links}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
        <div className="text-xs font-bold text-green-700 mb-1">Opportunities Found</div>
        <p className="text-xs text-green-800">
          <span className="font-bold">{gaps.length} gap keywords</span> to target
          {' + '}<span className="font-bold">{opps.length} content gaps</span> identified
        </p>
        {insights?.topOpportunity && (
          <p className="text-xs text-green-700 mt-1.5 italic">"{insights.topOpportunity}"</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {expanded ? 'Hide Details' : 'Quick View'}
        </button>
        <Link
          href={`/dashboard/competitor-spy/${analysis.id}`}
          className="px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors"
        >
          Full Analysis
        </Link>
      </div>

      {/* Expandable quick-view */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">Top Pages</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {pages.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span className="truncate flex-1">{p.title}</span>
                  <span className="text-blue-500 font-semibold ml-2">{p.traffic.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">Gap Keywords</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {gaps.map((g, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate flex-1">{g.keyword}</span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-slate-400">{g.volume.toLocaleString()}</span>
                    {diffBadge(g.difficulty)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">Content Gaps</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {opps.map((o, i) => (
                <div key={i} className="text-xs bg-amber-50 rounded-lg p-2">
                  <div className="font-semibold text-slate-800 leading-tight">{o.title}</div>
                  <div className="text-amber-700 mt-0.5">{o.traffic.toLocaleString()} est. traffic</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompetitorSpyPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [domainUrl, setDomainUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tools/competitor-spy')
    if (res.ok) setAnalyses(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/tools/competitor-spy/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainUrl: domainUrl.replace(/^https?:\/\//, '').replace(/^www\./, '') }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Analysis failed'); return }
      setDomainUrl('')
      setShowForm(false)
      load()
    } catch {
      setError('Network error')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this competitor analysis?')) return
    await fetch('/api/tools/competitor-spy', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId: id }),
    })
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900">Competitor SEO Spy</h1>
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">PRO/AGENCY</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Uncover competitor traffic, keywords, backlinks, and content gaps</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            {showForm ? 'Cancel' : 'Analyze Competitor'}
          </button>
        </div>

        {/* Analyze form */}
        {showForm && (
          <form onSubmit={handleAnalyze} className="mb-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">Analyze a Competitor</h2>
            {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  required
                  value={domainUrl}
                  onChange={e => setDomainUrl(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="ahrefs.com"
                />
                <p className="text-xs text-slate-400 mt-1">Enter domain without http:// or www.</p>
              </div>
              <button
                type="submit"
                disabled={analyzing}
                className="px-5 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analyzing... (~20s)
                  </>
                ) : 'Start Analysis'}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading analyses...</div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-600 font-medium">No competitor analyses yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "Analyze Competitor" to spy on any domain</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map(a => (
              <AnalysisCard key={a.id} analysis={a} onDelete={() => handleDelete(a.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
