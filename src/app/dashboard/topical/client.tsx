'use client'

import { useState } from 'react'
import { Button, Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { exportTopicalCSV, exportTopicalPDF } from '@/lib/export'
import { UpgradeModal } from '@/components/upgrade-modal'

type Cluster = { title: string; slug: string; intent: string; difficulty: string; monthly_searches: string; primary_keyword: string; covered: boolean; ai_cite_score: number; word_count_target: number }
type Pillar  = { title: string; slug: string; intent: string; monthly_searches: string; covered: boolean; ai_cite_score: number; word_count_target: number; clusters: Cluster[] }
type Result  = { topic: string; authority_score: number; coverage_grade: string; summary: string; ai_overview_readiness: number; pillar_pages: Pillar[]; coverage_stats: { total_topics: number; covered: number; missing: number; coverage_pct: number }; content_gaps: Array<{ title: string; impact: string; why: string }>; quick_wins: string[]; content_calendar: Array<{ week: number; title: string; type: string; why_now: string }> }

const GRADE_COLOR: Record<string, string> = { S:'text-purple-600', A:'text-emerald-600', B:'text-blue-600', C:'text-amber-600', D:'text-red-600' }
const DIFF_COLOR: Record<string, 'green'|'amber'|'red'> = { easy:'green', medium:'amber', hard:'red' }

export function TopicalClient() {
  const [niche, setNiche] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<{ pillar: number; cluster?: number } | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  async function handleRun() {
    if (!niche.trim()) { setError('Enter a niche first'); return }
    setLoading(true); setError(''); setSelected(null)
    try {
      const urls = urlsText.split('\n').map(u => u.trim()).filter(Boolean)
      const r = await fetch('/api/topical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, urls }),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setResult(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setLoading(false) }
  }

  const selPillar = selected !== null ? result?.pillar_pages[selected.pillar] : null
  const selCluster = selected?.cluster !== undefined ? selPillar?.clusters[selected.cluster] : null

  return (
    <>
    {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div><h1 className="text-base font-black">Topical Authority</h1>
          <p className="text-xs text-slate-500">Pillar + cluster map with search volumes, coverage gaps, and content calendar</p></div>
          <Button className="ml-auto" onClick={handleRun} loading={loading}>
            {loading ? 'Mapping…' : 'Build Map'}
          </Button>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Niche / Topic *</label>
              <input value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="e.g. Austin HVAC services, dental implants Austin TX, SaaS content marketing"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Existing URLs (optional, one per line)</label>
              <textarea value={urlsText} onChange={e => setUrlsText(e.target.value)} rows={3}
                placeholder={"https://yoursite.com/ac-repair\nhttps://yoursite.com/hvac-maintenance"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm resize-none focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Spinner size="lg" />
            <span className="text-sm">Building pillar & cluster map. This takes ~20 seconds…</span>
          </div>
        )}

        {result && !loading && (
          <div className="fade-up space-y-5">
            {/* Header stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Authority Score', value: result.authority_score, sub: '/100', color: result.authority_score >= 70 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Coverage Grade', value: result.coverage_grade, sub: '', color: GRADE_COLOR[result.coverage_grade] ?? 'text-slate-900' },
                { label: 'AI Overview', value: result.ai_overview_readiness, sub: '/100', color: 'text-blue-600' },
                { label: 'Coverage', value: `${result.coverage_stats.coverage_pct}%`, sub: `${result.coverage_stats.covered}/${result.coverage_stats.total_topics}`, color: 'text-slate-900' },
              ].map(s => (
                <Card key={s.label} className="text-center p-4">
                  <div className={`text-3xl font-black ${s.color}`}>{s.value}<span className="text-sm text-slate-400">{s.sub}</span></div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </Card>
              ))}
            </div>

            {result.summary && <Card className="bg-slate-50"><p className="text-sm text-slate-600">{result.summary}</p></Card>}

            {/* Cluster map + detail panel */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Map */}
              <div className="lg:col-span-2 space-y-3">
                {result.pillar_pages.map((pillar, pi) => (
                  <Card key={pi} className={`transition-all ${selected?.pillar === pi && !selected.cluster ? 'ring-2 ring-brand-500' : ''}`}>
                    {/* Pillar row */}
                    <button
                      onClick={() => setSelected(s => s?.pillar === pi && !s.cluster ? null : { pillar: pi })}
                      className="w-full flex items-start gap-3 text-left"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${pillar.covered ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm">{pillar.title}</span>
                          <Badge variant="gray">{pillar.monthly_searches}</Badge>
                          <Badge variant={pillar.covered ? 'green' : 'red'}>{pillar.covered ? 'Covered' : 'Missing'}</Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{pillar.intent} · {pillar.word_count_target} words</div>
                      </div>
                      <div className={`text-sm font-black flex-shrink-0 ${pillar.ai_cite_score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {pillar.ai_cite_score}
                      </div>
                    </button>

                    {/* Clusters */}
                    <div className="mt-3 ml-6 space-y-1.5">
                      {pillar.clusters.map((cluster, ci) => (
                        <button
                          key={ci}
                          onClick={() => setSelected(s => s?.pillar === pi && s.cluster === ci ? { pillar: pi } : { pillar: pi, cluster: ci })}
                          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${selected?.pillar === pi && selected.cluster === ci ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cluster.covered ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                          <span className="text-xs font-medium flex-1 truncate">{cluster.title}</span>
                          <span className="text-xs text-slate-400">{cluster.monthly_searches}</span>
                          <Badge variant={DIFF_COLOR[cluster.difficulty] ?? 'gray'}>{cluster.difficulty}</Badge>
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Detail panel */}
              <div>
                {selCluster ? (
                  <Card className="sticky top-4">
                    <Badge variant={selCluster.covered ? 'green' : 'red'} >{selCluster.covered ? 'Covered' : 'Not Written'}</Badge>
                    <h3 className="font-black text-sm mt-2 mb-1">{selCluster.title}</h3>
                    <p className="text-xs text-slate-500 mb-3">/{selCluster.slug}</p>
                    {[
                      ['Primary keyword', selCluster.primary_keyword],
                      ['Intent', selCluster.intent],
                      ['Monthly searches', selCluster.monthly_searches],
                      ['Difficulty', selCluster.difficulty],
                      ['Target word count', `${selCluster.word_count_target} words`],
                      ['AI Cite Score', `${selCluster.ai_cite_score}/100`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-400">{l}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))}
                  </Card>
                ) : selPillar ? (
                  <Card className="sticky top-4">
                    <Badge variant={selPillar.covered ? 'green' : 'red'}>{selPillar.covered ? 'Covered' : 'Not Written'}</Badge>
                    <h3 className="font-black text-sm mt-2 mb-1">{selPillar.title}</h3>
                    <p className="text-xs text-slate-500 mb-3">/{selPillar.slug}</p>
                    {[
                      ['Intent', selPillar.intent],
                      ['Monthly searches', selPillar.monthly_searches],
                      ['Target word count', `${selPillar.word_count_target} words`],
                      ['AI Cite Score', `${selPillar.ai_cite_score}/100`],
                      ['Clusters', `${selPillar.clusters.length} topics`],
                      ['Covered clusters', `${selPillar.clusters.filter(c => c.covered).length}/${selPillar.clusters.length}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-400">{l}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))}
                  </Card>
                ) : (
                  <Card className="text-center py-8">
                    <p className="text-xs text-slate-400">Click any pillar or cluster to inspect details</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Content gaps + quick wins */}
            {(result.content_gaps?.length > 0 || result.quick_wins?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                {result.content_gaps?.length > 0 && (
                  <Card>
                    <h2 className="text-sm font-bold mb-3">Content Gaps</h2>
                    {result.content_gaps.map((g, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Badge variant={g.impact === 'high' ? 'red' : 'amber'}>{g.impact}</Badge>
                        <div><div className="text-xs font-bold">{g.title}</div><div className="text-xs text-slate-400">{g.why}</div></div>
                      </div>
                    ))}
                  </Card>
                )}
                {result.quick_wins?.length > 0 && (
                  <Card>
                    <h2 className="text-sm font-bold mb-3">Quick Wins</h2>
                    {result.quick_wins.map((w, i) => (
                      <div key={i} className="flex gap-2 text-sm mb-2">
                        <span className="text-emerald-500 font-bold flex-shrink-0">+</span>
                        <span className="text-slate-700">{w}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}

            {/* Content calendar */}
            {result.content_calendar?.length > 0 && (
              <Card>
                <h2 className="text-sm font-bold mb-3">Content Calendar</h2>
                <div className="space-y-2">
                  {result.content_calendar.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                      <div className="w-14 text-center flex-shrink-0">
                        <div className="text-xs font-black text-slate-900">Week {c.week}</div>
                        <Badge variant={c.type === 'pillar' ? 'blue' : 'gray'}>{c.type}</Badge>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{c.title}</div>
                        <div className="text-xs text-slate-400">{c.why_now}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => exportTopicalCSV(result)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export CSV</button>
              <button onClick={() => exportTopicalPDF(result)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export PDF</button>
              <Button variant="secondary" size="sm" onClick={() => { setResult(null); setSelected(null) }}>New Analysis</Button>
            </div>
          </div>
        )}

        {!result && !loading && (
          <EmptyState title="Topical Authority Mapper" desc="Enter your niche above and click Build Map. Optmizly will generate a full pillar + cluster map with search volumes and a content calendar." />
        )}
      </div>
    </div>
    </>
  )
}
