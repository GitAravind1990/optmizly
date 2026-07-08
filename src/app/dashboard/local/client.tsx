'use client'

import { useState } from 'react'
import { Button, Card, Badge, Spinner } from '@/components/ui'
import { exportLocalCSV, exportLocalPDF } from '@/lib/export'
import { UpgradeModal } from '@/components/upgrade-modal'

const SUB_TOOLS = [
  { id: 'entities', label: 'Local Entities', desc: 'Missing hyperlocal entities, neighborhoods, landmarks' },
  { id: 'nap',      label: 'NAP + Schema',   desc: 'NAP audit and JSON-LD LocalBusiness schema generator' },
  { id: 'queries',  label: 'Local Queries',  desc: 'Local AI search queries you should rank for' },
  { id: 'gbp',      label: 'GBP Content',    desc: 'Google Business Profile posts, Q&A and review templates' },
]

export function LocalClient() {
  const [fields, setFields] = useState({ businessName: '', city: '', service: '', phone: '' })
  const [activeTab, setActiveTab] = useState('entities')
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, Record<string, unknown>>>({})
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  async function runSubTool(subTool: string) {
    const content = (document.getElementById('local-content') as HTMLTextAreaElement)?.value ?? ''
    if (!fields.city) { setError('City is required'); return }
    if (!content || content.length < 50) { setError('Paste your content first'); return }

    setLoading(subTool); setError('')
    try {
      const r = await fetch('/api/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, subTool, ...fields }),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setResults(prev => ({ ...prev, [subTool]: d }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tool failed')
    } finally { setLoading(null) }
  }

  const active = results[activeTab]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div><h1 className="text-base font-black">Local SEO Suite</h1>
          <p className="text-xs text-slate-500">4 tools for hyperlocal content, schema, queries, and GBP</p></div>
        </div>

        {/* Business fields */}
        <Card>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'businessName', label: 'Business Name', ph: 'e.g. Austin Family Dental' },
              { id: 'city',         label: 'City *',        ph: 'e.g. Austin, TX' },
              { id: 'service',      label: 'Service',       ph: 'e.g. dental implants, AC repair' },
              { id: 'phone',        label: 'Phone',         ph: 'e.g. (512) 555-0100' },
            ].map(f => (
              <div key={f.id}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{f.label}</label>
                <input value={(fields as Record<string,string>)[f.id]}
                  onChange={e => setFields(p => ({ ...p, [f.id]: e.target.value }))}
                  placeholder={f.ph}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Content</label>
            <textarea id="local-content" rows={4} placeholder="Paste your page content here…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm resize-none focus:border-brand-500 focus:outline-none" />
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {/* Sub-tool tabs */}
        <div className="flex gap-2 flex-wrap">
          {SUB_TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === t.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
              {results[t.id] && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />}
            </button>
          ))}
        </div>

        {/* Active sub-tool */}
        {(() => {
          const tool = SUB_TOOLS.find(t => t.id === activeTab)!
          return (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black">{tool.label}</h2>
                  <p className="text-xs text-slate-500">{tool.desc}</p>
                </div>
                <Button onClick={() => runSubTool(activeTab)} loading={loading === activeTab} size="sm">
                  Run {tool.label}
                </Button>
              </div>

              {loading === activeTab && (
                <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
                  <Spinner /><span className="text-sm">Analysing…</span>
                </div>
              )}

              {active && !loading && <LocalResult data={active} subTool={activeTab} />}

              {!active && !loading && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Click "Run {tool.label}" to generate results
                </div>
              )}
              {active && !loading && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => exportLocalCSV(active as never, activeTab)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export CSV</button>
                  <button onClick={() => exportLocalPDF(active, activeTab, fields.city || 'local')} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Export PDF</button>
                </div>
              )}
            </Card>
          )
        })()}
      </div>
    </div>
  )
}

