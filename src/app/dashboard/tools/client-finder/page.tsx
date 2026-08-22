'use client'

import { useState, useCallback, useEffect } from 'react'
import { Badge, Button, Spinner } from '@/components/ui'
import { UpgradeModal } from '@/components/upgrade-modal'

type OpportunityLevel = 'Low' | 'Moderate' | 'Good' | 'High'
type ProspectStatus = 'ANALYZED' | 'WEBSITE_UNAVAILABLE' | 'NO_WEBSITE'

interface Prospect {
  id: string
  name: string
  website: string | null
  location: string
  rating: number | null
  phone: string | null
  opportunityScore: number
  opportunityLevel: OpportunityLevel
  topIssues: string[]
  salesAngle: string | null
  status: ProspectStatus
  siteReachable: boolean
}

interface SearchMeta {
  industry: string
  location: string
  found: number
  analyzed: number
  unreachable: number
  noWebsite: number
  aiSummaries: boolean
  usage: { used: number; limit: number; remaining: number }
}

const INPUT = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
const LABEL = 'block text-xs font-bold text-slate-700 mb-1.5'

/** Higher opportunity is a worse website, so the colour runs the opposite way to a grade:
 *  red means "lots wrong here", which for an agency is the good one. Labelled in the legend
 *  so nobody reads red as a warning about the prospect. */
function levelVariant(level: OpportunityLevel): 'green' | 'amber' | 'red' | 'gray' {
  if (level === 'High') return 'red'
  if (level === 'Good') return 'amber'
  if (level === 'Moderate') return 'green'
  return 'gray'
}

/** The staged text is honest about being a stage, not a progress bar: this is one request
 *  and the client cannot see inside it, so the steps advance on a timer that matches the
 *  server's actual order rather than pretending to measure it. */
const STAGES = ['Finding businesses...', 'Checking websites...', 'Scoring opportunities...']

