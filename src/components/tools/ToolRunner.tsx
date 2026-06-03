'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useContent } from '@/context/ContentContext'

type AnalysisResult = {
  overall_score: number; grade: string; summary: string
  scores: Record<string, number>
  top_issues: Array<{ issue: string; category: string; impact: string; fix: string }>
  entity_gaps: string[]; quick_wins: string[]; llm_citation_tip: string; plan?: string
}

interface ToolRunnerProps {
  onResult?: (result: AnalysisResult, content: string) => void
}

export function ToolRunner({ onResult }: ToolRunnerProps) {
  const { content, setContent } = useContent()
  const [urlInput, setUrlInput] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [error, setError] = useState('')

  const runAnalysis = useCallback(async (contentToAnalyse?: string) => {
    const c = contentToAnalyse ?? content
    if (!c || c.length < 50) { setError('Paste some content first'); return }
    setAnalyseLoading(true); setError('')
    try {
      const r = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: c }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onResult?.(d, c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally { setAnalyseLoading(false) }
  }, [content, onResult])

  const fetchAndAnalyse = useCallback(async () => {
    if (!urlInput.trim()) return
    setFetchLoading(true); setError('')
    try {
      const r = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setContent(d.content)
      await runAnalysis(d.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch URL')
    } finally { setFetchLoading(false) }
  }, [urlInput, setContent, runAnalysis])

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-4 space-y-3">
      <div className="flex gap-2">
        <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchAndAnalyse()}
          placeholder="🔗 Paste a URL to fetch & analyse automatically"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <Button onClick={fetchAndAnalyse} loading={fetchLoading} variant="amber">
          Fetch &amp; Analyse
        </Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex-1 h-px bg-slate-100" /><span>or paste text below</span><div className="flex-1 h-px bg-slate-100" />
      </div>
      <div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Paste your article, blog post, or page content here…"
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{content.length} characters</span>
          <Button onClick={() => runAnalysis()} loading={analyseLoading} size="sm">Analyse →</Button>
        </div>
      </div>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}
    </div>
  )
}
