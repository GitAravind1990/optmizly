'use client'

import { useState, useEffect } from 'react'
import { exportOnPageCSV, exportOnPagePDF } from '@/lib/export'
import { UpgradeModal } from '@/components/upgrade-modal'

type Fix = {
  category: string
  priority: 'high' | 'medium' | 'low'
  issue: string
  suggestion: string
  before?: string
  after?: string
}

type Analysis = {
  id: string
  targetKeyword: string
  pageUrl?: string
  pageTitle?: string
  overallScore: number
  previousScore?: number
  wordCount: number
  keywordScore: number
  headerScore: number
  metaScore: number
  imageScore: number
  linkScore: number
  readabilityScore: number
  keywordDensity: number
  keywordCount: number
  keywordData: { count: number; density: number; inFirstParagraph: boolean; inLastParagraph: boolean; issues: string[] }
  headers: { h1: string[]; h2: string[]; h3: string[]; hasKeywordInH1: boolean; issues: string[] }
  metaTags: { title?: string; description?: string; titleHasKeyword: boolean; descHasKeyword: boolean; issues: string[] }
  images: { total: number; withAlt: number; withKeywordInAlt: number; issues: string[] }
  links: { internal: number; external: number; issues: string[] }
  readabilityData: { avgSentenceLength: number; paragraphCount: number; issues: string[] }
  fixes: Fix[]
  appliedFixes: number[]
  analyzedAt: string
}

type AnalysisSummary = {
  id: string
  targetKeyword: string
  pageUrl?: string
  pageTitle?: string
  overallScore: number
  previousScore?: number
  wordCount: number
  keywordScore: number
  headerScore: number
  metaScore: number
  imageScore: number
  linkScore: number
  readabilityScore: number
  analyzedAt: string
}

