'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { exportRankTrackerCSV, exportRankTrackerPDF } from '@/lib/export'

type HistoryPoint = { rank: number | null; checkedDate: string }

type Keyword = {
  id: string
  keyword: string
  searchVolume: number | null
  difficulty: number | null
  currentRank: number | null
  currentUrl: string | null
  rankChange7d: number | null
  rankChange30d: number | null
  rankTrendPercent: number | null
  status: string
  lastRanked: string | null
  history: HistoryPoint[]
}

type Alert = {
  id: string
  keyword: string
  alertType: string
  oldRank: number | null
  newRank: number | null
  message: string
  read: boolean
  createdAt: string
}

type Project = {
  id: string
  name: string
  domain: string
  targetLocation: string
  deviceType: string
  lastUpdatedAt: string | null
  keywords: Keyword[]
  alerts: Alert[]
}

function rankBadge(rank: number | null) {
  if (rank === null) return <span className="text-slate-400 text-xs">—</span>
  if (rank <= 3) return <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-green-100 text-green-700 text-xs font-black">#{rank}</span>
  if (rank <= 10) return <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">#{rank}</span>
  if (rank <= 30) return <span className="inline-flex items-center justify-center w-9 h-6 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">#{rank}</span>
  return <span className="inline-flex items-center justify-center w-9 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">#{rank}</span>
}

function changeIndicator(change: number | null) {
  if (change === null) return <span className="text-slate-300 text-xs">—</span>
  if (change > 0) return <span className="text-green-600 text-xs font-bold">▲{change}</span>
  if (change < 0) return <span className="text-red-500 text-xs font-bold">▼{Math.abs(change)}</span>
  return <span className="text-slate-400 text-xs">—</span>
}

function MiniSparkline({ history }: { history: HistoryPoint[] }) {
  const points = [...history].sort((a, b) => new Date(a.checkedDate).getTime() - new Date(b.checkedDate).getTime()).slice(-14)
  if (points.length < 2) return <span className="text-slate-300 text-xs">No data</span>

  const ranks = points.map(p => p.rank ?? 101)
  const minR = Math.min(...ranks)
  const maxR = Math.max(...ranks)
  const range = maxR - minR || 1

  const W = 80, H = 24
  const coords = ranks.map((r, i) => {
    const x = (i / (ranks.length - 1)) * W
    const y = ((r - minR) / range) * (H - 4) + 2
    return `${x},${y}`
  })

  const improving = ranks[ranks.length - 1] < ranks[0]

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={improving ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]}
        r="2.5" fill={improving ? '#22c55e' : '#ef4444'} />
    </svg>
  )
}

function alertIcon(type: string) {
  const map: Record<string, string> = {
    top_3: '🥇', first_page: '📄', position_gain: '🚀', position_drop: '📉',
    new_ranking: '🆕', lost_ranking: '⚠️',
  }
  return map[type] ?? '🔔'
}

