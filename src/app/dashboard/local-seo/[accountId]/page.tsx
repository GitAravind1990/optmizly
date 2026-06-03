'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Keyword = { id: string; keyword: string; currentRank: number | null; previousRank: number | null; rankChange7d: number | null; searchVolume: number | null; difficulty: number | null }
type Review = { id: string; source: string; reviewText: string; rating: number; author: string | null; responded: boolean; responseText: string | null; flaggedAsNegative: boolean; reviewedDate: string | null }
type Citation = { id: string; source: string; sourceUrl: string; nameMatches: boolean; phoneMatches: boolean; addressMatches: boolean; status: string; issueDescription: string | null }
type Location = { id: string; name: string; address: string; city: string; state: string; phone: string; website: string | null; averageRating: number | null; reviewCount: number | null; citationScore: number | null; pageViews: number | null; calls: number | null; directions: number | null; keywords: Keyword[]; reviews: Review[]; citations: Citation[] }
type Task = { id: string; title: string; description: string | null; category: string; priority: string; status: string; locationId: string | null }
type Account = { id: string; name: string; accountType: string; locations: Location[]; reviews: Review[]; citations: Citation[]; tasks: Task[] }

const PRIORITY_COLOR: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' }
const CATEGORY_ICON: Record<string, string> = { gbp: '📍', citations: '📋', reviews: '💬', keywords: '🔑', content: '📝' }

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function rankBadge(r: number | null) {
  if (r === null) return <span className="text-slate-400 text-xs">—</span>
  const cls = r <= 3 ? 'bg-green-100 text-green-700' : r <= 10 ? 'bg-blue-100 text-blue-700' : r <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>#{r}</span>
}

function changeChip(c: number | null) {
  if (c === null) return <span className="text-slate-300 text-xs">—</span>
  if (c > 0) return <span className="text-green-600 text-xs font-bold">▲{c}</span>
  if (c < 0) return <span className="text-red-500 text-xs font-bold">▼{Math.abs(c)}</span>
  return <span className="text-slate-400 text-xs">—</span>
}