const CATEGORY_INFO = [
  { key: 'keywordScore', label: 'Keyword', weight: '25%' },
  { key: 'headerScore', label: 'Headers', weight: '20%' },
  { key: 'metaScore', label: 'Meta Tags', weight: '20%' },
  { key: 'imageScore', label: 'Images', weight: '10%' },
  { key: 'linkScore', label: 'Links', weight: '10%' },
  { key: 'readabilityScore', label: 'Readability', weight: '15%' },
]

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function scoreBar(score: number) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function priorityBadge(p: string) {
  if (p === 'high') return 'bg-red-100 text-red-700'
  if (p === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

export default function OnPagePage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [current, setCurrent] = useState<Analysis | null>(null)
  const [view, setView] = useState<'list' | 'analyze' | 'result'>('list')

  // Form state
  const [content, setContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [reanalyzeId, setReanalyzeId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // UI state
  const [expandedFix, setExpandedFix] = useState<number | null>(null)
  const [applyingFix, setApplyingFix] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadAnalyses() }, [])

  async function loadAnalyses() {
    const r = await fetch('/api/tools/onpage')
    const d = await r.json()
    if (d.data) setAnalyses(d.data)
  }

  async function loadAnalysis(id: string) {
    const r = await fetch(`/api/tools/onpage?id=${id}`)
    const d = await r.json()
    if (d.data) { setCurrent(d.data); setView('result') }
  }

  async function runAnalysis() {
    if (!content.trim() || !keyword.trim()) { setError('Content and target keyword are required.'); return }
    setError('')
    setAnalyzing(true)
    try {
      const body: Record<string, string> = { content, targetKeyword: keyword }
      if (pageUrl) body.pageUrl = pageUrl
      if (pageTitle) body.pageTitle = pageTitle
      if (reanalyzeId) body.previousAnalysisId = reanalyzeId

      const r = await fetch('/api/tools/onpage/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setCurrent(d.data)
      setView('result')
      setReanalyzeId(null)
      loadAnalyses()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function applyFix(fixIndex: number) {
    if (!current) return
    setApplyingFix(fixIndex)
    try {
      const r = await fetch('/api/tools/onpage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: current.id, fixIndex }),
      })
      const d = await r.json()
      if (d.data) setCurrent(prev => prev ? { ...prev, appliedFixes: d.data.appliedFixes } : prev)
    } finally {
      setApplyingFix(null)
    }
  }

  async function deleteAnalysis(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/tools/onpage?id=${id}`, { method: 'DELETE' })
      setAnalyses(prev => prev.filter(a => a.id !== id))
      if (current?.id === id) { setCurrent(null); setView('list') }
    } finally {
      setDeleting(null)
    }
  }

  function startReanalyze(a: AnalysisSummary) {
    setContent('')
    setKeyword(a.targetKeyword)
    setPageUrl(a.pageUrl ?? '')
    setPageTitle(a.pageTitle ?? '')
    setReanalyzeId(a.id)
    setView('analyze')
  }

  function startNew() {
    setContent(''); setKeyword(''); setPageUrl(''); setPageTitle(''); setReanalyzeId(null)
    setError(''); setView('analyze')
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">On-Page SEO Analyzer</h1>
            <p className="text-sm text-slate-500 mt-0.5">Analyze content for keyword usage, headers, meta tags, images, links, and readability</p>
          </div>
          <button
            onClick={startNew}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            + New Analysis
          </button>
        </div>

        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
                <rect x="4" y="2" width="14" height="18" rx="2"/><line x1="7" y1="7" x2="15" y2="7"/><line x1="7" y1="11" x2="15" y2="11"/><line x1="7" y1="15" x2="11" y2="15"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-700">No analyses yet</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Paste your content and a target keyword to get started</p>
            <button onClick={startNew} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Analyze Content
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(a => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Score circle */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-full border-2 flex items-center justify-center ${scoreBg(a.overallScore)}`}>
                    <span className={`text-lg font-bold ${scoreColor(a.overallScore)}`}>{a.overallScore}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{a.targetKeyword}</div>
                        {a.pageUrl && <div className="text-xs text-slate-400 truncate">{a.pageUrl}</div>}
                        {a.pageTitle && <div className="text-xs text-slate-500 truncate">{a.pageTitle}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {a.previousScore !== undefined && a.previousScore !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.overallScore > a.previousScore ? 'bg-green-100 text-green-700' : a.overallScore < a.previousScore ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.overallScore > a.previousScore ? '▲' : a.overallScore < a.previousScore ? '▼' : '='} {Math.abs(a.overallScore - a.previousScore)} pts
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{a.wordCount.toLocaleString()} words</span>
                      </div>
                    </div>

                    {/* Category scores */}
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {CATEGORY_INFO.map(c => (
                        <div key={c.key} className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">{c.label.slice(0,3)}</span>
                          <span className={`text-xs font-semibold ${scoreColor(a[c.key as keyof AnalysisSummary] as number)}`}>
                            {a[c.key as keyof AnalysisSummary]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => loadAnalysis(a.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => startReanalyze(a)}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Re-analyze
                    </button>
                    <button
                      onClick={() => deleteAnalysis(a.id)}
                      disabled={deleting === a.id}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 disabled:opacity-50"
                    >
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

  // ── ANALYZE FORM VIEW ──────────────────────────────────────────────────────
  if (view === 'analyze') {
    return (
      <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {reanalyzeId ? 'Re-analyze Content' : 'New Analysis'}
            </h1>
            {reanalyzeId && <p className="text-sm text-slate-500 mt-0.5">Paste updated content to track score improvement</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Keyword *</label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. best SEO tools 2025"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page URL (optional)</label>
              <input
                value={pageUrl}
                onChange={e => setPageUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page Title (optional)</label>
            <input
              value={pageTitle}
              onChange={e => setPageTitle(e.target.value)}
              placeholder="Your page <title> tag content"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Content (Markdown or plain text) *
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Include your full page content. Use # for H1, ## for H2, ### for H3. Add meta tags as &lt;meta name="description" content="..."&gt;, images as ![alt](url), and links as [text](url).
            </p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={16}
              placeholder={`# Your Page Title\n\n<meta name="description" content="Your meta description here">\n\nYour introduction paragraph with your target keyword...\n\n## Section Heading\n\nContent here with ![image description](image.jpg) and [internal link](/page)...`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
              <span className="text-xs text-slate-400">
                Tip: paste full HTML or markdown page content for best results
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={runAnalysis}
              disabled={analyzing || !content.trim() || !keyword.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Analyzing...
                </span>
              ) : 'Analyze Content'}
            </button>
            <button
              onClick={() => setView(analyses.length > 0 ? 'list' : 'list')}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      </>
    )
  }

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (!current) return null

  const appliedCount = current.appliedFixes.length
  const totalFixes = current.fixes.length
  const highPriorityFixes = current.fixes.filter(f => f.priority === 'high').length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{current.targetKeyword}</h1>
              {current.pageUrl && <div className="text-xs text-slate-400">{current.pageUrl}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportOnPageCSV(current)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Export CSV</button>
            <button onClick={() => exportOnPagePDF(current)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Export PDF</button>
            <button
              onClick={() => startReanalyze({ ...current, createdAt: '', version: 1 } as AnalysisSummary & { createdAt: string; version: number })}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              Re-analyze
            </button>
            <button
              onClick={startNew}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Overall score + delta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-xl border-2 p-5 text-center ${scoreBg(current.overallScore)}`}>
            <div className={`text-5xl font-black ${scoreColor(current.overallScore)}`}>{current.overallScore}</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Overall Score</div>
            {current.previousScore !== undefined && current.previousScore !== null && (
              <div className={`text-xs font-bold mt-1 ${current.overallScore > current.previousScore ? 'text-green-600' : current.overallScore < current.previousScore ? 'text-red-600' : 'text-slate-500'}`}>
                {current.overallScore > current.previousScore ? '▲' : current.overallScore < current.previousScore ? '▼' : '='} {Math.abs(current.overallScore - current.previousScore)} pts from previous
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">Fixes Progress</div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-black text-slate-800">{appliedCount}</span>
              <span className="text-slate-400 text-sm mb-1">/ {totalFixes} applied</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: totalFixes > 0 ? `${(appliedCount / totalFixes) * 100}%` : '0%' }}
              />
            </div>
            {highPriorityFixes > 0 && (
              <div className="text-xs text-red-600 mt-2">{highPriorityFixes} high-priority fix{highPriorityFixes > 1 ? 'es' : ''} remaining</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-700 mb-2">Content Stats</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Word count</span>
                <span className="font-semibold">{current.wordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Keyword count</span>
                <span className="font-semibold">{current.keywordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Keyword density</span>
                <span className="font-semibold">{current.keywordDensity}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category scores */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Category Scores</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORY_INFO.map(c => {
              const score = current[c.key as keyof Analysis] as number
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {c.label}
                    </span>
                    <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${scoreBar(score)}`} style={{ width: `${score}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400">Weight: {c.weight}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Keyword details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Keyword Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Occurrences', value: current.keywordData.count },
              { label: 'Density', value: `${current.keywordData.density}%` },
              { label: 'In opening', value: current.keywordData.inFirstParagraph ? 'Yes' : 'No' },
              { label: 'In closing', value: current.keywordData.inLastParagraph ? 'Yes' : 'No' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="font-bold text-slate-800 mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
          {current.keywordData.issues.length > 0 && (
            <ul className="space-y-1">
              {current.keywordData.issues.map((iss, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />{iss}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Headers */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Header Structure</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">H1 tags</div>
              <div className="font-bold text-slate-800 mt-0.5">{current.headers.h1.length}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">H2 tags</div>
              <div className="font-bold text-slate-800 mt-0.5">{current.headers.h2.length}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">H3 tags</div>
              <div className="font-bold text-slate-800 mt-0.5">{current.headers.h3.length}</div>
            </div>
          </div>
          {current.headers.h1.length > 0 && (
            <div className="mb-2 text-xs">
              <span className="text-slate-500">H1: </span>
              <span className="font-medium text-slate-700">{current.headers.h1[0]}</span>
              {!current.headers.hasKeywordInH1 && <span className="text-amber-600 ml-2">(keyword missing)</span>}
            </div>
          )}
          {current.headers.issues.map((iss, i) => (
            <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />{iss}
            </div>
          ))}
        </div>

        {/* Meta tags */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Meta Tags</h2>
          <div className="space-y-2 mb-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-1">Title tag</div>
              <div className="text-sm text-slate-800">{current.metaTags.title || <span className="text-slate-400 italic">Not found</span>}</div>
              {current.metaTags.title && (
                <div className="text-xs text-slate-400 mt-1">{current.metaTags.title.length} chars — {current.metaTags.titleHasKeyword ? 'keyword present' : 'keyword missing'}</div>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-1">Meta description</div>
              <div className="text-sm text-slate-800">{current.metaTags.description || <span className="text-slate-400 italic">Not found</span>}</div>
              {current.metaTags.description && (
                <div className="text-xs text-slate-400 mt-1">{current.metaTags.description.length} chars — {current.metaTags.descHasKeyword ? 'keyword present' : 'keyword missing'}</div>
              )}
            </div>
          </div>
          {current.metaTags.issues.map((iss, i) => (
            <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />{iss}
            </div>
          ))}
        </div>

        {/* Images & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Images</h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <div className="text-lg font-bold text-slate-800">{current.images.total}</div>
                <div className="text-[10px] text-slate-500">Total</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <div className="text-lg font-bold text-slate-800">{current.images.withAlt}</div>
                <div className="text-[10px] text-slate-500">With alt</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <div className="text-lg font-bold text-slate-800">{current.images.withKeywordInAlt}</div>
                <div className="text-[10px] text-slate-500">Keyword in alt</div>
              </div>
            </div>
            {current.images.issues.map((iss, i) => (
              <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />{iss}</div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Links</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <div className="text-lg font-bold text-slate-800">{current.links.internal}</div>
                <div className="text-[10px] text-slate-500">Internal</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <div className="text-lg font-bold text-slate-800">{current.links.external}</div>
                <div className="text-[10px] text-slate-500">External</div>
              </div>
            </div>
            {current.links.issues.map((iss, i) => (
              <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />{iss}</div>
            ))}
          </div>
        </div>

        {/* AI Fixes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">AI-Generated Fixes</h2>
            <span className="text-xs text-slate-400">{appliedCount}/{totalFixes} applied</span>
          </div>

          {totalFixes === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No fixes generated — content looks good!</div>
          ) : (
            <div className="space-y-3">
              {current.fixes.map((fix, i) => {
                const applied = current.appliedFixes.includes(i)
                const expanded = expandedFix === i
                return (
                  <div
                    key={i}
                    className={`rounded-lg border transition-colors ${applied ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityBadge(fix.priority)}`}>
                            {fix.priority}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{fix.category}</span>
                          {applied && <span className="text-[10px] font-bold text-green-600 uppercase">Applied</span>}
                        </div>
                        <div className="text-sm font-semibold text-slate-800">{fix.issue}</div>
                        <div className="text-xs text-slate-600 mt-1">{fix.suggestion}</div>

                        {(fix.before || fix.after) && expanded && (
                          <div className="mt-3 space-y-2">
                            {fix.before && (
                              <div>
                                <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Before</div>
                                <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 whitespace-pre-wrap font-mono text-red-800">{fix.before}</pre>
                              </div>
                            )}
                            {fix.after && (
                              <div>
                                <div className="text-[10px] font-bold text-green-600 uppercase mb-1">After</div>
                                <pre className="text-xs bg-green-50 border border-green-100 rounded p-2 whitespace-pre-wrap font-mono text-green-800">{fix.after}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {(fix.before || fix.after) && (
                          <button
                            onClick={() => setExpandedFix(expanded ? null : i)}
                            className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                          >
                            {expanded ? 'Hide' : 'View'}
                          </button>
                        )}
                        {!applied && (
                          <button
                            onClick={() => applyFix(i)}
                            disabled={applyingFix === i}
                            className="rounded border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {applyingFix === i ? '...' : 'Mark applied'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Re-analyze CTA */}
        {appliedCount > 0 && (
          <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-center">
            <div className="text-sm font-bold text-blue-800 mb-1">Applied {appliedCount} fix{appliedCount > 1 ? 'es' : ''}?</div>
            <p className="text-xs text-blue-600 mb-3">Update your content with the fixes, then re-analyze to track your score improvement.</p>
            <button
              onClick={() => startReanalyze(current as unknown as AnalysisSummary)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Re-analyze Updated Content →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
