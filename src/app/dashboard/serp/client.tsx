'use client'

import { useState } from 'react'
import { Button, Card, Badge, EmptyState } from '@/components/ui'
import { exportSerpCSV, exportSerpPDF } from '@/lib/export'
import { UpgradeModal } from '@/components/upgrade-modal'

const SEV_COLORS: Record<string, 'red' | 'amber' | 'blue' | 'green'> = { critical: 'red', high: 'amber', medium: 'blue', low: 'green' }
const ENTITY_COLORS: Record<string, string> = { target: 'text-blue-600', competitor1: 'text-red-600', competitor2: 'text-amber-600', competitor3: 'text-purple-600' }
const DIMS = ['domain_authority','local_signals','content_depth','eeat','backlinks','technical_health','brand_authority']
const DIM_LABELS = ['Domain Auth','Local Signals','Content Depth','E-E-A-T','Backlinks','Technical','Brand Auth']

export function SerpClient() {
  const [fields, setFields] = useState({ url: '', keyword: '', position: '', biztype: '', city: '' })
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  async function handleRun() {
    if (!fields.url || !fields.keyword) { setError('Enter Target URL and Keyword'); return }
    setLoading(true); setError('')
    try {
      setPhase('Phase 1: Analysing competitors…')
      const r = await fetch('/api/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      setPhase('Phase 2: Building recovery plan…')
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setResult(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SERP audit failed')
    } finally { setLoading(false); setPhase('') }
  }

  const r = result as {
    serp_overview?: { competition_level?: string; serp_features?: string[]; ymyl?: boolean }
    competitors?: Array<{ rank: number; url: string; authority: string; page_type: string; word_count: string; eeat: string; schema: string[] }>
    root_causes?: Array<{ dimension: string; diagnosis: string; severity: string }>
    gap_scores?: Record<string, Record<string, number>>
    action_plan?: { phase1?: Array<{ task: string; why: string; effort: string; impact: string; priority: string }>; phase2?: Array<{ task: string; why: string; effort: string; impact: string; priority: string }>; phase3?: Array<{ task: string; why: string; effort: string; impact: string; priority: string }> }
    rank_projection?: Array<{ month: string; position: number }>
    structural_recommendation?: { title: string; detail: string; tradeoffs: string }
  } | null

  return (
    <>
    {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div><h1 className="text-base font-black">SERP Competitor Audit</h1>
          <p className="text-xs text-slate-500">Deep competitive intelligence with root cause diagnosis and recovery plan</p></div>
          <Button className="ml-auto" onClick={handleRun} loading={loading}>{loading ? phase : 'Run SERP Audit'}</Button>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'url', label: 'Target URL', ph: 'e.g. austinhvac.com/ac-repair' },
              { id: 'keyword', label: 'Target Keyword', ph: 'e.g. best AC repair Austin TX' },
              { id: 'position', label: 'Current Position', ph: 'e.g. 24' },
              { id: 'biztype', label: 'Business Type', ph: 'e.g. HVAC Company, Dental Clinic' },
            ].map(f => (
              <div key={f.id}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{f.label}</label>
                <input value={(fields as Record<string,string>)[f.id]} onChange={e => setFields(p => ({ ...p, [f.id]: e.target.value }))}
                  placeholder={f.ph}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">City / Region (optional)</label>
              <input value={fields.city} onChange={e => setFields(p => ({ ...p, city: e.target.value }))}
                placeholder="e.g. Austin, TX"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {r && (
          <div className="fade-up space-y-5">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-800 to-amber-600 p-5 text-white">
              <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">SERP COMPETITOR AUDIT</div>
              <div className="text-xl font-black mb-1">{fields.keyword}</div>
              <div className="text-sm opacity-80 mb-3">{fields.url}{fields.city ? ` · ${fields.city}` : ''}</div>
              <div className="flex gap-3 flex-wrap">
                {[['Current Position', `#${fields.position || '?'}`], ['Competition', r.serp_overview?.competition_level ?? '—'], ['YMYL', r.serp_overview?.ymyl ? 'Yes' : 'No']].map(([l, v]) => (
                  <div key={l} className="bg-white/15 rounded-xl px-3 py-2">
                    <div className="text-[10px] opacity-70">{l}</div>
                    <div className="font-black text-sm">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitors */}
            {r.competitors?.length && (
              <Card>
                <h2 className="text-sm font-black mb-3">Top {r.competitors.length} Competitor Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100">
                      {['#','URL','Authority','Page Type','Content','E-E-A-T'].map(h => (
                        <th key={h} className="py-2 px-2 text-left font-bold text-slate-400">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {r.competitors.map(c => (
                        <tr key={c.rank} className="border-b border-slate-50">
                          <td className="py-2 px-2 font-black text-slate-400">{c.rank}</td>
                          <td className="py-2 px-2 max-w-[140px] truncate font-medium" title={c.url}>{c.url}</td>
                          <td className="py-2 px-2"><Badge variant={c.authority === 'high' ? 'green' : c.authority === 'medium' ? 'amber' : 'red'}>{c.authority}</Badge></td>
                          <td className="py-2 px-2 text-slate-600">{c.page_type}</td>
                          <td className="py-2 px-2 text-slate-500">{c.word_count}</td>
                          <td className="py-2 px-2"><Badge variant={c.eeat === 'strong' ? 'green' : c.eeat === 'medium' ? 'amber' : 'gray'}>{c.eeat}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Root causes */}
            {r.root_causes?.length && (
              <Card>
                <h2 className="text-sm font-black mb-3">Root Cause Diagnosis</h2>
                <div className="space-y-2">
                  {r.root_causes.map((rc, i) => (
                    <div key={i} className={`rounded-xl p-3 border-l-4 ${rc.severity === 'critical' ? 'bg-red-50 border-red-400' : rc.severity === 'high' ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-400'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black">{rc.dimension}</span>
                        <Badge variant={SEV_COLORS[rc.severity] ?? 'gray'}>{rc.severity}</Badge>
                      </div>
                      <p className="text-xs text-slate-600">{rc.diagnosis}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Gap scorecard */}
            {r.gap_scores && (
              <Card>
                <h2 className="text-sm font-black mb-3">Gap Scorecard</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100">
                      <th className="py-2 px-2 text-left font-bold text-slate-400">Dimension</th>
                      {['target','competitor1','competitor2','competitor3'].map(e => (
                        <th key={e} className={`py-2 px-2 font-black ${ENTITY_COLORS[e]}`}>
                          {e === 'target' ? 'You' : (r.gap_scores?.[e] as Record<string,unknown>)?.name as string ?? e}
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {DIMS.map((dim, i) => (
                        <tr key={dim} className="border-b border-slate-50">
                          <td className="py-2 px-2 font-medium">{DIM_LABELS[i]}</td>
                          {['target','competitor1','competitor2','competitor3'].map(e => {
                            const val = (r.gap_scores?.[e] as Record<string,number>)?.[dim] ?? 0
                            const color = ENTITY_COLORS[e]
                            return <td key={e} className="py-2 px-2 text-center">
                              <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-xs font-black ${color} bg-current/10`} style={{}}>{val}</span>
                            </td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Action plan */}
            {r.action_plan && (
              <Card>
                <h2 className="text-sm font-black mb-4">Recovery Plan</h2>
                {[
                  { key: 'phase1', label: 'Phase 1 (Weeks 1–4): Quick Wins', color: 'border-blue-500 bg-blue-50 text-blue-700' },
                  { key: 'phase2', label: 'Phase 2 (Weeks 5–10): Authority', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                  { key: 'phase3', label: 'Phase 3 (Weeks 11–20): Content & Links', color: 'border-purple-500 bg-purple-50 text-purple-700' },
                ].map(ph => {
                  const items = r.action_plan?.[ph.key as 'phase1'|'phase2'|'phase3'] ?? []
                  if (!items.length) return null
                  return (
                    <div key={ph.key} className="mb-5">
                      <div className={`rounded-xl p-2.5 mb-3 border-l-4 ${ph.color} text-xs font-bold`}>{ph.label}</div>
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-100">
                          {['Task','Why','Effort','Impact'].map(h => <th key={h} className="py-1.5 px-2 text-left font-bold text-slate-400">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {items.map((t, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="py-2 px-2 font-medium">{t.task}</td>
                              <td className="py-2 px-2 text-slate-500">{t.why}</td>
                              <td className="py-2 px-2 text-slate-400">{t.effort}</td>
                              <td className="py-2 px-2"><Badge variant={t.impact === 'high' ? 'green' : 'amber'}>{t.impact}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </Card>
            )}

            {/* Structural recommendation */}
            {r.structural_recommendation?.title && (
              <div className="rounded-2xl bg-gradient-to-r from-brand-900 to-purple-900 p-5 text-white">
                <div className="text-xs font-bold opacity-60 uppercase tracking-widest mb-2">One Structural Recommendation</div>
                <h3 className="text-base font-black mb-2">{r.structural_recommendation.title}</h3>
                <p className="text-sm opacity-85 mb-3">{r.structural_recommendation.detail}</p>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="text-[10px] font-bold opacity-60 uppercase mb-1">Trade-offs</div>
                  <p className="text-xs opacity-80">{r.structural_recommendation.tradeoffs}</p>
                </div>
              </div>
            )}
          </div>
        )}
        {result && (
          <div className="flex gap-2 mt-1">
            <button onClick={() => exportSerpCSV(result as never)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export CSV</button>
            <button onClick={() => exportSerpPDF(result as never)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export PDF</button>
          </div>
        )}
        {!result && !loading && <EmptyState icon="📈" title="SERP Audit" desc="Enter your target URL and keyword, then run the audit to get a full competitor breakdown and recovery plan." />}
      </div>
    </div>
    </>
  )
}
