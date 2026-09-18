'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The AI Presence panel: what the stored scans add up to, rather than what one scan found.
 *
 * Reads only. Every endpoint behind it is a GET over runs that were already billed when they
 * ran, so opening this tab spends nothing — and the one thing it can write is a competitor
 * mark, which is a judgement the customer makes, not a measurement.
 *
 * The rule the whole panel is built around: never print a number where the honest answer is
 * "not measured". A missing component says so and is excluded from the score; a delta with no
 * previous period is a dash and a reason, not a zero; a run that predates URL capture says
 * the pages were not recorded rather than showing an empty list that reads as failure.
 */

type ScoreComponent = {
  key: string
  label: string
  score: number | null
  weight: number
  effectiveWeight: number
  available: boolean
  detail: string
}

type Overview = {
  scopes: Array<{ brand: string; domain: string | null; runCount: number; lastRunAt: string }>
  scope: { brand: string; domain: string | null; runCount: number; lastRunAt: string } | null
  periodDays?: number
  score?: {
    totalScore: number | null
    components: ScoreComponent[]
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    dataCoverage: { answers: number; attempted: number; runs: number }
    explanation: string[]
    insufficientReason: string | null
  }
  metrics?: {
    visibility: { named: number; answers: number; rate: number | null }
    citations: {
      citationCount: number
      opportunities: number
      citationRate: number | null
      citedPages: Array<{ url: string; title: string; count: number }>
      pagesUnavailable: boolean
    }
    authority: {
      targetCitations: number
      totalCitations: number
      share: number | null
      topDomains: Array<{ domain: string; count: number }>
    }
    coverage: { answered: number; attempted: number; rate: number | null }
  }
  changes?: Array<{
    metric: string
    current: number | null
    previous: number | null
    delta: number | null
    unavailableReason: string | null
  }>
  providers?: string[]
  empty?: string
}

/**
 * `/api/ai-presence/citations`.
 *
 * Read from its own endpoint rather than from the overview's copy of the same numbers,
 * because the endpoint also carries the sentences that qualify them — what "cited" does not
 * mean, why a share is not a ranking, why an empty page list may mean "not recorded". Those
 * belong beside the number they describe, on the server, not restated in TSX where the two
 * can drift apart.
 */
type CitationsPayload = {
  citationCount: number
  opportunities: number
  citationRate: number | null
  citedPages: Array<{ url: string; title: string; count: number }>
  citedPagesUnavailable: boolean
  citedPagesNote: string | null
  authority: {
    targetCitations: number
    totalCitations: number
    share: number | null
    otherCitedDomains: Array<{ domain: string; count: number }>
    label: string
    note: string
  }
  empty: string | null
  noCitations: string | null
  provenance: { citations: string }
}

type QueriesPayload = {
  queries: Array<{
    query: string
    type: string
    typeReason: string
    answers: number
    mentions: number
    citations: number
    visibility: number | null
    lastSeen: string
  }>
  total?: number
  types: Record<string, number> | null
  empty: string | null
}

type GapsPayload = {
  gaps: Array<{
    query: string
    provider: string
    competitorDomain: string
    competitorUrl: string | null
    competitorTitle: string | null
    observedAt: string
  }>
  competitorsTracked?: string[]
  suggestedToMark?: Array<{ domain: string; count: number }>
  empty: string | null
}

