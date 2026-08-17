'use client'

import { useState } from 'react'
import Link from 'next/link'

type Dimension = { score: number; finding: string }

type Result = {
  overall: number
  summary: string
  dimensions: {
    experience: Dimension
    expertise: Dimension
    authoritativeness: Dimension
    trustworthiness: Dimension
  }
  recommendations: string[]
  remaining?: number
  dailyLimit?: number
  analysedChars?: number
  submittedChars?: number
}

/** Order is Google's own — Experience, Expertise, Authoritativeness, Trustworthiness —
 *  rather than best-score-first, so the acronym stays readable down the page. */
const DIMENSIONS: { key: keyof Result['dimensions']; label: string; blurb: string }[] = [
  { key: 'experience',       label: 'Experience',       blurb: 'First-hand involvement with the subject' },
  { key: 'expertise',        label: 'Expertise',        blurb: 'Demonstrated knowledge and depth' },
  { key: 'authoritativeness', label: 'Authoritativeness', blurb: 'Recognition as a source worth citing' },
  { key: 'trustworthiness',  label: 'Trustworthiness',  blurb: 'Accuracy, transparency and safety' },
]

function toneFor(score: number) {
  if (score >= 70) return { text: 'text-emerald-700', bg: 'bg-emerald-500', ring: 'border-emerald-200' }
  if (score >= 40) return { text: 'text-amber-700', bg: 'bg-amber-500', ring: 'border-amber-200' }
  return { text: 'text-red-700', bg: 'bg-red-500', ring: 'border-red-200' }
}

const SAMPLE = `I spent six months migrating our 40,000-page catalogue to a headless setup, and the traffic drop in week three nearly got the project cancelled. Here is what actually caused it, what the logs showed, and the three changes that recovered it.`

export function PublicEeat() {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exhausted, setExhausted] = useState(false)

  async function analyse() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch('/api/public/eeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (r.status === 429) setExhausted(true)
        throw new Error(d.error || 'Something went wrong.')
      }
      setResult(d.data as Result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const chars = content.length
  const tooLong = chars > 20_000

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 p-5">
        <label htmlFor="eeat-content" className="block text-sm font-bold text-slate-800 mb-2">
          Paste your page content
        </label>
        <textarea
          id="eeat-content"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={10}
          placeholder={SAMPLE}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={tooLong ? 'text-red-600 font-semibold' : 'text-slate-400'}>
            {chars.toLocaleString()} characters
            {chars > 3_000 && !tooLong && ' — the first 3,000 are analysed'}
            {tooLong && ' — over the 20,000 limit'}
          </span>
          <button
            type="button"
            onClick={() => setContent(SAMPLE)}
            className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            Use example text
          </button>
        </div>

        <button
          onClick={analyse}
          disabled={loading || !content.trim() || tooLong}
          className="mt-4 w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analysing…' : 'Score my E-E-A-T'}
        </button>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {exhausted && (
              <>
                {' '}
                <Link href="/signup" className="font-bold underline underline-offset-2">
                  Create a free account
                </Link>{' '}
                to keep going.
              </>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-5">
          <div className={`rounded-2xl border p-6 text-center ${toneFor(result.overall).ring}`}>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Overall E-E-A-T
            </div>
            <div className={`mt-1 text-6xl font-black ${toneFor(result.overall).text}`}>
              {result.overall}
              <span className="text-2xl text-slate-300">/100</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              {result.summary}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DIMENSIONS.map(d => {
              const dim = result.dimensions?.[d.key]
              if (!dim) return null
              const tone = toneFor(dim.score)
              return (
                <div key={d.key} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-800">{d.label}</h3>
                    <span className={`text-2xl font-black ${tone.text}`}>{dim.score}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tone.bg}`}
                      style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{d.blurb}</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{dim.finding}</p>
                </div>
              )
            })}
          </div>

          {result.recommendations?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">What to fix first</h3>
              <ol className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold grid place-items-center">
                      {i + 1}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              {typeof result.analysedChars === 'number' && typeof result.submittedChars === 'number'
                ? `Scored the first ${result.analysedChars.toLocaleString()} of ${result.submittedChars.toLocaleString()} characters.`
                : null}
            </span>
            {typeof result.remaining === 'number' && typeof result.dailyLimit === 'number' && (
              <span>
                {result.remaining} of {result.dailyLimit} free analyses left today
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
