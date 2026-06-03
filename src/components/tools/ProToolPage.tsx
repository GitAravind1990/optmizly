'use client'

import { useState, useCallback, ReactNode } from 'react'
import { Button, Card, Spinner, EmptyState, LockedState } from '@/components/ui'
import { useContent } from '@/context/ContentContext'

interface ProToolPageProps {
  toolId: string
  title: string
  icon: string
  description: string
  plan: 'Pro' | 'Agency'
  unlocked: boolean
  extraInputs?: ReactNode
  getBody: (content: string, summary: string) => Record<string, unknown>
  renderResult: (data: Record<string, unknown>) => ReactNode
  needsContent?: boolean
}

export function ProToolPage({
  toolId, title, icon, description, plan, unlocked,
  extraInputs, getBody, renderResult, needsContent = true
}: ProToolPageProps) {
  const { content, analysisResult, toolResults, setToolResult } = useContent()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cached = toolResults[toolId] as Record<string, unknown> | undefined

  const handleRun = useCallback(async () => {
    if (needsContent && content.length < 50) { setError('Paste content and run an analysis first'); return }
    setLoading(true); setError('')
    try {
      const summary = analysisResult?.summary ?? ''
      const r = await fetch(`/api/${toolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getBody(content, summary)),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setToolResult(toolId, d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tool failed')
    } finally { setLoading(false) }
  }, [toolId, content, analysisResult, getBody, needsContent, setToolResult])

  if (!unlocked) return <LockedState tool={title} plan={plan} />

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h1 className="text-base font-black">{title}</h1>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <Button className="ml-auto" onClick={handleRun} loading={loading}>
            {loading ? 'Running…' : `Run ${title}`}
          </Button>
        </div>

        {extraInputs}

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {cached ? (
          <div className="fade-up">
            {renderResult(cached)}
            <Button variant="secondary" size="sm" className="mt-4" onClick={handleRun} loading={loading}>
              ↺ Run Again
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Spinner /><span className="text-sm">Analysing…</span>
          </div>
        ) : (
          <EmptyState icon={icon} title={`Run ${title}`} desc={`Click "Run ${title}" above to get AI-powered ${title.toLowerCase()} analysis.`} />
        )}
      </div>
    </div>
  )
}