type OpportunitiesPayload = {
  opportunities: Array<{
    query: string
    queryType: string
    competitors: string[]
    competitorUrls: Array<{ domain: string; url: string; title: string }>
    competitorCitationCount: number
    targetCitationCount: number
    recommendation: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
  empty: string | null
}

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

/** A rate that may legitimately be unknown. Null renders as a dash, never as 0%. */
function pct(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)}%`
}

export default function AiPresencePanel() {
  const [brand, setBrand] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const [overview, setOverview] = useState<Overview | null>(null)
  const [citations, setCitations] = useState<CitationsPayload | null>(null)
  const [queries, setQueries] = useState<QueriesPayload | null>(null)
  const [gaps, setGaps] = useState<GapsPayload | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunitiesPayload | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = (extra = '') =>
        `?days=${days}${brand ? `&brand=${encodeURIComponent(brand)}` : ''}${extra}`
      const paths = [
        `/api/ai-presence/overview${qs()}`,
        `/api/ai-presence/queries${qs('&limit=50')}`,
        `/api/ai-presence/gaps${qs()}`,
        `/api/ai-presence/opportunities${qs()}`,
        `/api/ai-presence/citations${qs()}`,
      ]
      const responses = await Promise.all(paths.map(p => fetch(p)))
      const bodies = await Promise.all(responses.map(r => r.json().catch(() => ({}))))
      const failed = responses.findIndex(r => !r.ok)
      if (failed !== -1) throw new Error(bodies[failed]?.error || 'Could not load AI Presence.')

      setOverview(bodies[0] as Overview)
      setQueries(bodies[1] as QueriesPayload)
      setGaps(bodies[2] as GapsPayload)
      setOpportunities(bodies[3] as OpportunitiesPayload)
      setCitations(bodies[4] as CitationsPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load AI Presence.')
    } finally {
      setLoading(false)
    }
  }, [brand, days])

  useEffect(() => {
    load()
  }, [load])

  async function markCompetitor(domain: string) {
    const scopeBrand = overview?.scope?.brand
    if (!scopeBrand) return
    setMarking(domain)
    setError('')
    try {
      const r = await fetch('/api/ai-presence/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: scopeBrand, competitorDomain: domain }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not mark that domain.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark that domain.')
    } finally {
      setMarking('')
    }
  }

  async function unmarkCompetitor(domain: string) {
    const scopeBrand = overview?.scope?.brand
    if (!scopeBrand) return
    setMarking(domain)
    setError('')
    try {
      const r = await fetch(
        `/api/ai-presence/competitors?brand=${encodeURIComponent(scopeBrand)}&domain=${encodeURIComponent(domain)}`,
        { method: 'DELETE' }
      )
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not remove that domain.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that domain.')
    } finally {
      setMarking('')
    }
  }

  if (loading && !overview) {
    return <p className="text-xs text-slate-400 py-8 text-center">Loading your AI presence…</p>
  }

  if (error && !overview) {
    return <p className="text-xs text-red-600 font-medium py-8 text-center">{error}</p>
  }

  // Nothing scanned yet. Told as the next step rather than as a zero, which would read as a
  // bad result for work the customer has not done yet.
  if (overview && !overview.scope) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-sm font-bold text-slate-800">No AI presence data yet</h2>
        <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {overview.empty ??
            'Run an AI Visibility scan to start building your AI presence data.'}{' '}
          Everything on this tab is counted from scans you have already run — there is nothing
          to estimate from before the first one.
        </p>
      </div>
    )
  }

  const scope = overview?.scope
  const score = overview?.score
  const metrics = overview?.metrics

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {(overview?.scopes.length ?? 0) > 1 && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            Brand
            <select
              value={scope?.brand ?? ''}
              onChange={e => setBrand(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {overview?.scopes.map(s => (
                <option key={s.brand} value={s.brand}>
                  {s.brand} ({s.runCount} scan{s.runCount === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                days === p.days ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {scope && (
          <span className="text-[11px] text-slate-400">
            {scope.domain ?? 'no domain set'} &middot; {scope.runCount} scan
            {scope.runCount === 1 ? '' : 's'} &middot; last{' '}
            {new Date(scope.lastRunAt).toISOString().slice(0, 10)}
          </span>
        )}
        {loading && <span className="text-[11px] text-slate-400">refreshing…</span>}
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      {score && <ScoreCard score={score} providers={overview?.providers ?? []} />}

      {overview?.changes && <Changes changes={overview.changes} days={days} />}

      {citations && metrics && (
        <Citations
          citations={citations}
          visibility={metrics.visibility}
          coverage={metrics.coverage}
          domain={scope?.domain ?? null}
        />
      )}

      {gaps && (
        <Competitors
          tracked={gaps.competitorsTracked ?? []}
          suggested={gaps.suggestedToMark ?? []}
          marking={marking}
          onMark={markCompetitor}
          onUnmark={unmarkCompetitor}
        />
      )}

      {gaps && <Gaps gaps={gaps} domain={scope?.domain ?? null} />}

      {opportunities && <Opportunities payload={opportunities} />}

      {queries && <Queries payload={queries} />}
    </div>
  )
}

function ScoreCard({
  score,
  providers,
}: {
  score: NonNullable<Overview['score']>
  providers: string[]
}) {
  const excluded = score.components.filter(c => !c.available)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">AI Presence Score</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Measured on {providers.join(' and ') || 'Google AI surfaces'} only. Not ChatGPT,
            Gemini, Perplexity or Claude.
          </p>
        </div>
        <div className="text-right">
          {score.totalScore === null ? (
            <div className="text-lg font-black text-slate-400">Not enough data</div>
          ) : (
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-4xl font-black tabular-nums text-slate-900">
                {score.totalScore}
              </span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-500">
            {score.dataCoverage.answers} AI answers &middot; {score.dataCoverage.runs} scan
            {score.dataCoverage.runs === 1 ? '' : 's'} &middot;{' '}
            <span
              className={`font-bold ${
                score.confidence === 'HIGH'
                  ? 'text-emerald-700'
                  : score.confidence === 'MEDIUM'
                    ? 'text-amber-600'
                    : 'text-slate-400'
              }`}
            >
              {score.confidence.toLowerCase()} confidence
            </span>
          </div>
        </div>
      </div>

      {score.insufficientReason && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {score.insufficientReason}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400">
              <th className="text-left font-bold pb-2">Component</th>
              <th className="text-right font-bold pb-2">Score</th>
              <th className="text-right font-bold pb-2">Weight</th>
              <th className="text-left font-bold pb-2 pl-4">Counted from</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {score.components.map(c => (
              <tr key={c.key} className={c.available ? '' : 'text-slate-400'}>
                <td className="py-2 font-semibold text-slate-800">{c.label}</td>
                <td className="py-2 text-right tabular-nums font-bold text-slate-900">
                  {c.score === null ? <span className="text-slate-300">—</span> : c.score}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-600">
                  {c.available ? (
                    `${Math.round(c.effectiveWeight * 100)}%`
                  ) : (
                    // The configured weight is shown struck through so it is obvious the
                    // component was dropped rather than quietly scored as zero.
                    <span className="text-slate-300 line-through">
                      {Math.round(c.weight * 100)}%
                    </span>
                  )}
                </td>
                <td className="py-2 pl-4 text-[11px] text-slate-500">{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {excluded.length > 0 && (
        <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          {excluded.map(c => c.label).join(', ')} {excluded.length === 1 ? 'has' : 'have'} no data
          source yet, so {excluded.length === 1 ? 'it is' : 'they are'} excluded and the
          remaining weights add back up to 100%. A component we cannot measure is never counted
          as a zero against you.
        </p>
      )}

      {score.explanation.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-900">
            Show the arithmetic
          </summary>
          <ul className="mt-2 space-y-1">
            {score.explanation.map((line, i) => (
              <li key={i} className="text-[11px] text-slate-500">
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Changes({
  changes,
  days,
}: {
  changes: NonNullable<Overview['changes']>
  days: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">
        Against the previous {days} days
      </h2>
      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {changes.map(c => (
          <div key={c.metric} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] font-bold text-slate-500">{c.metric}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black tabular-nums text-slate-900">
                {c.current === null ? '—' : c.current}
              </span>
              {c.delta !== null && (
                <span
                  className={`text-xs font-bold tabular-nums ${
                    c.delta > 0 ? 'text-emerald-700' : c.delta < 0 ? 'text-red-600' : 'text-slate-400'
                  }`}
                >
                  {c.delta > 0 ? '+' : ''}
                  {c.delta}
                </span>
              )}
            </div>
            {/* No previous period means no delta and a reason — never a baseline of zero,
                which would turn a first scan into spectacular fictional growth. */}
            <div className="mt-0.5 text-[10px] text-slate-400 leading-snug">
              {c.unavailableReason ?? `was ${c.previous}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Citations({
  citations,
  visibility,
  coverage,
  domain,
}: {
  citations: CitationsPayload
  visibility: NonNullable<Overview['metrics']>['visibility']
  coverage: NonNullable<Overview['metrics']>['coverage']
  domain: string | null
}) {
  const { authority } = citations

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Citation performance</h2>
        <p className="mt-0.5 text-[11px] text-slate-400">
          &ldquo;Cited&rdquo; means {domain ?? 'your domain'} appeared among the sources of an AI
          answer we requested. It does not mean an AI crawler fetched the page, or that a model
          was trained on it &mdash; neither of which is observable.
        </p>
      </div>

      {/* No answers at all in the period, so there was nothing to be cited in. Said plainly,
          because 0% against a denominator of zero is not a result. */}
      {citations.empty && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
          {citations.empty}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          label="Named in answers"
          value={pct(visibility.rate)}
          hint={`${visibility.named} of ${visibility.answers} AI answers`}
        />
        <Metric
          label="Cited as a source"
          value={pct(citations.citationRate)}
          hint={`${citations.citationCount} of ${citations.opportunities} AI answers`}
        />
        <Metric
          // The endpoint names this metric, so the page cannot call it something the API does
          // not. "Share of authority" is a phrase worth keeping identical wherever it appears.
          label={authority.label}
          value={pct(authority.share)}
          hint={`${authority.targetCitations} of ${authority.totalCitations} citations counted`}
        />
        <Metric
          label="Prompts answered"
          value={pct(coverage.rate)}
          hint={`${coverage.answered} of ${coverage.attempted} prompts got an AI answer`}
        />
      </div>

      {/* Answers existed and none of them cited the domain. A real, reportable result, and a
          different statement from having had no opportunities. */}
      {citations.noCitations && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          {citations.noCitations}
        </p>
      )}

      <p className="text-[11px] text-slate-400">{authority.note}</p>

      <div>
        <h3 className="text-xs font-bold text-slate-700">Your pages that got cited</h3>
        {citations.citedPagesUnavailable ? (
          // Distinct from "no pages were cited". An older scan never recorded URLs, and
          // showing an empty list would read as a total failure to be cited.
          <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            {citations.citedPagesNote}
          </p>
        ) : citations.citedPages.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-slate-400">
            No pages of your domain were cited in this period.
          </p>
        ) : (
          <ul className="mt-1.5 divide-y divide-slate-100">
            {citations.citedPages.map(p => (
              <li key={p.url} className="flex items-center gap-3 py-1.5">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:underline truncate flex-1"
                >
                  {p.title || p.url}
                </a>
                <span className="text-[11px] tabular-nums text-slate-500 shrink-0">
                  {p.count}&times;
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {authority.otherCitedDomains.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-700">Other domains these answers cited</h3>
          {/* The endpoint deliberately does not call these competitors, and neither does this.
              An AI answer cites whatever it used, which is routinely Wikipedia or a newspaper. */}
          <p className="mt-0.5 text-[11px] text-slate-400">
            Sources these answers drew on, most frequent first. Not competitors until you say
            so.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {authority.otherCitedDomains.map(d => (
              <span
                key={d.domain}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
              >
                {d.domain} <span className="text-slate-400">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400">{citations.provenance.citations}</p>
    </div>
  )
}

function Competitors({
  tracked,
  suggested,
  marking,
  onMark,
  onUnmark,
}: {
  tracked: string[]
  suggested: Array<{ domain: string; count: number }>
  marking: string
  onMark: (domain: string) => void
  onUnmark: (domain: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">Competitors you track</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        The one thing on this tab you decide rather than we measure. Citation gaps and
        opportunities are counted against these domains only, because promoting every cited
        source to &ldquo;competitor&rdquo; would bury the two that matter under fifteen that do
        not.
      </p>

      <div className="mt-3">
        {tracked.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            None marked yet. Pick one below to start seeing gaps.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tracked.map(d => (
              <button
                key={d}
                onClick={() => onUnmark(d)}
                disabled={marking === d}
                className="group text-xs px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 font-bold hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
                title="Remove this competitor"
              >
                {d} <span className="text-blue-400 group-hover:text-red-500">&times;</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {suggested.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold text-slate-700">Cited domains you could mark</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Ranked by how often each was cited in your answers. Wikipedia, Reddit and the major
            social sites are filtered out.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggested.map(d => (
              <button
                key={d.domain}
                onClick={() => onMark(d.domain)}
                disabled={marking === d.domain}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40"
                title="Mark as a competitor"
              >
                + {d.domain} <span className="text-slate-400">{d.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Gaps({ gaps, domain }: { gaps: GapsPayload; domain: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">Citation gaps</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        Queries where a competitor you track was cited and {domain ?? 'your domain'} was not.
        Read from the answers themselves.
      </p>

      {gaps.empty ? (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">{gaps.empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="text-left font-bold pb-2">Query</th>
                <th className="text-left font-bold pb-2">Surface</th>
                <th className="text-left font-bold pb-2">Cited instead</th>
                <th className="text-right font-bold pb-2">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gaps.gaps.map((g, i) => (
                <tr key={`${g.query}-${g.provider}-${g.competitorDomain}-${i}`}>
                  <td className="py-2 pr-3 text-slate-700">{g.query}</td>
                  <td className="py-2 pr-3 text-[11px] text-slate-500">{g.provider}</td>
                  <td className="py-2 pr-3">
                    {g.competitorUrl ? (
                      <a
                        href={g.competitorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-700 hover:underline"
                      >
                        {g.competitorTitle || g.competitorDomain}
                      </a>
                    ) : (
                      // No URL means the run predates page capture, not that the answer
                      // cited a domain with no page behind it.
                      <span className="text-xs text-slate-700">
                        {g.competitorDomain}{' '}
                        <span className="text-slate-400">&mdash; page not recorded</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right text-[11px] tabular-nums text-slate-400">
                    {new Date(g.observedAt).toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Opportunities({ payload }: { payload: OpportunitiesPayload }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">Content opportunities</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        Built by counting, not by a model. Each one carries the answers it came from, so it can
        be checked rather than taken on trust.
      </p>

      {payload.empty ? (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
          {payload.empty}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {payload.opportunities.map(o => (
            <div key={o.query} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    o.priority === 'HIGH'
                      ? 'bg-red-100 text-red-700'
                      : o.priority === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {o.priority}
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                  {o.queryType.replace('_', ' ')}
                </span>
                <span className="text-sm font-semibold text-slate-800">{o.query}</span>
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{o.recommendation}</p>

              <div className="mt-2 text-[11px] text-slate-500">
                Rivals cited {o.competitorCitationCount}&times; &middot; you were cited{' '}
                {o.targetCitationCount}&times; &middot; {o.confidence.toLowerCase()} confidence
              </div>

              {o.competitorUrls.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {o.competitorUrls.map((u, i) => (
                    <li key={`${u.url}-${i}`}>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-700 hover:underline"
                      >
                        {u.domain} &mdash; {u.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Queries({ payload }: { payload: QueriesPayload }) {
  const types = payload.types

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">Queries measured</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        Only queries that were actually run. There is no suggested or example set here &mdash; an
        empty account shows an empty list.
      </p>

      {types && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(types).map(([type, n]) => (
            <span
              key={type}
              className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600"
            >
              {type.replace('_', ' ').toLowerCase()}{' '}
              <b className="text-slate-800 tabular-nums">{n}</b>
            </span>
          ))}
        </div>
      )}

      {payload.empty ? (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
          {payload.empty}
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="text-left font-bold pb-2">Query</th>
                  <th className="text-left font-bold pb-2">Type</th>
                  <th className="text-right font-bold pb-2">Answers</th>
                  <th className="text-right font-bold pb-2">Mentions</th>
                  <th className="text-right font-bold pb-2">Cited</th>
                  <th className="text-right font-bold pb-2">Named in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payload.queries.map(q => (
                  <tr key={q.query}>
                    <td className="py-2 pr-3 text-slate-700">{q.query}</td>
                    <td className="py-2 pr-3">
                      <span
                        className="text-[10px] font-bold uppercase text-slate-500"
                        title={q.typeReason}
                      >
                        {q.type.replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{q.answers}</td>
                    <td className="py-2 text-right tabular-nums font-bold text-slate-900">
                      {q.mentions}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{q.citations}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {pct(q.visibility)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            The result columns are read from the AI answers. The type column is Optmizly&rsquo;s
            own reading of the query text &mdash; hover it for the rule that fired.
            {payload.total && payload.total > payload.queries.length
              ? ` Showing ${payload.queries.length} of ${payload.total}.`
              : ''}
          </p>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="text-2xl font-black tabular-nums text-slate-900">{value}</div>
      <div className="text-[11px] font-bold text-slate-600 mt-0.5">{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{hint}</div>
    </div>
  )
}
