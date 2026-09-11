'use client'

import { useState, useCallback, ReactNode } from 'react'
import { Button, Card, Spinner, EmptyState, LockedState } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { UpgradeModal } from '@/components/upgrade-modal'

interface ProToolPageProps {
  toolId: string
  title: string
  icon?: string
  description: string
  plan: 'Pro' | 'Agency'
  unlocked: boolean
  extraInputs?: ReactNode
  getBody: (content: string, summary: string) => Record<string, unknown>
  renderResult: (data: Record<string, unknown>) => ReactNode
  needsContent?: boolean
  /**
   * Optional first request, whose result is merged into the main POST body.
   *
   * Exists so a tool whose slow half is a vendor call can pay for that in its own request
   * instead of holding one long POST open. Clerk's session token expires 61s after minting and
   * a POST cannot be refreshed, so a single request doing both can be rejected *after* the work
   * completes — the route never sees that 401, so it cannot refund the unit it charged.
   *
   * Return null to skip it. Errors propagate to the same banner as the main request.
   */
  prepare?: (content: string, summary: string) => Promise<Record<string, unknown> | null>
  /** Shown while `prepare` runs, since it can be the longer of the two. */
  prepareLabel?: string
}

export function ProToolPage({
  toolId, title, icon, description, plan, unlocked,
  extraInputs, getBody, renderResult, needsContent = true,
  prepare, prepareLabel
}: ProToolPageProps) {
  const { content, analysisResult, toolResults, setToolResult } = useContent()
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<'prepare' | 'main'>('main')
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const cached = toolResults[toolId] as Record<string, unknown> | undefined

  const handleRun = useCallback(async () => {
    if (needsContent && content.length < 50) { setError('Paste content and run an analysis first'); return }
    setLoading(true); setError('')
    try {
      const summary = analysisResult?.summary ?? ''

      // The prepared half first, so each request stays short. Its result is merged into the
      // body below rather than re-derived server-side — re-deriving would restore the single
      // long request this split exists to avoid, and would pay the vendor twice.
      let prepared: Record<string, unknown> | null = null
      if (prepare) {
        setStage('prepare')
        prepared = await prepare(content, summary)
      }

      setStage('main')
      const r = await fetch(`/api/${toolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getBody(content, summary), ...(prepared ?? {}) }),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setToolResult(toolId, d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tool failed')
    } finally { setLoading(false); setStage('main') }
  }, [toolId, content, analysisResult, getBody, needsContent, setToolResult, prepare])

  if (!unlocked) return <LockedState tool={title} plan={plan} />

  return (
    <>
    {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
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
            <Spinner />
            <span className="text-sm">
              {stage === 'prepare' && prepareLabel ? prepareLabel : 'Analysing…'}
            </span>
          </div>
        ) : (
          <EmptyState icon={icon} title={`Run ${title}`} desc={`Click "Run ${title}" above to get AI-powered ${title.toLowerCase()} analysis.`} />
        )}
      </div>
    </div>
    </>
  )
}
