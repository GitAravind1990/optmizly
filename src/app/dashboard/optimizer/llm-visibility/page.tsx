'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Analysis = {
  id: string
  websiteUrl: string
  domain: string
  llmVisibilityScore: number
  semanticRelevance: number
  retrievalLikelihood: number
  contentStructure: number
  answerability: number
  technicalAccess: number
  pagesAnalyzed: number
  totalWords: number
  topicsFound: number
  entitiesFound: number
  faqSections: number
  criticalGaps: string[]
  opportunities: string[]
  queryTestCount: number
  createdAt: string
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBg(score: number) {
  if (score >= 75) return 'bg-green-50 border-green-200'
  if (score >= 50) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Strong AI answer retrieval'
  if (score >= 50) return 'Moderate — Room for improvement'
  return 'Low — Needs optimization'
}

function AnalysisCard({ a, onDelete }: { a: Analysis; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tools/llm-visibility/${a.id}`, { method: 'DELETE' })
    onDelete(a.id)
  }

  return (
    <div className={`rounded-xl border p-5 ${scoreBg(a.llmVisibilityScore)}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-bold text-slate-800 text-base">{a.domain}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {a.pagesAnalyzed} pages · {a.totalWords.toLocaleString()} words · {a.queryTestCount} queries tested
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {new Date(a.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${scoreColor(a.llmVisibilityScore)}`}>
            {a.llmVisibilityScore}
          </div>
          <div className="text-xs text-slate-500">/ 100</div>
          <div className={`text-xs font-medium mt-1 ${scoreColor(a.llmVisibilityScore)}`}>
            {scoreLabel(a.llmVisibilityScore)}
          </div>
        </div>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Semantic', value: a.semanticRelevance },
          { label: 'Retrieval', value: a.retrievalLikelihood },
          { label: 'Structure', value: a.contentStructure },
          { label: 'Answerability', value: a.answerability },
          { label: 'Technical', value: a.technicalAccess },
        ].map(item => (
          <div key={item.label} className="text-center bg-white rounded-lg p-2 border border-slate-100">
            <div className={`text-lg font-bold ${scoreColor(item.value)}`}>{item.value}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Critical Gaps */}
      {a.criticalGaps.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="text-xs font-bold text-red-700 mb-1">🚨 Critical Issues</div>
          <ul className="space-y-1">
            {a.criticalGaps.slice(0, 3).map((gap, i) => (
              <li key={i} className="text-xs text-red-600">• {gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable Opportunities */}
      {expanded && a.opportunities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <div className="text-xs font-bold text-blue-700 mb-1">💡 Quick Wins</div>
          <ul className="space-y-1">
            {a.opportunities.slice(0, 3).map((opp, i) => (
              <li key={i} className="text-xs text-blue-700">💡 {opp}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
        <Link
          href={`/dashboard/optimizer/llm-visibility/${a.id}`}
          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-medium"
        >
          📊 Full Report
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

export default function LLMVisibilityPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/tools/llm-visibility')
    const d = await r.json()
    if (Array.isArray(d)) setAnalyses(d)
    setLoading(false)
  }

  async function analyze() {
    if (!websiteUrl.trim()) { setError('Please enter a website URL'); return }
    setError('')
    setAnalyzing(true)
    try {
      const r = await fetch('/api/tools/llm-visibility/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setShowForm(false)
      setWebsiteUrl('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  function removeAnalysis(id: string) {
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            🤖 LLM Visibility Analyzer
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">PRO</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">AGENCY</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Predict how likely your content is to be retrieved by AI language models
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 transition-colors"
        >
          {showForm ? '✕ Cancel' : '🔍 Analyze Website'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-1">Analyze Website for AI Visibility</h2>
          <p className="text-xs text-slate-500 mb-4">
            Analyzes how likely your content is to be retrieved by AI language models (ChatGPT, Claude, Gemini, etc)
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              onKeyDown={e => e.key === 'Enter' && analyze()}
            />
            <button
              onClick={analyze}
              disabled={analyzing}
              className="px-5 py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 disabled:opacity-60 transition-colors min-w-[130px]"
            >
              {analyzing ? '⏳ Analyzing...' : '🔍 Start Analysis'}
            </button>
          </div>
          {analyzing && (
            <p className="text-xs text-slate-400 mt-2">Crawling website and calculating LLM retrieval scores (~30 sec)...</p>
          )}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading analyses...</div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🤖</div>
          <div className="text-lg font-bold text-slate-700">No analyses yet</div>
          <div className="text-sm text-slate-400 mt-1">
            Analyze your website to see how visible it is to AI language models
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 transition-colors"
          >
            🔍 Analyze Your First Website
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map(a => (
            <AnalysisCard key={a.id} a={a} onDelete={removeAnalysis} />
          ))}
        </div>
      )}
    </div>
  )
}
