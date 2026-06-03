'use client'

import { useState } from 'react'
import { Button, Card, EmptyState, LockedState } from '@/components/ui'
import { exportTrackerCSV, exportTrackerPDF } from '@/lib/export'

export function TrackerClient({ unlocked = true }: { unlocked?: boolean }) {
  const [pageUrl, setPageUrl] = useState('')
  const [queries, setQueries] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    overall_citation_score: number; verdict: string
    results: Array<{ query: string; simulated_ai_response: string; citation_likelihood: number; citation_verdict: string; reasons_for_citation: string[]; reasons_against_citation: string[]; what_would_increase_citation: string; chatgpt_vs_perplexity: string }>
  } | null>(null)
  const [error, setError] = useState('')

  if (!unlocked) return <LockedState tool="Cite Tracker" plan="Agency" />

  const verdictConfig = {
    likely:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Likely Cited ✓' },
    possible: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500',   label: 'Possibly Cited ~' },
    unlikely: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     bar: 'bg-red-500',     label: 'Unlikely Cited ✗' },
  }

  async function handleRun() {
    const content = (document.getElementById('tracker-content') as HTMLTextAreaElement)?.value ?? ''
    const queryList = queries.split('\n').map(q => q.trim()).filter(Boolean)
    if (!content || content.length < 50) { setError('Paste your content first'); return }
    if (!queryList.length) { setError('Enter at least one query'); return }

    setLoading(true); setError('')
    try {
      const r = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, pageUrl, queries: queryList }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResult(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tracker failed')
    } finally { setLoading(false) }
  }

  const overall = result?.overall_citation_score ?? 0
  const overallColor = overall >= 70 ? 'text-emerald-600' : overall >= 45 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h1 className="text-base font-black">Cite Tracker</h1>
            <p className="text-xs text-slate-500">Simulate ChatGPT & Perplexity responses — check if your content gets cited</p>
          </div>
          <Button className="ml-auto" onClick={handleRun} loading={loading}>Run Citation Check</Button>
        </div>

        <div className="space-y-3">
          <input type="url" value={pageUrl} onChange={e => setPageUrl(e.target.value)}
            placeholder="https://your-site.com/your-article (optional)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <textarea id="tracker-content" rows={4} placeholder="Paste your article content here…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <textarea value={queries} onChange={e => setQueries(e.target.value)} rows={4}
            placeholder={"Enter one query per line:\nbest dental clinic in Austin TX\naffordable dentist near me Austin\ntop-rated dentist Austin Texas"}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {result && (
          <div className="fade-up space-y-4">
            <Card className="flex items-center gap-5">
              <div className="text-center flex-shrink-0">
                <div className={`text-5xl font-black ${overallColor}`}>{overall}</div>
                <div className="text-xs text-slate-400 mt-1">Citation Score</div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-3">{result.verdict}</p>
                <div className="flex gap-5">
                  {(['likely', 'possible', 'unlikely'] as const).map(v => {
                    const count = result.results?.filter(r => r.citation_verdict === v).length ?? 0
                    const cfg = verdictConfig[v]
                    return <div key={v} className="text-center">
                      <div className={`text-xl font-black ${cfg.text}`}>{count}</div>
                      <div className={`text-xs font-bold ${cfg.text} capitalize`}>{v}</div>
                    </div>
                  })}
                </div>
              </div>
            </Card>

            {(result.results ?? []).map((r, i) => {
              const vc = verdictConfig[r.citation_verdict as keyof typeof verdictConfig] ?? verdictConfig.unlikely
              return (
                <div key={i} className={`rounded-2xl border p-4 ${vc.bg} ${vc.border}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-bold text-sm">{r.query}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-black text-xl ${vc.text}`}>{r.citation_likelihood}</span>
                      <span className={`text-xs font-bold ${vc.text}`}>{vc.label}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/70 mb-3 overflow-hidden">
                    <div className={`h-full rounded-full ${vc.bar}`} style={{ width: `${r.citation_likelihood}%` }} />
                  </div>
                  <div className={`rounded-lg bg-white/60 border border-white/80 p-3 mb-3`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${vc.text} mb-1`}>Simulated AI Response</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.simulated_ai_response}</p>
                  </div>
                  {(r.reasons_for_citation?.length || r.reasons_against_citation?.length) ? (
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">For Citation</div>
                        {r.reasons_for_citation?.map((rf, j) => <div key={j} className="text-xs text-slate-600 flex gap-1 mb-1"><span className="text-emerald-500">+</span>{rf}</div>)}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Against</div>
                        {r.reasons_against_citation?.map((ra, j) => <div key={j} className="text-xs text-slate-600 flex gap-1 mb-1"><span className="text-red-500">−</span>{ra}</div>)}
                      </div>
                    </div>
                  ) : null}
                  {r.what_would_increase_citation && <p className="text-xs text-slate-600">💡 Fix: {r.what_would_increase_citation}</p>}
                </div>
              )
            })}
          </div>
        )}
        {result && (
          <div style={{display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap'}}>
            <button onClick={() => exportTrackerCSV(result)} style={{padding:'7px 14px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>⬇ CSV</button>
            <button onClick={() => exportTrackerPDF(result)} style={{padding:'7px 14px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>⬇ PDF</button>
          </div>
        )}
        {!result && !loading && <EmptyState icon="🎯" title="Cite Tracker" desc="Paste your content, add your target queries, and run to see if ChatGPT and Perplexity would cite you." />}
      </div>
    </div>
  )
}
