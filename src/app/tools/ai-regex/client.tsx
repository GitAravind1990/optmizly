'use client'

import { useState } from 'react'
import Link from 'next/link'

type DataType = 'gsc_queries' | 'keywords' | 'page_content' | 'generic'

type Result = {
  pattern: string
  flags: string
  negate: boolean
  explanation?: string
  matches: string[]
  matchCount: number
  totalLines: number
  truncated: boolean
  timedOut: boolean
  remaining?: number
  dailyLimit?: number
}

const DATA_TYPES: { id: DataType; label: string; placeholder: string }[] = [
  { id: 'gsc_queries',  label: 'Search queries', placeholder: 'how to do keyword research\nbest seo tool 2026\nacme pricing\nwhat is e-e-a-t' },
  { id: 'keywords',     label: 'Keywords',       placeholder: 'seo audit tool\nfree backlink checker\ncontent gap analysis' },
  { id: 'page_content', label: 'Content / URLs', placeholder: '/blog/2026/03/seo-guide\n/pricing\nHow to improve E-E-A-T' },
  { id: 'generic',      label: 'Anything else',  placeholder: 'One item per line' },
]

const EXAMPLES: Record<DataType, string[]> = {
  gsc_queries:  ['question queries', 'queries that do not mention my brand Acme', 'comparison queries mentioning vs or alternative'],
  keywords:     ['long-tail keywords with four or more words', 'keywords containing a year', 'keywords with buying intent'],
  page_content: ['URLs with a date in them', 'headings phrased as a question', 'URLs more than two levels deep'],
  generic:      ['lines containing an email address', 'lines that are not empty'],
}

export function PublicAiRegex() {
  const [data, setData] = useState('')
  const [description, setDescription] = useState('')
  const [dataType, setDataType] = useState<DataType>('gsc_queries')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'pattern' | 'matches' | null>(null)
  const [exhausted, setExhausted] = useState(false)

  const [editPattern, setEditPattern] = useState('')
  const [editFlags, setEditFlags] = useState('')
  const [editNegate, setEditNegate] = useState(false)

  async function post(body: Record<string, unknown>) {
    const r = await fetch('/api/public/ai-regex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (!r.ok) {
      if (r.status === 429) setExhausted(true)
      throw new Error(d.error || 'Something went wrong.')
    }
    return d.data as Result
  }

  async function generate() {
    setLoading(true); setError(''); setResult(null)
    try {
      const d = await post({ description, data, dataType })
      setResult(d)
      setEditPattern(d.pattern); setEditFlags(d.flags); setEditNegate(d.negate)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  // Free, and stays free: no model call, so it never touches the daily limit.
  async function rerun() {
    setRerunning(true); setError('')
    try {
      const d = await post({ pattern: editPattern, flags: editFlags, negate: editNegate, data })
      setResult(prev => (prev ? { ...prev, ...d, explanation: prev.explanation } : d))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setRerunning(false) }
  }

  function copy(text: string, what: 'pattern' | 'matches') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what); setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  const lineCount = data.trim() ? data.trim().split(/\r?\n/).length : 0
  const currentType = DATA_TYPES.find(t => t.id === dataType)!
  const dirty = result !== null && (editPattern !== result.pattern || editFlags !== result.flags || editNegate !== result.negate)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {DATA_TYPES.map(t => (
            <button key={t.id} onClick={() => setDataType(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                dataType === t.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Your data <span className="font-normal text-slate-400">— one item per line{lineCount ? ` · ${lineCount.toLocaleString()} lines` : ''}</span>
          </label>
          <textarea value={data} onChange={e => setData(e.target.value)} rows={7} placeholder={currentType.placeholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">What do you want to match?</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading && description.trim() && data.trim()) generate() }}
            placeholder="e.g. queries that do not mention my brand"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:outline-none" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES[dataType].map(ex => (
              <button key={ex} onClick={() => setDescription(ex)}
                className="text-[11px] text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium">
            {error}{' '}
            {exhausted && <Link href="/signup" className="font-bold text-blue-600 hover:underline">Create a free account →</Link>}
          </p>
        )}

        <button onClick={generate} disabled={loading || !description.trim() || !data.trim()}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? 'Generating…' : 'Generate & Match'}
        </button>
        {result?.remaining !== undefined && (
          <span className="ml-3 text-xs text-slate-400">{result.remaining} of {result.dailyLimit} free generations left today</span>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5">Pattern</div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-[240px] rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-300 break-all">
                  /{editPattern}/{editFlags}
                </code>
                <button onClick={() => copy(editPattern, 'pattern')}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {copied === 'pattern' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {result.explanation && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {result.negate && <span className="font-bold text-amber-700">Inverted — </span>}
                {result.explanation}
              </p>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="text-xs font-bold text-slate-700">Edit and re-run <span className="font-normal text-slate-400">— free, does not use a generation</span></div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={editPattern} onChange={e => setEditPattern(e.target.value)}
                  className="flex-1 min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none" />
                <input value={editFlags} onChange={e => setEditFlags(e.target.value)} placeholder="flags"
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none" />
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={editNegate} onChange={e => setEditNegate(e.target.checked)} className="accent-blue-600" />
                  Invert
                </label>
                <button onClick={rerun} disabled={rerunning || !editPattern.trim()}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40">
                  {rerunning ? 'Running…' : 'Re-run'}
                </button>
                {dirty && <span className="text-[11px] text-amber-600 font-medium">edited — re-run to update</span>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <span className="text-lg font-black text-emerald-600">{result.matchCount.toLocaleString()}</span>
                <span className="text-sm text-slate-500"> of {result.totalLines.toLocaleString()} lines matched</span>
              </div>
              {result.matches.length > 0 && (
                <button onClick={() => copy(result.matches.join('\n'), 'matches')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {copied === 'matches' ? 'Copied' : 'Copy matches'}
                </button>
              )}
            </div>
            {result.matches.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {result.matches.map((m, i) => (
                  <div key={i} className="px-3 py-1.5 text-xs font-mono text-slate-700 bg-emerald-50/40 break-all">{m}</div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">
                Nothing matched. Edit the pattern above and re-run, or rephrase and generate again.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
