'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

type BacklinkItem = {
  url_from: string
  domain_from: string
  url_to: string
  anchor: string
  dofollow: boolean
  domain_from_rank: number
  first_seen: string
  last_seen: string
  is_new: boolean
  is_lost: boolean
  attributes: string[]
  item_type: string
}

type ReferringDomain = {
  domain: string
  rank: number
  backlinks: number
  dofollow: number
  nofollow: number
  is_new: boolean
  is_lost: boolean
  first_seen: string
  last_seen: string
  spam_score?: number
}

type Analysis = {
  id: string
  domain: string
  backlinksTotal: number
  dofollowLinks: number
  nofollowLinks: number
  referringDomains: number
  referringIPs: number
  spamScore: number
  domainRank: number
  oprScore: number
  newBacklinks14d: number
  lostBacklinks14d: number
  newReferringDomains14d: number
  lostReferringDomains14d: number
  brokenBacklinks: number
  topBacklinks: BacklinkItem[]
  topReferringDomains: ReferringDomain[]
  createdAt: string
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

const TABS = ['Overview', 'Backlinks', 'Referring Domains'] as const
type Tab = typeof TABS[number]

export default function BacklinkAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Overview')

  useEffect(() => {
    fetch(`/api/tools/backlinks/domain-analysis/${id}`)
      .then(r => r.json())
      .then(d => { setAnalysis(d); setLoading(false) })
  }, [id])

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading report...</div>
  if (!analysis) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400"><line x1="6" y1="6" x2="16" y2="16"/><line x1="16" y1="6" x2="6" y2="16"/></svg>
        </div>
        <div className="font-bold text-slate-700">Analysis not found</div>
        <Link href="/dashboard/backlinks" className="text-sm text-blue-600 mt-2 inline-block">← Back</Link>
      </div>
    </div>
  )


  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/backlinks" className="text-sm text-slate-400 hover:text-slate-600">← Back</Link>
          <h1 className="text-xl font-black text-slate-800">📊 {analysis.domain}</h1>
          <span className="text-xs text-slate-400 ml-auto">
            Data fetched {new Date(analysis.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 pb-10">

        {/* ── OVERVIEW TAB ── */}
        {tab === 'Overview' && (
          <>
            {/* OPR Score hero */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className={`text-5xl font-black ${analysis.oprScore >= 6 ? 'text-green-600' : analysis.oprScore >= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {analysis.oprScore > 0 ? analysis.oprScore.toFixed(2) : '—'}
                </div>
                <div className="text-sm font-semibold text-slate-600 mt-1">Domain Authority Score</div>
                <div className="text-[10px] text-slate-400">Scale of 0–10</div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${analysis.oprScore >= 6 ? 'bg-green-500' : analysis.oprScore >= 3 ? 'bg-amber-500' : 'bg-slate-400'}`}
                    style={{ width: `${Math.min((analysis.oprScore / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className="text-5xl font-black text-purple-700">
                  {analysis.domainRank > 0 ? `#${fmt(analysis.domainRank)}` : '—'}
                </div>
                <div className="text-sm font-semibold text-slate-600 mt-1">Global Rank</div>
                <div className="text-[10px] text-slate-400">global authority index</div>
              </div>
            </div>

            {/* Score interpretation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-blue-800 mb-2">About Domain Authority Score</div>
              <p className="text-xs text-blue-700">
                Domain Authority Score (0–10) measures a domain&apos;s overall link authority based on the quality and quantity of inbound links.
                Higher scores indicate more authoritative domains with stronger link profiles.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px]">
                {[
                  { range: '0–2', label: 'Low', color: 'bg-slate-100 text-slate-600' },
                  { range: '3–5', label: 'Moderate', color: 'bg-amber-100 text-amber-700' },
                  { range: '6–10', label: 'High', color: 'bg-green-100 text-green-700' },
                ].map(b => (
                  <div key={b.range} className={`rounded-lg px-2 py-1.5 font-semibold ${b.color}`}>
                    {b.range}: {b.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── BACKLINKS / REFERRING DOMAINS TABS ── */}
        {(tab === 'Backlinks' || tab === 'Referring Domains') && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div className="text-lg font-bold text-slate-700 mb-1">Coming Soon</div>
          </div>
        )}
      </div>
    </div>
  )
}