function LocalResult({ data, subTool }: { data: Record<string, unknown>; subTool: string }) {
  if (subTool === 'entities') {
    const d = data as { local_entity_score: number; summary: string; missing: Record<string, string[]>; priority_additions: Array<{ entity: string; type: string; why: string; example_sentence: string }> }
    return (
      <div className="space-y-4 fade-up">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-brand-600">{d.local_entity_score}</div>
          <p className="text-sm text-slate-600">{d.summary}</p>
        </div>
        {d.missing && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(d.missing).filter(([, v]) => v?.length > 0).map(([key, vals]) => (
              <div key={key}>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{key.replace(/_/g,' ')}</div>
                <div className="flex flex-wrap gap-1">
                  {(vals as string[]).map((v, i) => <Badge key={i} variant="purple">{v}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {d.priority_additions?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Priority Additions</div>
            {d.priority_additions.map((p, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{p.entity}</span>
                  <Badge variant="gray">{p.type}</Badge>
                </div>
                <p className="text-xs text-slate-500 mb-1">{p.why}</p>
                {p.example_sentence && <p className="text-xs italic text-slate-400">"{p.example_sentence}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (subTool === 'nap') {
    const d = data as { nap_audit: { name_found: boolean; address_found: boolean; phone_found: boolean; nap_score: number; consistency_issues: string[] }; schema_audit: { missing_schema_types: string[]; schema_score: number; recommended_primary_type: string }; json_ld: string }
    return (
      <div className="space-y-4 fade-up">
        <div className="grid grid-cols-3 gap-3">
          {[['Name', d.nap_audit?.name_found], ['Address', d.nap_audit?.address_found], ['Phone', d.nap_audit?.phone_found]].map(([l, v]) => (
            <div key={l as string} className={`rounded-xl p-3 text-center border ${v ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-sm font-bold ${v ? 'text-emerald-600' : 'text-red-600'}`}>{v ? 'Found' : 'Missing'}</div>
              <div className="text-xs font-bold text-slate-500 mt-1">{l as string}</div>
            </div>
          ))}
        </div>
        {d.nap_audit?.consistency_issues?.length > 0 && (
          <div>
            {d.nap_audit.consistency_issues.map((i, idx) => (
              <div key={idx} className="text-xs text-red-600 flex gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                {i}
              </div>
            ))}
          </div>
        )}
        {d.json_ld && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Generated JSON-LD Schema</div>
            <div className="relative">
              <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto max-h-60">{d.json_ld}</pre>
              <button onClick={() => navigator.clipboard.writeText(d.json_ld)}
                className="absolute top-2 right-2 bg-slate-700 text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-600">
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (subTool === 'queries') {
    const d = data as { overall_local_coverage: number; summary: string; queries: Array<{ query: string; platform: string; intent_type: string; coverage_score: number; verdict: string; gap: string; fix: string }> }
    return (
      <div className="space-y-3 fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl font-black text-brand-600">{d.overall_local_coverage}</div>
          <p className="text-sm text-slate-600">{d.summary}</p>
        </div>
        {d.queries?.map((q, i) => (
          <div key={i} className={`rounded-xl p-3 border ${q.verdict === 'strong' ? 'bg-emerald-50 border-emerald-200' : q.verdict === 'partial' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-bold text-sm">{q.query}</span>
              <Badge variant={q.verdict === 'strong' ? 'green' : q.verdict === 'partial' ? 'amber' : 'red'}>{q.verdict}</Badge>
            </div>
            <div className="flex gap-2 text-xs text-slate-500 mb-1">
              <span>{q.platform}</span><span>·</span><span>{q.intent_type}</span>
            </div>
            {q.fix && <p className="text-xs text-blue-600">Fix: {q.fix}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (subTool === 'gbp') {
    const d = data as { gbp_posts: Array<{ type: string; title: string; body: string; cta: string; hashtags: string[] }>; qa_pairs: Array<{ question: string; answer: string }>; gbp_description: string }
    return (
      <div className="space-y-4 fade-up">
        {d.gbp_description && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">GBP Description</div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 leading-relaxed border border-slate-200">{d.gbp_description}</div>
          </div>
        )}
        {d.gbp_posts?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">GBP Posts ({d.gbp_posts.length})</div>
            {d.gbp_posts.map((p, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2 mb-1"><Badge variant="blue">{p.type}</Badge><span className="font-bold text-sm">{p.title}</span></div>
                <p className="text-xs text-slate-600 mb-1.5">{p.body}</p>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs text-brand-600 font-bold">CTA: {p.cta}</span>
                  {p.hashtags?.map((h, j) => <span key={j} className="text-xs text-slate-400">#{h}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {d.qa_pairs?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Q&A Pairs ({d.qa_pairs.length})</div>
            {d.qa_pairs.map((qa, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 mb-2">
                <p className="text-xs font-bold text-slate-700 mb-1">Q: {qa.question}</p>
                <p className="text-xs text-slate-600">A: {qa.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <pre className="text-xs text-slate-500 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
}
