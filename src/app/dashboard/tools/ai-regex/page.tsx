'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type DataType = 'gsc_queries' | 'keywords' | 'page_content' | 'generic'

type Result = {
  pattern: string
  flags: string
  negate: boolean
  explanation?: string
  exampleMatches?: string[]
  matches: string[]
  matchCount: number
  totalLines: number
  sampleMatches: string[]
  timedOut: boolean
  truncated: boolean
}

type Usage = { plan: string; used: number; limit: number; remaining: number }

const DATA_TYPES: { id: DataType; label: string; placeholder: string }[] = [
  { id: 'gsc_queries',  label: 'Search queries', placeholder: 'how to do keyword research\nbest seo tool 2026\noptmizly pricing' },
  { id: 'keywords',     label: 'Keywords',       placeholder: 'seo audit tool\nfree backlink checker\ncontent gap analysis' },
  { id: 'page_content', label: 'Content / URLs', placeholder: '/blog/2026/03/seo-guide\n/pricing\nHow to improve E-E-A-T' },
  { id: 'generic',      label: 'Anything else',  placeholder: 'One item per line' },
]

const EXAMPLES: Record<DataType, string[]> = {
  gsc_queries:  ['question queries', 'queries that do not mention my brand Optmizly', 'comparison queries mentioning vs or alternative'],
  keywords:     ['long-tail keywords with four or more words', 'keywords containing a year', 'keywords with buying intent'],
  page_content: ['URLs with a date in them', 'headings phrased as a question', 'URLs more than two levels deep'],
  generic:      ['lines containing an email address', 'lines that are not empty'],
}