export default function ClientFinderPage() {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [service, setService] = useState('')
  const [limit, setLimit] = useState(10)

  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const [prospects, setProspects] = useState<Prospect[] | null>(null)
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    if (!loading) { setStage(0); return }
    const timers = [
      setTimeout(() => setStage(1), 4000),
      setTimeout(() => setStage(2), 20000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [loading])

  const run = useCallback(async () => {
    if (!industry.trim() || !location.trim()) {
      setError('Industry and location are both required.')
      return
    }
    setLoading(true)
    setError('')
    setProspects(null)
    try {
      const res = await fetch('/api/tools/client-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, location, service: service.trim() || undefined, limit }),
      })
      const data = await res.json()
      if (res.status === 403 || res.status === 429) { setShowUpgradeModal(true); return }
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      setProspects(data.prospects ?? [])
      setMeta(data.searchMeta ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [industry, location, service, limit])

  const withSites = (prospects ?? []).filter(p => p.status === 'ANALYZED')
  const unreachable = (prospects ?? []).filter(p => p.status === 'WEBSITE_UNAVAILABLE')
  const noWebsite = (prospects ?? []).filter(p => p.status === 'NO_WEBSITE')

  // Highest opportunity first. There is deliberately no sort toggle: unreachable sites and
  // businesses with no website are shown in their own sections rather than interleaved, so
  // every card here is a working site and "functioning first" would order identically.
  const ranked = [...withSites].sort((a, b) => b.opportunityScore - a.opportunityScore)

  return (
    <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          <div>
            <h1 className="text-2xl font-black text-slate-900">SEO Client Finder</h1>
            <p className="text-sm text-slate-500 mt-1">
              Find local businesses whose websites have SEO problems you could fix — with the
              evidence to open the conversation.
            </p>
          </div>

          {/* ── Search form ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Industry *</label>
                <input value={industry} onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. dentist" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Location *</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Service <span className="font-normal text-slate-400">(optional)</span></label>
                <input value={service} onChange={e => setService(e.target.value)}
                  placeholder="e.g. emergency" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Prospects</label>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} className={INPUT}>
                  {[5, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <Button onClick={run} disabled={loading || !industry.trim() || !location.trim()}>
                {loading && <Spinner size="sm" className="mr-2" />}
                {loading ? STAGES[stage] : 'Find SEO Opportunities'}
              </Button>
              {meta && (
                <span className="text-xs text-slate-500">
                  {meta.usage.used} of {meta.usage.limit} search{meta.usage.limit === 1 ? '' : 'es'} used today
                </span>
              )}
            </div>
          </div>

          {/* ── Results ─────────────────────────────────────────────────── */}
          {prospects && (
            <div className="space-y-5">

              {meta && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{meta.found}</span> businesses found for{' '}
                    &ldquo;{meta.industry}&rdquo; in {meta.location}
                    {meta.unreachable > 0 && <> · {meta.unreachable} site{meta.unreachable === 1 ? '' : 's'} unreachable</>}
                  </p>
                  {withSites.length > 1 && (
                    <span className="text-xs text-slate-500">Ranked by opportunity, working sites only</span>
                  )}
                </div>
              )}

              {/* Stated plainly, because the number is easy to misread as a ranking. */}
              {withSites.length > 0 && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="font-bold">SEO Opportunity Score</span> measures how many fixable
                  problems a homepage has — how much there is to sell. A higher score means more
                  work available, not a worse Google ranking.
                </p>
              )}

              {ranked.map(p => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{p.location}</p>
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer nofollow"
                          className="text-xs text-blue-600 hover:underline break-all">{p.website}</a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-slate-900">{p.opportunityScore}<span className="text-sm text-slate-400">/100</span></div>
                      <Badge variant={levelVariant(p.opportunityLevel)}>{p.opportunityLevel} opportunity</Badge>
                    </div>
                  </div>

                  {p.salesAngle && (
                    <p className="mt-4 text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      {p.salesAngle}
                    </p>
                  )}

                  {p.topIssues.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.topIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-slate-600 flex gap-2">
                          <span className="text-slate-300">{i + 1}.</span>{issue}
                        </li>
                      ))}
                    </ul>
                  )}

                  {(p.rating !== null || p.phone) && (
                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      {p.rating !== null && <span>{p.rating.toFixed(1)} on Google</span>}
                      {p.phone && <span>{p.phone}</span>}
                    </div>
                  )}
                </div>
              ))}

              {noWebsite.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-black text-slate-900 text-sm">
                    No website — {noWebsite.length} business{noWebsite.length === 1 ? '' : 'es'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Listed on Google with no site at all. Not scored, because there is no homepage to
                    measure — but for an agency these are often the easiest first conversation.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {noWebsite.map(p => (
                      <li key={p.id} className="text-sm text-slate-700">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-slate-500"> · {p.location}</span>
                        {p.phone && <span className="text-slate-500"> · {p.phone}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unreachable.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-black text-slate-900 text-sm">
                    Could not reach {unreachable.length} site{unreachable.length === 1 ? '' : 's'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Timed out, blocked us, or served something other than a web page. Not scored —
                    a site we could not read is not evidence of anything.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {unreachable.map(p => (
                      <li key={p.id} className="text-sm text-slate-700">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-slate-500"> · {p.location}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {prospects.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm font-bold text-slate-900">No businesses found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try a broader industry or a larger location — &ldquo;dentist&rdquo; in a city
                    rather than a suburb.
                  </p>
                </div>
              )}

              {/* Tied to what they just got, not a generic wall. */}
              {meta && meta.usage.limit === 1 && withSites.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm text-slate-800">
                    <span className="font-black">You found {meta.found} prospects in one search.</span>{' '}
                    Agency runs 50 searches a day, so you can work a whole city rather than one
                    postcode — plus full site audits, white-label client reports, and rank tracking
                    for the clients you win.
                  </p>
                  <a href="/pricing" className="inline-block mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
                    See Agency
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