function difficultyColor(d: number | null) {
  if (d === null) return 'text-slate-400'
  if (d <= 30) return 'text-green-600'
  if (d <= 60) return 'text-amber-600'
  return 'text-red-600'
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [addKw, setAddKw] = useState('')
  const [addingKw, setAddingKw] = useState(false)
  const [deletingKw, setDeletingKw] = useState<string | null>(null)
  const [tab, setTab] = useState<'keywords' | 'alerts'>('keywords')
  const [sortBy, setSortBy] = useState<'rank' | 'change7d' | 'change30d' | 'volume'>('rank')
  const [filter, setFilter] = useState<'all' | 'top3' | 'top10' | 'top30' | 'notranking'>('all')
  const [kwError, setKwError] = useState('')
  const [checkMsg, setCheckMsg] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/tools/rank-tracker/${projectId}`)
    const d = await r.json()
    if (r.status === 404) { router.push('/dashboard/rank-tracker'); return }
    if (d.data) setProject(d.data)
    setLoading(false)
  }, [projectId, router])

  useEffect(() => { load() }, [load])

  async function runCheck() {
    setChecking(true)
    setCheckMsg('')
    const r = await fetch(`/api/tools/rank-tracker/${projectId}/check`, { method: 'POST' })
    const d = await r.json()
    if (d.data) setCheckMsg(`Updated ${d.data.checked} keywords${d.data.alerts > 0 ? `, ${d.data.alerts} new alert${d.data.alerts > 1 ? 's' : ''}` : ''}${d.data.skipped > 0 ? ` (${d.data.skipped} couldn't be checked, will retry next time)` : ''}`)
    else setCheckMsg(typeof d.error === 'string' ? d.error : 'Could not check rankings right now.')
    await load()
    setChecking(false)
  }

  async function addKeywords() {
    const kws = addKw.split('\n').map(k => k.trim()).filter(Boolean)
    if (!kws.length) return
    setAddingKw(true); setKwError('')
    const r = await fetch(`/api/tools/rank-tracker/${projectId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: kws }),
    })
    const d = await r.json()
    if (!r.ok) { setKwError(d.error || 'Failed'); setAddingKw(false); return }
    setAddKw('')
    await load()
    setAddingKw(false)
  }

  async function removeKeyword(kwId: string) {
    setDeletingKw(kwId)
    await fetch(`/api/tools/rank-tracker/${projectId}/keywords/${kwId}`, { method: 'DELETE' })
    await load()
    setDeletingKw(null)
  }

  async function markAlertsRead() {
    await fetch(`/api/tools/rank-tracker/${projectId}/alerts`, { method: 'PATCH' })
    setProject(prev => prev ? { ...prev, alerts: prev.alerts.map(a => ({ ...a, read: true })) } : prev)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
  if (!project) return null

  const unreadAlerts = project.alerts.filter(a => !a.read).length

  // Filter + sort keywords
  let kws = [...project.keywords]
  if (filter === 'top3') kws = kws.filter(k => k.currentRank !== null && k.currentRank <= 3)
  else if (filter === 'top10') kws = kws.filter(k => k.currentRank !== null && k.currentRank <= 10)
  else if (filter === 'top30') kws = kws.filter(k => k.currentRank !== null && k.currentRank <= 30)
  else if (filter === 'notranking') kws = kws.filter(k => k.currentRank === null)

  if (sortBy === 'rank') kws.sort((a, b) => (a.currentRank ?? 999) - (b.currentRank ?? 999))
  else if (sortBy === 'change7d') kws.sort((a, b) => (b.rankChange7d ?? -999) - (a.rankChange7d ?? -999))
  else if (sortBy === 'change30d') kws.sort((a, b) => (b.rankChange30d ?? -999) - (a.rankChange30d ?? -999))
  else if (sortBy === 'volume') kws.sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))

  const top3 = project.keywords.filter(k => k.currentRank !== null && k.currentRank <= 3).length
  const top10 = project.keywords.filter(k => k.currentRank !== null && k.currentRank <= 10).length
  const ranking = project.keywords.filter(k => k.currentRank !== null).length
  const avgRank = ranking > 0
    ? Math.round(project.keywords.filter(k => k.currentRank !== null).reduce((s, k) => s + k.currentRank!, 0) / ranking)
    : null

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/rank-tracker')} className="text-slate-400 hover:text-slate-600">←</button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{project.name}</h1>
              <div className="text-xs text-slate-400">{project.domain} · {project.targetLocation} · {project.deviceType}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checkMsg && <span className="text-xs text-green-600 font-medium">{checkMsg}</span>}
            <button
              onClick={() => exportRankTrackerCSV(project)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ CSV
            </button>
            <button
              onClick={() => exportRankTrackerPDF(project)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ PDF
            </button>
            <button onClick={runCheck} disabled={checking}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {checking ? (
                <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Checking...</>
              ) : '↻ Check Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Keywords', value: project.keywords.length, color: 'text-slate-800' },
            { label: 'Ranking', value: ranking, color: 'text-blue-600' },
            { label: 'Top 3', value: top3, color: 'text-green-600' },
            { label: 'Top 10', value: top10, color: 'text-blue-600' },
            { label: 'Avg. Rank', value: avgRank ? `#${avgRank}` : '—', color: 'text-slate-700' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          <button onClick={() => setTab('keywords')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'keywords' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Keywords ({project.keywords.length})
          </button>
          <button onClick={() => { setTab('alerts'); if (unreadAlerts > 0) markAlertsRead() }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'alerts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Alerts
            {unreadAlerts > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unreadAlerts}</span>}
          </button>
        </div>

        {tab === 'keywords' && (
          <>
            {/* Filters + sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {(['all','top3','top10','top30','notranking'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {f === 'all' ? 'All' : f === 'notranking' ? 'Not ranking' : f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto text-xs text-slate-500">
                Sort:
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs">
                  <option value="rank">Rank</option>
                  <option value="change7d">7d change</option>
                  <option value="change30d">30d change</option>
                  <option value="volume">Volume</option>
                </select>
              </div>
            </div>

            {/* Keywords table */}
            {project.lastUpdatedAt ? (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Keyword</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rank</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">7d</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">30d</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trend</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">KD</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {kws.map(kw => (
                      <tr key={kw.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{kw.keyword}</div>
                          {kw.currentUrl && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{kw.currentUrl}</div>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">{rankBadge(kw.currentRank)}</td>
                        <td className="text-center px-3 py-3">{changeIndicator(kw.rankChange7d)}</td>
                        <td className="text-center px-3 py-3">{changeIndicator(kw.rankChange30d)}</td>
                        <td className="text-center px-3 py-3">
                          <div className="flex justify-center">
                            <MiniSparkline history={kw.history} />
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 text-xs text-slate-600">
                          {kw.searchVolume ? kw.searchVolume.toLocaleString() : '—'}
                        </td>
                        <td className={`text-center px-3 py-3 text-xs font-semibold ${difficultyColor(kw.difficulty)}`}>
                          {kw.difficulty ?? '—'}
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => removeKeyword(kw.id)} disabled={deletingKw === kw.id}
                            className="text-red-300 hover:text-red-500 disabled:opacity-50 text-lg leading-none">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {kws.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">No keywords match this filter</div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center">
                <div className="text-3xl mb-2">↻</div>
                <div className="text-sm font-bold text-blue-800 mb-1">Run your first rank check</div>
                <p className="text-xs text-blue-600 mb-4">Click "Check Now" to fetch current rankings for all {project.keywords.length} keywords</p>
                <button onClick={runCheck} disabled={checking}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {checking ? 'Checking...' : 'Check Now'}
                </button>
              </div>
            )}

            {/* Add keywords */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-700 mb-3">Add Keywords</div>
              <div className="flex gap-3">
                <textarea value={addKw} onChange={e => setAddKw(e.target.value)} rows={3}
                  placeholder={"keyword one\nkeyword two\nkeyword three"}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <button onClick={addKeywords} disabled={addingKw || !addKw.trim()}
                  className="rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 self-start mt-0 py-2">
                  {addingKw ? '...' : 'Add'}
                </button>
              </div>
              {kwError && <div className="text-xs text-red-600 mt-2">{kwError}</div>}
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {project.alerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No alerts yet. Run a rank check to detect changes
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {project.alerts.map(a => (
                  <div key={a.id} className={`flex items-start gap-3 px-4 py-3 ${a.read ? 'opacity-60' : 'bg-amber-50/40'}`}>
                    <span className="text-xl mt-0.5">{alertIcon(a.alertType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{a.message}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(a.createdAt).toLocaleString()}
                        {!a.read && <span className="ml-2 text-amber-600 font-bold">NEW</span>}
                      </div>
                    </div>
                    {a.oldRank !== null && a.newRank !== null && (
                      <div className="text-xs text-right flex-shrink-0">
                        <span className="text-slate-400">#{a.oldRank}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className={a.newRank < a.oldRank ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>#{a.newRank}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {project.lastUpdatedAt && (
          <div className="text-xs text-slate-400 text-center">
            Last updated: {new Date(project.lastUpdatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