export default function AiRegexPage() {
  const [data, setData] = useState('')
  const [description, setDescription] = useState('')
  const [dataType, setDataType] = useState<DataType>('gsc_queries')

  const [result, setResult] = useState<Result | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'pattern' | 'matches' | null>(null)

  // Editable copies, so tweaking the pattern never mutates the generated result until
  // the user re-runs.
  const [editPattern, setEditPattern] = useState('')
  const [editFlags, setEditFlags] = useState('')
  const [editNegate, setEditNegate] = useState(false)

  useEffect(() => {
    fetch('/api/tools/ai-regex').then(r => r.json()).then(d => setUsage(d.data ?? null)).catch(() => {})
  }, [])

  const dirty = result !== null && (
    editPattern !== result.pattern || editFlags !== result.flags || editNegate !== result.negate
  )

  async function generate() {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/tools/ai-regex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, data, dataType }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not generate a pattern.')
      setResult(d.data)
      setEditPattern(d.data.pattern)
      setEditFlags(d.data.flags)
      setEditNegate(d.data.negate)
      if (d.data.usage) setUsage(u => u ? { ...u, ...d.data.usage } : u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // Re-running an edited pattern costs nothing: no model call, no daily-cap consumption.
  const rerun = useCallback(async () => {
    setRerunning(true); setError('')
    try {
      const r = await fetch('/api/tools/ai-regex/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: editPattern, flags: editFlags, negate: editNegate, data }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not run that pattern.')
      setResult(prev => prev ? { ...prev, ...d.data, explanation: prev.explanation, exampleMatches: prev.exampleMatches } : d.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setRerunning(false)
    }
  }, [editPattern, editFlags, editNegate, data])

  function copy(text: string, what: 'pattern' | 'matches') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  function downloadCSV() {
    if (!result) return
    const rows = [['match'], ...result.matches.map(m => [m])]
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'Optmizly-regex-matches.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const lineCount = data.trim() ? data.trim().split(/\r?\n/).length : 0
  const outOfCredit = usage !== null && usage.remaining <= 0
  const currentType = DATA_TYPES.find(t => t.id === dataType)!

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">AI Regex</h1>
            <div className="text-xs text-slate-400">Describe a filter in plain English — get a pattern that runs on your data</div>
          </div>
          {usage && (
            <div className="text-xs text-right">
              <span className={usage.remaining <= 1 ? 'font-bold text-amber-600' : 'text-slate-500'}>
                {usage.remaining} of {usage.limit} generations left today
              </span>
              {usage.plan === 'FREE' && usage.remaining <= 2 && (
                <Link href="/pricing" className="ml-2 font-bold text-blue-600 hover:underline">Upgrade →</Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* How it works — the two layers, stated plainly, because "AI regex" invites the
            assumption that the AI is picking the rows. */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">The AI writes the pattern. Your data is matched by a regex engine, not by the AI.</span>{' '}
            That means the result is exact and repeatable: the same pattern on the same data always returns the same
            rows. You can read the pattern, edit it, and re-run it as often as you like — only generating a new one
            counts against your daily limit.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">What kind of data is this?</label>
            <div className="flex flex-wrap gap-2">
              {DATA_TYPES.map(t => (
                <button key={t.id} onClick={() => setDataType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    dataType === t.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Your data <span className="font-normal text-slate-400">— one item per line{lineCount > 0 ? ` · ${lineCount.toLocaleString()} lines` : ''}</span>
            </label>
            <textarea
              value={data}
              onChange={e => setData(e.target.value)}
              placeholder={currentType.placeholder}
              rows={8}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">What do you want to match?</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading && description.trim() && data.trim()) generate() }}
              placeholder="e.g. queries that do not mention my brand"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES[dataType].map(ex => (
                <button key={ex} onClick={() => setDescription(ex)}
                  className="text-[11px] text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button
            onClick={generate}
            disabled={loading || !description.trim() || !data.trim() || outOfCredit}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating…' : outOfCredit ? 'No generations left today' : 'Generate & Match'}
          </button>
          {outOfCredit && usage?.plan === 'FREE' && (
            <p className="text-xs text-slate-500">
              Your {usage.limit} free generations reset tomorrow. Editing and re-running a pattern is always free.{' '}
              <Link href="/pricing" className="font-bold text-blue-600 hover:underline">See plans →</Link>
            </p>
          )}
        </div>

        {result && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-700 mb-1.5">Pattern</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="flex-1 min-w-[240px] rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-300 break-all">
                      /{editPattern}/{editFlags}
                    </code>
                    <button onClick={() => copy(editPattern, 'pattern')}
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      {copied === 'pattern' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {result.explanation && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {result.negate && <span className="font-bold text-amber-700">Inverted — </span>}
                  {result.explanation}
                </p>
              )}

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="text-xs font-bold text-slate-700">Edit and re-run <span className="font-normal text-slate-400">— free, no AI call</span></div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={editPattern}
                    onChange={e => setEditPattern(e.target.value)}
                    className="flex-1 min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    value={editFlags}
                    onChange={e => setEditFlags(e.target.value)}
                    placeholder="flags"
                    className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={editNegate} onChange={e => setEditNegate(e.target.checked)} className="accent-blue-600" />
                    Invert
                  </label>
                  <button onClick={rerun} disabled={rerunning || !editPattern.trim()}
                    className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40">
                    {rerunning ? 'Running…' : 'Re-run'}
                  </button>
                  {dirty && <span className="text-[11px] text-amber-600 font-medium">edited — re-run to update results</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <span className="text-lg font-black text-emerald-600">{result.matchCount.toLocaleString()}</span>
                  <span className="text-sm text-slate-500"> of {result.totalLines.toLocaleString()} lines matched</span>
                  {result.matchCount > result.matches.length && (
                    <span className="text-xs text-slate-400"> · showing first {result.matches.length.toLocaleString()}</span>
                  )}
                </div>
                {result.matches.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => copy(result.matches.join('\n'), 'matches')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      {copied === 'matches' ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={downloadCSV}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      ↓ CSV
                    </button>
                  </div>
                )}
              </div>

              {result.truncated && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  Your input was larger than the limit, so only the first part was scanned. Counts cover the scanned portion.
                </p>
              )}
              {result.timedOut && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  The scan hit its time limit and stopped early. Counts are partial.
                </p>
              )}

              {result.matches.length > 0 ? (
                <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {result.matches.map((m, i) => (
                    <div key={i} className="px-3 py-1.5 text-xs font-mono text-slate-700 bg-emerald-50/40 break-all">{m}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  Nothing matched. Try editing the pattern above, or rephrase what you want and generate again.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
