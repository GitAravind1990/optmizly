'use client'

import { useState, useEffect, useCallback } from 'react'
import { LockedState } from '@/components/ui'

type SurfaceOutcome = {
  answerPresent: boolean
  mentions: number
  cited: boolean
  citedDomains: string[]
}
type Outcome = { prompt: string; aiOverview: SurfaceOutcome | null; aiMode: SurfaceOutcome | null }
type SurfaceTotals = { mentions: number; cited: number; answers: number; failed: number }

type RunResult = {
  id: string
  brand: string
  domain: string | null
  promptSource: 'search-console' | 'keywords'
  promptsRun: number
  totalMentions: number
  totalCitations: number
  totals: { aiOverview: SurfaceTotals; aiMode: SurfaceTotals }
  topCitedDomains: Array<{ domain: string; count: number }>
  outcomes: Outcome[]
}

type PastRun = {
  id: string
  brand: string
  promptSource: string
  promptCount: number
  totalMentions: number
  totalCitations: number
  createdAt: string
}

/** Matches MAX_PROMPTS_PER_BATCH on the batch route. */
const BATCH = 5

export default function AiVisibilityPage() {
  const [brand, setBrand] = useState('')
  const [domain, setDomain] = useState('')
  const [seed, setSeed] = useState('')
  const [needSeed, setNeedSeed] = useState(false)

  const [result, setResult] = useState<RunResult | null>(null)
  const [past, setPast] = useState<PastRun[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)

  const loadPast = useCallback(() => {
    fetch('/api/tools/ai-visibility')
      .then(async r => {
        if (r.status === 403) { setLocked(true); return null }
        return (await r.json()).data ?? null
      })
      .then(d => { if (Array.isArray(d)) setPast(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadPast() }, [loadPast])

  /**
   * Three requests, not one: derive the prompts, walk them in batches, then store.
   *
   * Fifty live vendor lookups cannot sit inside one signed-in POST — Clerk's token expires 61s
   * after minting and a POST cannot be refreshed, so a long one can be rejected after the work
   * is done and the unit charged. The progress counter is deliberate: the waiting is the
   * evidence that real lookups are happening.
   */
  async function run() {
    setRunning(true); setError(''); setResult(null); setProgress(null)
    try {
      const promptsRes = await fetch('/api/tools/ai-visibility/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seed.trim() || undefined }),
      })
      const promptsData = await promptsRes.json()
      if (!promptsRes.ok) {
        // A missing corpus is not an error to apologise for — it is a request for one input.
        if (/topic to start from/i.test(promptsData.error ?? '')) setNeedSeed(true)
        throw new Error(promptsData.error || 'Could not build a prompt list.')
      }
      const prompts: string[] = promptsData.data.prompts
      const promptSource: RunResult['promptSource'] = promptsData.data.source
      setProgress({ done: 0, total: prompts.length })

      const outcomes: Outcome[] = []
      for (let i = 0; i < prompts.length; i += BATCH) {
        const slice = prompts.slice(i, i + BATCH)
        const r = await fetch('/api/tools/ai-visibility/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand: brand.trim(),
            domain: domain.trim() || undefined,
            prompts: slice,
          }),
        })
        const d = await r.json()
        if (!r.ok) {
          // Partial results are still worth storing, so stop the walk rather than discarding
          // what already came back.
          if (!outcomes.length) throw new Error(d.error || 'Lookup failed.')
          setError(`Stopped after ${outcomes.length} prompts: ${d.error ?? 'lookup failed'}`)
          break
        }
        outcomes.push(...d.data.outcomes)
        setProgress({ done: outcomes.length, total: prompts.length })
      }

      if (!outcomes.length) throw new Error('No prompts could be checked.')

      const storeRes = await fetch('/api/tools/ai-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim(),
          domain: domain.trim() || undefined,
          promptSource,
          outcomes,
        }),
      })
      const stored = await storeRes.json()
      if (!storeRes.ok) throw new Error(stored.error || 'Could not save the run.')
      setResult(stored.data)
      loadPast()
    } catch (e) {
      setError(prev => prev || (e instanceof Error ? e.message : 'Something went wrong.'))
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  async function openRun(id: string) {
    setError(''); setResult(null)
    try {
      const r = await fetch(`/api/tools/ai-visibility?id=${encodeURIComponent(id)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not open that run.')
      // A stored run carries the same fields plus the detail blob, but not the recomputed
      // totals object, so rebuild the shape the renderer expects.
      const o: Outcome[] = d.data.outcomes ?? []
      setResult({
        id: d.data.id,
        brand: d.data.brand,
        domain: d.data.domain,
        promptSource: d.data.promptSource,
        promptsRun: d.data.promptCount,
        totalMentions: d.data.totalMentions,
        totalCitations: d.data.totalCitations,
        totals: surfaceTotals(o),
        topCitedDomains: d.data.topCitedDomains ?? [],
        outcomes: o,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  if (locked) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <LockedState tool="AI Visibility" plan="Agency" />
      </div>
    )
  }

  const canRun = brand.trim().length > 1 && !running && (!needSeed || seed.trim().length > 1)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">AI Visibility</h1>
          <div className="text-xs text-slate-400">
            Whether Google&rsquo;s AI answers name you for the queries you already rank for &mdash; and who they name instead
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* What this measures, stated before the button, because "AI visibility" is a phrase
            other products use for different things. */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Every number here is read from a real AI answer.</span>{' '}
            We ask Google&rsquo;s AI Overviews and AI Mode the questions your site already appears
            for in Search Console, then count whether the answer names you and which sources it
            cited instead. Nothing is predicted or modelled. This does not cover ChatGPT,
            Gemini or Perplexity &mdash; those are a separate surface and not included yet.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="aiv-brand" className="block text-xs font-bold text-slate-700 mb-1.5">
                Brand name
              </label>
              <input
                id="aiv-brand"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Optmizly"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Type it the way someone would say it, not the legal name.
              </p>
            </div>
            <div>
              <label htmlFor="aiv-domain" className="block text-xs font-bold text-slate-700 mb-1.5">
                Domain <span className="font-normal text-slate-400">&mdash; optional</span>
              </label>
              <input
                id="aiv-domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="optmizly.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Lets us separate being <em>cited</em> as a source from merely being named.
              </p>
            </div>
          </div>

          {needSeed && (
            <div>
              <label htmlFor="aiv-seed" className="block text-xs font-bold text-slate-700 mb-1.5">
                Topic to start from
              </label>
              <input
                id="aiv-seed"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="e.g. seo tools for agencies"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-amber-700">
                No Search Console queries to work from, so prompts will be built from this topic
                instead. That is a reasonable proxy, but it is not evidence about your site &mdash;
                connect Search Console for that.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={!canRun}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {running ? 'Checking…' : 'Check AI visibility'}
            </button>
            {progress && (
              <span className="text-xs text-slate-500 font-medium">
                {progress.done} of {progress.total} prompts checked
              </span>
            )}
            {!running && <span className="text-[11px] text-slate-400">3 analysis credits &middot; about a minute</span>}
          </div>
        </div>

        {result && <Report result={result} />}

        {past.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">
              Past runs <span className="font-normal text-slate-400">&mdash; the second one is a trend</span>
            </h2>
            <div className="divide-y divide-slate-100">
              {past.map(p => (
                <button
                  key={p.id}
                  onClick={() => openRun(p.id)}
                  className="w-full text-left flex items-center gap-4 py-2.5 hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2"
                >
                  <span className="text-xs text-slate-400 w-24 shrink-0 font-mono">
                    {new Date(p.createdAt).toISOString().slice(0, 10)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{p.brand}</span>
                  <span className="text-xs text-slate-500 shrink-0">
                    <b className="text-slate-800">{p.totalMentions}</b> mentions &middot;{' '}
                    <b className="text-slate-800">{p.totalCitations}</b> cited &middot; {p.promptCount} prompts
                  </span>
                  {p.promptSource !== 'search-console' && (
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                      topic
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Rebuilt client-side when opening a stored run, which keeps only the per-prompt detail. */
function surfaceTotals(outcomes: Outcome[]): RunResult['totals'] {
  const blank = (): SurfaceTotals => ({ mentions: 0, cited: 0, answers: 0, failed: 0 })
  const t = { aiOverview: blank(), aiMode: blank() }
  for (const o of outcomes) {
    for (const k of ['aiOverview', 'aiMode'] as const) {
      const r = o[k]
      if (r === null) { t[k].failed++; continue }
      if (!r.answerPresent) continue
      t[k].answers++
      t[k].mentions += r.mentions
      if (r.cited) t[k].cited++
    }
  }
  return t
}

function Report({ result }: { result: RunResult }) {
  const s = result.totals
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total mentions" value={result.totalMentions} hint="times an answer named you" />
        <Stat label="Times cited" value={result.totalCitations} hint="answers listing your domain as a source" />
        <Stat label="Prompts checked" value={result.promptsRun}
          hint={result.promptSource === 'search-console' ? 'from your Search Console queries' : 'from a topic, not your own data'} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">By surface</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="text-left font-bold pb-2">Surface</th>
                <th className="text-right font-bold pb-2">AI answers found</th>
                <th className="text-right font-bold pb-2">Mentions</th>
                <th className="text-right font-bold pb-2">Cited</th>
                <th className="text-right font-bold pb-2">Not checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SurfaceRow label="AI Overviews" t={s.aiOverview} of={result.promptsRun} />
              <SurfaceRow label="AI Mode" t={s.aiMode} of={result.promptsRun} />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          &ldquo;AI answers found&rdquo; counts prompts where the engine produced an AI answer at
          all. A prompt with no AI answer is a real result, not a failure &mdash; and separate
          from &ldquo;not checked&rdquo;, which means the lookup itself did not complete.
        </p>
      </div>

      {result.topCitedDomains.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Who gets cited instead</h2>
          <p className="text-xs text-slate-500 mb-3">
            The sources these answers actually drew on, most frequent first. This is the
            actionable half: these are the pages to beat.
          </p>
          <div className="flex flex-wrap gap-2">
            {result.topCitedDomains.map(d => (
              <span key={d.domain}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  result.domain && d.domain === result.domain.replace(/^www\./, '')
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}>
                {d.domain} <span className="text-slate-400">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Prompt by prompt</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="text-left font-bold pb-2">Prompt</th>
                <th className="text-center font-bold pb-2">AI Overviews</th>
                <th className="text-center font-bold pb-2">AI Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.outcomes.map((o, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-slate-700">{o.prompt}</td>
                  <td className="py-2 text-center"><Cell r={o.aiOverview} /></td>
                  <td className="py-2 text-center"><Cell r={o.aiMode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-3xl font-black text-slate-900 tabular-nums">{value.toLocaleString()}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{label}</div>
      <div className="text-[11px] text-slate-400 mt-1">{hint}</div>
    </div>
  )
}

function SurfaceRow({ label, t, of }: { label: string; t: SurfaceTotals; of: number }) {
  return (
    <tr>
      <td className="py-2 font-semibold text-slate-800">{label}</td>
      <td className="py-2 text-right tabular-nums text-slate-600">{t.answers} of {of}</td>
      <td className="py-2 text-right tabular-nums font-bold text-slate-900">{t.mentions}</td>
      <td className="py-2 text-right tabular-nums text-slate-600">{t.cited}</td>
      <td className={`py-2 text-right tabular-nums ${t.failed > 0 ? 'text-amber-600 font-semibold' : 'text-slate-300'}`}>
        {t.failed}
      </td>
    </tr>
  )
}

/** Three states, kept visually distinct because they mean different things. */
function Cell({ r }: { r: SurfaceOutcome | null }) {
  if (r === null) return <span className="text-[10px] font-bold uppercase text-amber-600">not checked</span>
  if (!r.answerPresent) return <span className="text-[11px] text-slate-300">no AI answer</span>
  if (r.mentions === 0 && !r.cited) return <span className="text-[11px] text-slate-400">absent</span>
  return (
    <span className="text-xs font-bold text-emerald-700">
      {r.mentions > 0 ? `${r.mentions}×` : ''}{r.cited ? ' cited' : ''}
    </span>
  )
}