export default function LocalSEOAccountPage() {
  const { accountId } = useParams() as { accountId: string }
  const router = useRouter()

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'locations' | 'reviews' | 'citations' | 'tasks'>('locations')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const [checkingLoc, setCheckingLoc] = useState<string | null>(null)
  const [checkMsg, setCheckMsg] = useState('')
  const [generatingReply, setGeneratingReply] = useState<string | null>(null)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [addKwText, setAddKwText] = useState('')
  const [addingKw, setAddingKw] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/tools/local-seo/accounts/${accountId}`)
    const d = await r.json()
    if (r.status === 404) { router.push('/dashboard/local-seo'); return }
    if (d.data) {
      setAccount(d.data)
      if (!selectedLocation && d.data.locations.length > 0) setSelectedLocation(d.data.locations[0].id)
    }
    setLoading(false)
  }, [accountId, router, selectedLocation])

  useEffect(() => { load() }, [load])

  async function checkRankings(locationId: string) {
    setCheckingLoc(locationId); setCheckMsg('')
    const r = await fetch('/api/tools/local-seo/check-rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId }),
    })
    const d = await r.json()
    if (d.data) setCheckMsg(`Updated ${d.data.keywordsChecked} keywords`)
    await load(); setCheckingLoc(null)
  }

  async function generateReply(locationId: string, reviewId: string) {
    setGeneratingReply(reviewId)
    await fetch(`/api/tools/local-seo/locations/${locationId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, action: 'generate-response' }),
    })
    await load(); setGeneratingReply(null)
  }

  async function updateTask(taskId: string, status: string) {
    setUpdatingTask(taskId)
    await fetch(`/api/tools/local-seo/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load(); setUpdatingTask(null)
  }

  async function deleteTask(taskId: string) {
    setUpdatingTask(taskId)
    await fetch(`/api/tools/local-seo/tasks/${taskId}`, { method: 'DELETE' })
    await load(); setUpdatingTask(null)
  }

  async function addKeywords(locationId: string) {
    const kws = addKwText.split('\n').map(k => k.trim()).filter(Boolean)
    if (!kws.length) return
    setAddingKw(true)
    await fetch(`/api/tools/local-seo/locations/${locationId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: kws }),
    })
    setAddKwText(''); await load(); setAddingKw(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
  if (!account) return null

  const currentLoc = account.locations.find(l => l.id === selectedLocation) ?? account.locations[0]

  const allCitations = account.citations
  const inconsistentCitations = allCitations.filter(c => c.status === 'inconsistent')
  const openTasks = account.tasks.filter(t => t.status === 'open')
  const unansweredReviews = account.reviews.filter(r => !r.responded)
  const negativeReviews = account.reviews.filter(r => r.rating <= 2)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/local-seo')} className="text-slate-400 hover:text-slate-600">←</button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{account.name}</h1>
              <div className="text-xs text-slate-400">{account.locations.length} locations · {account.accountType}</div>
            </div>
          </div>
          {checkMsg && <span className="text-xs text-green-600 font-medium">{checkMsg}</span>}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-5">
        {/* Alert banners */}
        {(inconsistentCitations.length > 0 || negativeReviews.length > 0 || unansweredReviews.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {inconsistentCitations.length > 0 && (
              <button onClick={() => setTab('citations')} className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                ⚠ {inconsistentCitations.length} NAP inconsistenc{inconsistentCitations.length > 1 ? 'ies' : 'y'}
              </button>
            )}
            {negativeReviews.length > 0 && (
              <button onClick={() => setTab('reviews')} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                ⭐ {negativeReviews.length} negative review{negativeReviews.length > 1 ? 's' : ''}
              </button>
            )}
            {unansweredReviews.length > 0 && (
              <button onClick={() => setTab('reviews')} className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                💬 {unansweredReviews.length} unanswered review{unansweredReviews.length > 1 ? 's' : ''}
              </button>
            )}
            {openTasks.length > 0 && (
              <button onClick={() => setTab('tasks')} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                ✅ {openTasks.length} open task{openTasks.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {(['locations', 'reviews', 'citations', 'tasks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
              {t === 'reviews' && unansweredReviews.length > 0 && <span className="ml-1.5 bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unansweredReviews.length}</span>}
              {t === 'citations' && inconsistentCitations.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{inconsistentCitations.length}</span>}
              {t === 'tasks' && openTasks.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{openTasks.length}</span>}
            </button>
          ))}
        </div>

        {/* ── LOCATIONS TAB ── */}
        {tab === 'locations' && (
          <div className="space-y-4">
            {/* Location selector */}
            {account.locations.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {account.locations.map(l => (
                  <button key={l.id} onClick={() => setSelectedLocation(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedLocation === l.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {l.name} · {l.city}
                  </button>
                ))}
              </div>
            )}

            {currentLoc && (
              <>
                {/* Location stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Avg Rating', value: currentLoc.averageRating ? `⭐ ${currentLoc.averageRating}` : '—' },
                    { label: 'Reviews', value: currentLoc.reviewCount ?? '—' },
                    { label: 'Page Views', value: currentLoc.pageViews?.toLocaleString() ?? '—' },
                    { label: 'Citation Score', value: currentLoc.citationScore ? `${currentLoc.citationScore}/100` : '—' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                      <div className="text-xl font-black text-slate-800">{s.value}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-700">Local Keywords ({currentLoc.keywords.length})</h2>
                    <button onClick={() => checkRankings(currentLoc.id)} disabled={checkingLoc === currentLoc.id}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                      {checkingLoc === currentLoc.id ? 'Checking...' : '↻ Check Rankings'}
                    </button>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 text-xs text-slate-500 font-semibold">Keyword</th>
                        <th className="text-center py-2 text-xs text-slate-500 font-semibold">Rank</th>
                        <th className="text-center py-2 text-xs text-slate-500 font-semibold">7d</th>
                        <th className="text-center py-2 text-xs text-slate-500 font-semibold">Volume</th>
                        <th className="text-center py-2 text-xs text-slate-500 font-semibold">KD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentLoc.keywords.map(kw => (
                        <tr key={kw.id} className="hover:bg-slate-50">
                          <td className="py-2.5 text-slate-700 font-medium">{kw.keyword}</td>
                          <td className="py-2.5 text-center">{rankBadge(kw.currentRank)}</td>
                          <td className="py-2.5 text-center">{changeChip(kw.rankChange7d)}</td>
                          <td className="py-2.5 text-center text-xs text-slate-500">{kw.searchVolume?.toLocaleString() ?? '—'}</td>
                          <td className="py-2.5 text-center text-xs font-semibold">
                            <span className={kw.difficulty ? (kw.difficulty <= 30 ? 'text-green-600' : kw.difficulty <= 60 ? 'text-amber-600' : 'text-red-600') : 'text-slate-400'}>
                              {kw.difficulty ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add keywords */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Add keywords (one per line)</div>
                    <div className="flex gap-2">
                      <textarea value={addKwText} onChange={e => setAddKwText(e.target.value)} rows={2}
                        placeholder={"plumber near me\nemergency plumber chicago"}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      <button onClick={() => addKeywords(currentLoc.id)} disabled={addingKw || !addKwText.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 self-start">
                        {addingKw ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Location info */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-700 mb-3">Location Details</h2>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400">Address:</span> <span className="text-slate-700 font-medium">{currentLoc.address}, {currentLoc.city}, {currentLoc.state}</span></div>
                    <div><span className="text-slate-400">Phone:</span> <span className="text-slate-700 font-medium">{currentLoc.phone}</span></div>
                    {currentLoc.website && <div><span className="text-slate-400">Website:</span> <a href={currentLoc.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{currentLoc.website}</a></div>}
                    <div><span className="text-slate-400">Calls:</span> <span className="text-slate-700 font-medium">{currentLoc.calls ?? '—'}</span></div>
                    <div><span className="text-slate-400">Directions:</span> <span className="text-slate-700 font-medium">{currentLoc.directions ?? '—'}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            {/* Rating distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Rating Distribution</h2>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = account.reviews.filter(r => r.rating === star).length
                  const pct = account.reviews.length > 0 ? (count / account.reviews.length) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-amber-400 w-12">{'★'.repeat(star)}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {account.reviews.map(review => {
              const loc = account.locations.find(l => l.reviews.some(r => r.id === review.id))
              return (
                <div key={review.id} className={`rounded-xl border p-4 ${review.rating <= 2 ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Stars rating={review.rating} />
                        <span className="text-xs text-slate-500">{review.author}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{review.source}</span>
                        {loc && <span className="text-xs text-slate-400">{loc.name}</span>}
                        {review.flaggedAsNegative && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">⚠ Flagged</span>}
                      </div>
                      <p className="text-sm text-slate-700">{review.reviewText}</p>
                      {review.responseText && (
                        <div className="mt-2 pl-3 border-l-2 border-blue-200">
                          <div className="text-[10px] text-blue-600 font-bold uppercase mb-1">Your Response</div>
                          <p className="text-xs text-slate-600">{review.responseText}</p>
                        </div>
                      )}
                    </div>
                    {!review.responded && loc && (
                      <button onClick={() => generateReply(loc.id, review.id)} disabled={generatingReply === review.id}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex-shrink-0">
                        {generatingReply === review.id ? 'Writing...' : '✨ AI Reply'}
                      </button>
                    )}
                    {review.responded && <span className="text-xs text-green-600 font-bold flex-shrink-0">✓ Replied</span>}
                  </div>
                </div>
              )
            })}
            {account.reviews.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No reviews yet</div>}
          </div>
        )}

        {/* ── CITATIONS TAB ── */}
        {tab === 'citations' && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Citations', value: allCitations.length, color: 'text-slate-800' },
                { label: 'Verified', value: allCitations.filter(c => c.status === 'verified').length, color: 'text-green-600' },
                { label: 'Inconsistent', value: inconsistentCitations.length, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Address</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allCitations.map(c => {
                    const loc = account.locations.find(l => l.citations.some(ci => ci.id === c.id))
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50 ${c.status === 'inconsistent' ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">{c.source}</a>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{loc?.name ?? '—'}</td>
                        <td className="text-center px-3 py-3">{c.nameMatches ? '✓' : <span className="text-red-500 font-bold">✗</span>}</td>
                        <td className="text-center px-3 py-3">{c.phoneMatches ? '✓' : <span className="text-red-500 font-bold">✗</span>}</td>
                        <td className="text-center px-3 py-3">{c.addressMatches ? '✓' : <span className="text-red-500 font-bold">✗</span>}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {allCitations.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No citations found</div>}
            </div>
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {tab === 'tasks' && (
          <div className="space-y-2">
            {['open', 'done'].map(statusGroup => {
              const tasksInGroup = account.tasks.filter(t => t.status === statusGroup)
              if (!tasksInGroup.length) return null
              return (
                <div key={statusGroup}>
                  <div className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2 mt-4 first:mt-0">
                    {statusGroup === 'open' ? `Open (${tasksInGroup.length})` : `Completed (${tasksInGroup.length})`}
                  </div>
                  {tasksInGroup.map(task => (
                    <div key={task.id} className={`rounded-xl border p-4 mb-2 ${task.status === 'done' ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-800">{CATEGORY_ICON[task.category] ?? '📌'} {task.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority] ?? 'bg-slate-100 text-slate-600'}`}>{task.priority}</span>
                          </div>
                          {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {task.status === 'open' && (
                            <button onClick={() => updateTask(task.id, 'done')} disabled={updatingTask === task.id}
                              className="rounded border border-green-200 px-2 py-1 text-xs font-bold text-green-600 hover:bg-green-50 disabled:opacity-50">
                              {updatingTask === task.id ? '...' : '✓ Done'}
                            </button>
                          )}
                          <button onClick={() => deleteTask(task.id)} disabled={updatingTask === task.id}
                            className="rounded border border-red-100 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50">×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
            {account.tasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No tasks yet</div>}
          </div>
        )}
      </div>
    </div>
  )
}
