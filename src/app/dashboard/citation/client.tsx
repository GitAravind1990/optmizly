'use client'

import { useState, useCallback } from 'react'
import { exportCitationCSV, exportCitationPDF, exportQueriesCSV, exportQueriesPDF } from '@/lib/export'
import { Card, Badge, Button, Spinner, EmptyState, LockedState } from '@/components/ui'
import { useContent } from '@/context/ContentContext'

type Tab = 'citation' | 'queries'

type CitationData = { summary: string; plan: Array<{ title: string; action: string; why: string; impact: string; effort: string }> }
type QueriesData  = { summary: string; queries: Array<{ query: string; intent: string; coverage: string; why: string; fix: string }> }

export function CitationClient({ unlocked }: { unlocked: boolean }) {
  const { content, analysisResult, toolResults, setToolResult } = useContent()
  const [tab, setTab]       = useState<Tab>('citation')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const citationData = toolResults['citation'] as CitationData | undefined
  const queriesData  = toolResults['queries']  as QueriesData  | undefined

  const handleRun = useCallback(async () => {
    if (content.length < 50) { setError('Paste content and run an analysis first'); return }
    setLoading(true); setError('')
    const summary = analysisResult?.summary ?? ''
    const body = JSON.stringify({ content, summary })
    try {
      const [citRes, qRes] = await Promise.all([
        fetch('/api/citation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
        fetch('/api/queries',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      ])
      const [citData, qData] = await Promise.all([citRes.json(), qRes.json()])
      if (!citRes.ok) throw new Error(citData.error)
      if (!qRes.ok)   throw new Error(qData.error)
      setToolResult('citation', citData)
      setToolResult('queries',  qData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tool failed')
    } finally { setLoading(false) }
  }, [content, analysisResult, setToolResult])

  if (!unlocked) return <LockedState tool="AI Visibility" plan="Pro" />

  const hasResults = citationData || queriesData

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔭</span>
          <div>
            <h1 className="text-base font-black">AI Visibility</h1>
            <p className="text-xs text-slate-500">Citation strategy + AI query mapping — get cited by ChatGPT, Perplexity & Google AI Overviews</p>
          </div>
          <Button className="ml-auto" onClick={handleRun} loading={loading}>
            {loading ? 'Running…' : 'Run AI Visibility'}
          </Button>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {hasResults && (
          <div className="flex gap-1 border-b border-slate-200">
            {([['citation', '📎 Citation Plan'], ['queries', '🔎 AI Queries']] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {hasResults ? (
          <div className="fade-up">
            {tab === 'citation' && citationData && (
              <div className="space-y-3">
                {citationData.summary && <Card className="bg-slate-50"><p className="text-sm text-slate-600">{citationData.summary}</p></Card>}
                {(citationData.plan ?? []).map((item, i) => (
                  <Card key={i}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-bold text-sm">{item.title}</span>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Badge variant={item.impact === 'high' ? 'green' : item.impact === 'medium' ? 'amber' : 'gray'}>{item.impact}</Badge>
                        <Badge variant="gray">{item.effort}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{item.action}</p>
                    {item.why && <p className="text-xs text-slate-400">{item.why}</p>}
                  </Card>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={() => exportCitationCSV(citationData)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>⬇ CSV</button>
                  <button onClick={() => exportCitationPDF(citationData)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>⬇ PDF</button>
                </div>
              </div>
            )}
            {tab === 'queries' && queriesData && (
              <div className="space-y-3">
                {queriesData.summary && <Card className="bg-slate-50"><p className="text-sm text-slate-600">{queriesData.summary}</p></Card>}
                {(queriesData.queries ?? []).map((q, i) => (
                  <Card key={i}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-bold text-sm">{q.query}</span>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Badge variant={q.coverage === 'strong' ? 'green' : q.coverage === 'partial' ? 'amber' : 'red'}>{q.coverage}</Badge>
                        <Badge variant="gray">{q.intent}</Badge>
                      </div>
                    </div>
                    {q.why && <p className="text-xs text-slate-500 mb-1">{q.why}</p>}
                    {q.fix && <p className="text-xs text-blue-600">Fix: {q.fix}</p>}
                  </Card>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={() => exportQueriesCSV(queriesData)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>⬇ CSV</button>
                  <button onClick={() => exportQueriesPDF(queriesData)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>⬇ PDF</button>
                </div>
              </div>
            )}
            <Button variant="secondary" size="sm" className="mt-4" onClick={handleRun} loading={loading}>↺ Run Again</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400"><Spinner /><span className="text-sm">Running both analyses…</span></div>
        ) : (
          <EmptyState icon="🔭" title="Run AI Visibility" desc='Click "Run AI Visibility" above to get your citation strategy and AI query map in one go.' />
        )}
      </div>
    </div>
  )
}
