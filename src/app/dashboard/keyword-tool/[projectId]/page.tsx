'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MAGIC_MAX_KD, MAGIC_MIN_VOLUME, isMagicCandidate, isBrandQuery, parseTopDomains } from '@/lib/magic-keywords'

type KeywordRow = {
  id: string
  keyword: string
  isSeed: boolean
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  trend: string | null
  intent: string | null
  topDomains: string | null
}

type Project = {
  id: string
  name: string
  targetLocation: string
  createdAt: string
  keywords: KeywordRow[]
}

function difficultyColor(d: number | null) {
  if (d === null) return 'text-slate-400'
  if (d <= 30) return 'text-green-600'
  if (d <= 60) return 'text-amber-600'
  return 'text-red-600'
}

function trendBadge(trend: string | null) {
  if (trend === 'rising') return <span className="text-green-600 text-xs font-bold">▲ Rising</span>
  if (trend === 'falling') return <span className="text-red-500 text-xs font-bold">▼ Falling</span>
  if (trend === 'stable') return <span className="text-slate-400 text-xs">— Stable</span>
  return <span className="text-slate-300 text-xs">—</span>
}

function intentBadge(intent: string | null) {
  if (!intent) return <span className="text-slate-300 text-xs">—</span>
  const colors: Record<string, string> = {
    informational: 'bg-blue-100 text-blue-700',
    navigational: 'bg-purple-100 text-purple-700',
    commercial: 'bg-amber-100 text-amber-700',
    transactional: 'bg-green-100 text-green-700',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${colors[intent] ?? 'bg-slate-100 text-slate-600'}`}>{intent}</span>
}

// Standard SEO/marketing mapping from search intent to funnel stage — not a separate
// DataForSEO field, derived from the intent we already store.
function funnelStage(intent: string | null): string | null {
  if (intent === 'informational') return 'TOFU'
  if (intent === 'commercial') return 'MOFU'
  if (intent === 'transactional' || intent === 'navigational') return 'BOFU'
  return null
}

/** The evidence column: the domains actually holding the top 3 spots. Deliberately raw
 *  rather than scored — recognising "nike.com" as unbeatable is something the user does
 *  instantly and no single difficulty number does reliably. */
function topDomainsCell(stored: string | null) {
  if (stored === null) return <span className="text-slate-300 text-xs">Not checked</span>
  const domains = parseTopDomains(stored)
  if (domains.length === 0) return <span className="text-slate-400 text-xs">No results</span>
  return (
    <div className="flex flex-wrap gap-1">
      {domains.map(d => (
        <span key={d} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
          {d.replace(/^www\./, '')}
        </span>
      ))}
    </div>
  )
}

function funnelBadge(intent: string | null) {
  const stage = funnelStage(intent)
  if (!stage) return <span className="text-slate-300 text-xs">—</span>
  const colors: Record<string, string> = {
    TOFU: 'bg-blue-100 text-blue-700',
    MOFU: 'bg-amber-100 text-amber-700',
    BOFU: 'bg-green-100 text-green-700',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors[stage]}`}>{stage}</span>
}

