'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { exportCompetitorSpyCSV, exportCompetitorSpyPDF } from '@/lib/export'

type Keyword = { keyword: string; position: number; volume: number; traffic: number }
type BacklinkSource = { domain: string; links: number; da: number }
type Page = { title: string; url: string; traffic: number }
type GapKeyword = { keyword: string; volume: number; difficulty: number }
type ContentOpp = { title: string; opportunity: string; traffic: number }
type AIInsights = { strengths?: string[]; weaknesses?: string[]; topOpportunity?: string; threatLevel?: string }

type Analysis = {
  id: string
  domainName: string
  domainUrl: string
  estimatedTraffic: number
  domainAuthority: number
  pageAuthority: number
  backlinksTotal: number
  backlinksNew: number
  keywordCount: number
  contentCount: number
  avgContentLength: number
  topKeywords: Keyword[]
  topPages: Page[]
  topBacklinks: BacklinkSource[]
  gapKeywords: GapKeyword[]
  missingEntities: string[]
  contentOpps: ContentOpp[]
  aiInsights: AIInsights | null
  dataQuality: string
  lastAnalyzedAt: string
}

function diffBadge(d: number) {
  const color = d < 40 ? 'bg-green-100 text-green-700' : d < 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>KD {d}</span>
}

export default function CompetitorDetailPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = use(params)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/competitor-spy/${analysisId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setAnalysis(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [analysisId])

  if (loading) return <div className="flex items-center justify-center flex-1 py-24 text-slate-400 text-sm">Loading analysis...</div>
  if (!analysis) return <div className="flex items-center justify-center flex-1 py-24 text-slate-400 text-sm">Analysis not found.</div>

  const threatColor = analysis.aiInsights?.threatLevel === 'high' ? 'bg-red-100 text-red-700' : analysis.aiInsights?.threatLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/competitor-spy" className="text-xs text-slate-400 hover:text-slate-600">← All Analyses</Link>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900">{analysis.domainName}</h1>
              {analysis.aiInsights?.threatLevel && (
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${threatColor}`}>
                  {analysis.aiInsights.threatLevel} threat
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">Last analyzed {new Date(analysis.lastAnalyzedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportCompetitorSpyCSV(analysis)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ CSV
            </button>
            <button
              onClick={() => exportCompetitorSpyPDF(analysis)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ PDF
            </button>
          </div>
        </div>

        {/* AI Insights banner */}
        {analysis.aiInsights && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Strengths</div>
                <ul className="space-y-1">
                  {(analysis.aiInsights.strengths ?? []).map((s, i) => (
                    <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-green-500 mt-0.5">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Weaknesses</div>
                <ul className="space-y-1">
                  {(analysis.aiInsights.weaknesses ?? []).map((w, i) => (
                    <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-red-400 mt-0.5">✗</span>{w}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Top Opportunity</div>
                <p className="text-sm text-slate-800 font-medium leading-snug">{analysis.aiInsights.topOpportunity}</p>
              </div>
            </div>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* Quick stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Quick Stats</h2>
            {[
              ['Monthly Traffic', analysis.estimatedTraffic.toLocaleString(), false],
              ['Domain Authority', `${analysis.domainAuthority}/100`, analysis.dataQuality === 'partial-real'],
              ['Page Authority', `${analysis.pageAuthority}/100`, analysis.dataQuality === 'partial-real'],
              ['Total Backlinks', analysis.backlinksTotal.toLocaleString(), false],
              ['New Backlinks (30d)', `+${analysis.backlinksNew}`, false],
              ['Keywords Ranked', analysis.keywordCount.toLocaleString(), false],
              ['Content Pages', analysis.contentCount.toString(), false],
              ['Avg Content Length', `${analysis.avgContentLength.toLocaleString()} words`, false],
            ].map(([label, value, isReal]) => (
              <div key={label as string} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs font-bold text-slate-800">
                  {value}
                  {!isReal && <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 mt-2">
              {analysis.dataQuality === 'partial-real'
                ? 'Domain/Page Authority sourced from Open PageRank. Traffic, backlinks, and keyword data are estimated.'
                : 'All metrics on this analysis are estimated, not measured.'}
            </p>
          </div>

          {/* Top keywords */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Top 20 Keywords</h2>
            <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
              {analysis.topKeywords.map((k, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono w-4">{i + 1}</span>
                    <span className="text-xs text-slate-700">{k.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{k.volume.toLocaleString()}/mo</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{k.position}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Backlinks */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Top Backlink Sources</h2>
            <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
              {analysis.topBacklinks.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-4">{i + 1}</span>
                    <span className="text-xs text-slate-700 font-medium">{b.domain}</span>
                    <span className="text-[10px] text-slate-400">DA {b.da}</span>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{b.links} links</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top pages */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Top Pages</h2>
            <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
              {analysis.topPages.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-700 font-medium truncate">{p.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.url}</div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 ml-3">{p.traffic.toLocaleString()}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keyword opportunities */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">
            Keyword Opportunities <span className="text-slate-400 font-normal">({analysis.gapKeywords.length})</span>
          </h2>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-l-lg">Keyword</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Search Volume</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Difficulty</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {analysis.gapKeywords.map((g, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{g.keyword}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{g.volume.toLocaleString()}/mo</td>
                  <td className="px-4 py-3">{diffBadge(g.difficulty)}</td>
                  <td className="px-4 py-3">
                    <Link href="/dashboard/ideas" className="text-xs font-bold text-brand-600 hover:text-brand-900">
                      Plan Content →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Content opportunities */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">
            Content Opportunities <span className="text-slate-400 font-normal">({analysis.contentOpps.length})</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {analysis.contentOpps.map((o, i) => (
              <div key={i} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4">
                <div className="text-sm font-bold text-slate-800 leading-snug mb-2">{o.title}</div>
                <p className="text-xs text-amber-800 leading-relaxed mb-3">{o.opportunity}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-orange-600">{o.traffic.toLocaleString()} est. traffic</span>
                  <Link href="/dashboard/ideas" className="text-xs font-bold text-white bg-orange-500 px-2.5 py-1 rounded-lg hover:bg-orange-600 transition-colors">
                    Write →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing entities */}
        {analysis.missingEntities.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Missing Entities to Cover</h2>
            <div className="flex flex-wrap gap-2">
              {analysis.missingEntities.map((e, i) => (
                <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1.5 rounded-full font-medium">{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