export default function KeywordListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'keyword'>('volume')
  const [newSeed, setNewSeed] = useState('')
  const [addingSeed, setAddingSeed] = useState(false)
  const [addError, setAddError] = useState('')
  const [tab, setTab] = useState<'all' | 'magic'>('all')
  const [showBrand, setShowBrand] = useState(false)
  const [checkingSerps, setCheckingSerps] = useState(false)
  const [serpCheckMsg, setSerpCheckMsg] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/tools/keyword-tool/${projectId}`)
    const d = await r.json()
    if (r.status === 404) { router.push('/dashboard/keyword-tool'); return }
    if (d.data) setProject(d.data)
    setLoading(false)
  }, [projectId, router])

  useEffect(() => { load() }, [load])

  async function addSeed() {
    if (!newSeed.trim()) return
    setAddingSeed(true); setAddError('')
    const r = await fetch(`/api/tools/keyword-tool/${projectId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedKeyword: newSeed.trim() }),
    })
    const d = await r.json()
    if (!r.ok) { setAddError(d.error || 'Failed'); setAddingSeed(false); return }
    setNewSeed('')
    await load()
    setAddingSeed(false)
  }

  async function checkSerps() {
    setCheckingSerps(true); setSerpCheckMsg('')
    const r = await fetch(`/api/tools/keyword-tool/${projectId}/serp-check`, { method: 'POST' })
    const d = await r.json()
    if (!r.ok) { setSerpCheckMsg(d.error || 'Failed'); setCheckingSerps(false); return }
    setSerpCheckMsg(
      d.data.remaining > 0
        ? `Checked ${d.data.checked} — ${d.data.remaining} left`
        : `Checked ${d.data.checked}`
    )
    await load()
    setCheckingSerps(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
  if (!project) return null

  const kws = [...project.keywords]
  if (sortBy === 'volume') kws.sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
  else if (sortBy === 'difficulty') kws.sort((a, b) => (a.difficulty ?? 999) - (b.difficulty ?? 999))
  else if (sortBy === 'keyword') kws.sort((a, b) => a.keyword.localeCompare(b.keyword))

  const totalVolume = project.keywords.reduce((s, k) => s + (k.searchVolume ?? 0), 0)
  const withDifficulty = project.keywords.filter((k): k is KeywordRow & { difficulty: number } => k.difficulty !== null)
  const avgDifficulty = withDifficulty.length > 0
    ? Math.round(withDifficulty.reduce((s, k) => s + k.difficulty, 0) / withDifficulty.length)
    : null
  const seedCount = project.keywords.filter(k => k.isSeed).length

  // Best first = most traffic available at a difficulty you can realistically win.
  const allCandidates = project.keywords
    .filter(isMagicCandidate)
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
  // Rivals' brand terms score low difficulty precisely because they're brand terms;
  // hidden rather than dropped, so the filter is auditable instead of silent.
  const brandKws = allCandidates.filter(isBrandQuery)
  const magicKws = showBrand ? allCandidates : allCandidates.filter(k => !isBrandQuery(k))
  const uncheckedSerps = allCandidates.filter(k => k.topDomains === null).length
  // Keywords DataForSEO returned no difficulty for can't be judged either way; surfaced
  // in the empty state so a short list doesn't look like a bug.
  const unratedCount = project.keywords.filter(k => k.difficulty === null).length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/keyword-tool')} className="text-slate-400 hover:text-slate-600">←</button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{project.name}</h1>
              <div className="text-xs text-slate-400">{project.targetLocation} · {project.keywords.length} keywords</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Keywords', value: project.keywords.length, color: 'text-slate-800' },
            { label: 'Seed keywords', value: seedCount, color: 'text-blue-600' },
            { label: 'Total volume', value: totalVolume.toLocaleString(), color: 'text-slate-700' },
            { label: 'Avg. difficulty', value: avgDifficulty ?? '—', color: 'text-slate-700' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          <button onClick={() => setTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            All Keywords ({project.keywords.length})
          </button>
          <button onClick={() => setTab('magic')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'magic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Magic Keywords ({magicKws.length})
          </button>
        </div>

        {tab === 'all' && (
        <>
        {/* Sort */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          Sort:
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="rounded border border-slate-200 px-2 py-1 text-xs">
            <option value="volume">Volume</option>
            <option value="difficulty">Difficulty</option>
            <option value="keyword">A–Z</option>
          </select>
        </div>

        {/* Keywords table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Keyword</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                <th
                  className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-help"
                  title="Keyword Difficulty (0–100): how hard it is to rank on page one, based on the backlink strength of the pages currently ranking. Lower is easier."
                >
                  KD <span className="text-slate-300 normal-case">ⓘ</span>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CPC</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trend</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Intent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {kws.map(kw => (
                <tr key={kw.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{kw.keyword}</span>
                      {kw.isSeed && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Seed</span>}
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 text-xs text-slate-600">
                    {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : '—'}
                  </td>
                  <td className={`text-center px-3 py-3 text-xs font-semibold ${difficultyColor(kw.difficulty)}`}>
                    {kw.difficulty ?? '—'}
                  </td>
                  <td className="text-center px-3 py-3 text-xs text-slate-600">
                    {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-center px-3 py-3">{trendBadge(kw.trend)}</td>
                  <td className="text-center px-3 py-3">{intentBadge(kw.intent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {kws.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No keywords in this list</div>
          )}
        </div>

        {/* KD legend — always visible, not hover-only, so it's usable on mobile */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 px-1">
          <span className="font-semibold text-slate-600">Keyword Difficulty:</span>
          <span><span className="text-green-600 font-semibold">0–30</span> = easy to rank</span>
          <span><span className="text-amber-600 font-semibold">31–60</span> = moderate</span>
          <span><span className="text-red-600 font-semibold">61+</span> = hard, needs strong backlinks</span>
          <span><span className="text-slate-400 font-semibold">—</span> = no difficulty data for this keyword</span>
        </div>
        </>
        )}

        {tab === 'magic' && (
        <>
        {/* What qualifies — stated in full so the tab is never a black box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-700">Magic Keywords</div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Keywords in this list you can realistically win: difficulty of{' '}
              <span className="font-semibold text-green-600">{MAGIC_MAX_KD} or under</span> with at least{' '}
              <span className="font-semibold text-slate-700">{MAGIC_MIN_VOLUME} searches/month</span>. Highest volume first.
            </p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
              Difficulty scores the backlinks of the <em>pages</em> ranking, so a thin page on a big domain can
              score low. Check the SERP to see who actually ranks — if it&apos;s all major brands, skip the keyword
              whatever its KD says.
            </p>
            {uncheckedSerps > 0 && (
              <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
                Checking SERPs also filters out competitors&apos; brand queries, which score low difficulty because
                nobody competes for a rival&apos;s name. That can only be told from who ranks, so{' '}
                <span className="font-semibold text-slate-700">{uncheckedSerps} unchecked</span>{' '}
                {uncheckedSerps === 1 ? 'keyword is' : 'keywords are'} still unfiltered.
              </p>
            )}
            {brandKws.length > 0 && (
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="font-semibold text-amber-600">{brandKws.length} brand {brandKws.length === 1 ? 'query' : 'queries'}</span>
                {showBrand ? ' shown' : ' hidden'} — competitors&apos; own names ({brandKws.slice(0, 3).map(k => k.keyword).join(', ')}
                {brandKws.length > 3 ? '…' : ''}). They score low difficulty because nobody competes for a rival&apos;s
                brand, not because you can win them.{' '}
                <button onClick={() => setShowBrand(!showBrand)} className="font-semibold text-blue-600 hover:underline">
                  {showBrand ? 'Hide' : 'Show anyway'}
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {serpCheckMsg && <span className="text-xs text-green-600 font-medium">{serpCheckMsg}</span>}
            <button onClick={checkSerps} disabled={checkingSerps || uncheckedSerps === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
              {checkingSerps ? 'Checking...' : uncheckedSerps > 0 ? `Check SERPs (${uncheckedSerps})` : 'All SERPs checked'}
            </button>
          </div>
        </div>

        {/* Magic keywords table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Keyword</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">KD</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Who ranks now</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Intent</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Funnel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {magicKws.map(kw => (
                <tr key={kw.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{kw.keyword}</span>
                      {kw.isSeed && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Seed</span>}
                      {isBrandQuery(kw) && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Brand</span>}
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 text-xs text-slate-600">
                    {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : '—'}
                  </td>
                  <td className={`text-center px-3 py-3 text-xs font-semibold ${difficultyColor(kw.difficulty)}`}>
                    {kw.difficulty ?? '—'}
                  </td>
                  <td className="px-3 py-3">{topDomainsCell(kw.topDomains)}</td>
                  <td className="text-center px-3 py-3">{intentBadge(kw.intent)}</td>
                  <td className="text-center px-3 py-3">{funnelBadge(kw.intent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {magicKws.length === 0 && allCandidates.length > 0 && (
            <div className="text-center py-8 px-4 text-slate-400 text-sm">
              Every qualifying keyword here is a competitor&apos;s brand query, so none is a real opening.
              Use &quot;Show anyway&quot; above to see them.
            </div>
          )}
          {allCandidates.length === 0 && (
            <div className="text-center py-8 px-4 text-slate-400 text-sm">
              No keyword in this list is both KD {MAGIC_MAX_KD} or under and at {MAGIC_MIN_VOLUME}+ searches/month.
              Try researching a more specific seed keyword — longer, more niche phrases tend to score lower difficulty.
              {unratedCount > 0 && ` (${unratedCount} keyword${unratedCount === 1 ? ' has' : 's have'} no difficulty data and can't be scored.)`}
            </div>
          )}
        </div>
        </>
        )}

        {/* Research another seed keyword */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-slate-700 mb-3">Research Another Keyword</div>
          <div className="flex gap-3">
            <input value={newSeed} onChange={e => setNewSeed(e.target.value)} placeholder="another seed keyword"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={addSeed} disabled={addingSeed || !newSeed.trim()}
              className="rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {addingSeed ? 'Researching...' : 'Add to List'}
            </button>
          </div>
          {addError && <div className="text-xs text-red-600 mt-2">{addError}</div>}
        </div>
      </div>
    </div>
  )
}
