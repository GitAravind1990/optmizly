'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UpgradeModal } from '@/components/upgrade-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

type RankingResult = {
  keyword: {
    volume: number
    difficulty: number
    cpc: string
    intent: string
    serp_features: string[]
    trend: string
    related: { kw: string; vol: number; diff: number }[]
    clusters: { name: string; keywords: string[] }[]
  }
  competitors: {
    avg_da: number
    avg_rd: number
    avg_words: number
    freshness: string
    schema_types: string[]
    eeat_level: string
    page_speed: string
    top: { domain: string; da: number; rd: number; words: number; position?: number; url?: string; daIsReal?: boolean; rdIsReal?: boolean; wordsIsReal?: boolean }[]
  }
  website: {
    da_score: number
    backlink_score: number
    topical_score: number
    content_score: number
    technical_score: number
    eeat_score: number
    gaps: { authority: number; backlinks: number; content: number; topical: number; technical: number }
  }
  topical: {
    published: number
    cluster_pct: number
    covered: string[]
    missing: string[]
    semantic_score: number
  }
  content_gaps: {
    topics: string[]
    entities: string[]
    faqs: string[]
    schema: string[]
  }
  score: {
    overall: number
    label: string
    factors: Record<string, { weight: number; score: number }>
    verdict: string
    time_to_rank: string
  }
  forecast: { scenario: string; actions: string[]; probability: number }[]
  recommendations: {
    blockers: string[]
    actions: { action: string; impact: string; effort: string; gain: number }[]
  }
  summary: string
  // Not present on results from before this field existed — treat as all-estimated
  // (every consumer below already falls back to `?? false`) rather than assuming real.
  dataQuality?: {
    keywordVolume: boolean
    keywordDifficulty: boolean
    keywordCpc: boolean
    keywordTrend: boolean
    keywordIntent: boolean
    keywordRelated: boolean
    serpFeatures: boolean
    serpTop: boolean
    userAuthority: boolean
    userReferringDomains: boolean
    competitorAuthority: boolean
    competitorReferringDomains: boolean
    competitorWords: boolean
    competitorSchemaTypes: boolean
    competitorFreshness: boolean
    technicalScore: boolean
  }
}

type FormState = { keyword: string; domain: string; country: string; goal: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = ['United States', 'United Kingdom', 'Australia', 'Canada', 'India', 'Germany', 'Other']
const GOAL_OPTIONS = ['Top 3', 'Top 10', 'Top 20']
const TABS = ['Overview', 'SERP', 'Gaps', 'Topical', 'Forecast', 'Actions'] as const
type Tab = typeof TABS[number]

const FACTOR_LABELS: Record<string, string> = {
  domain_authority: 'Domain Authority',
  backlinks: 'Backlinks',
  content_depth: 'Content Depth',
  topical_authority: 'Topical Authority',
  technical_seo: 'Technical SEO',
  eeat: 'E-E-A-T',
}

const GAP_LABELS: Record<string, string> = {
  authority: 'Domain Authority',
  backlinks: 'Backlinks',
  content: 'Content Quality',
  topical: 'Topical Coverage',
  technical: 'Technical SEO',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function probColor(p: number): string {
  if (p <= 20) return '#EF4444'
  if (p <= 40) return '#F97316'
  if (p <= 60) return '#EAB308'
  if (p <= 80) return '#22C55E'
  return '#0000FF'
}

function impactChip(v: string): string {
  if (v === 'High') return 'bg-red-100 text-red-700'
  if (v === 'Medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function scoreColor(v: number): string {
  if (v >= 70) return 'text-green-600'
  if (v >= 40) return 'text-amber-500'
  return 'text-red-500'
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const color = probColor(score)
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F0F2F6" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: '#8A93A3', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: RankingResult }) {
  const { score, keyword } = result
  const verdictChip =
    score.verdict === 'Highly Likely'
      ? 'bg-green-100 text-green-700'
      : score.verdict === 'Possible but Competitive'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'

  return (
    <div className="space-y-4">
      {/* Score hero */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <ScoreGauge score={score.overall} />
          <div className="flex-1 space-y-2">
            <div className="text-xl font-black text-slate-900">{score.label}</div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verdictChip}`}>
                {score.verdict}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {score.time_to_rank}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Keyword metrics + Factor scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Keyword Metrics</h3>
          <div className="space-y-2">
            {([
              ['Monthly Volume', fmt(keyword.volume), !!result.dataQuality?.keywordVolume],
              ['Difficulty', `${keyword.difficulty}/100`, !!result.dataQuality?.keywordDifficulty],
              ['CPC', keyword.cpc || '—', !!result.dataQuality?.keywordCpc],
              ['Search Intent', keyword.intent, !!result.dataQuality?.keywordIntent],
              ['Trend', keyword.trend, !!result.dataQuality?.keywordTrend],
            ] as [string, string, boolean][]).map(([label, value, isReal]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800">
                  {value}
                  {!isReal && <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                </span>
              </div>
            ))}
          </div>
          {keyword.serp_features?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-50">
              <div className="text-xs text-slate-400 mb-2">
                SERP Features{!result.dataQuality?.serpFeatures && <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keyword.serp_features.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Ranking Factors</h3>
          <div className="space-y-3">
            {Object.entries(score.factors).map(([key, f]) => {
              const isReal = key === 'domain_authority' ? result.dataQuality?.userAuthority
                : key === 'technical_seo' ? result.dataQuality?.technicalScore
                : key === 'backlinks' ? result.dataQuality?.userReferringDomains
                : undefined
              return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">
                    {FACTOR_LABELS[key] ?? key}{' '}
                    <span className="text-slate-300">({f.weight}%)</span>
                  </span>
                  <span className="font-semibold text-slate-700">
                    {f.score}/100
                    {isReal === true && <span className="ml-1.5 text-[9px] font-semibold text-green-600 uppercase align-middle">Live</span>}
                    {isReal === false && <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${f.score}%`, backgroundColor: '#0000FF' }}
                  />
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Related keywords */}
      {keyword.related?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            Related Keywords
            {result.dataQuality?.keywordRelated ? (
              <span className="ml-2 text-[9px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full align-middle">Live Data</span>
            ) : (
              <span className="ml-2 text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">Estimated</span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-50">
                  <th className="text-left pb-2">Keyword</th>
                  <th className="text-right pb-2">Volume</th>
                  <th className="text-right pb-2">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {keyword.related.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 text-slate-700">{r.kw}</td>
                    <td className="py-1.5 text-right text-slate-500">{fmt(r.vol)}</td>
                    <td className="py-1.5 text-right">
                      <span className={`font-medium ${r.diff >= 70 ? 'text-red-500' : r.diff >= 40 ? 'text-amber-500' : 'text-green-600'}`}>
                        {r.diff}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keyword clusters */}
      {keyword.clusters?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Keyword Clusters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyword.clusters.map((cluster, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-700 mb-2">{cluster.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {cluster.keywords.map((kw, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SERPTab({ result }: { result: RankingResult }) {
  const { competitors } = result
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Competitor Averages</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            [`Avg Domain Authority${result.dataQuality?.competitorAuthority ? ' (Mixed*)' : ' (Est.)'}`, String(competitors.avg_da)],
            [`Avg Referring Domains${result.dataQuality?.competitorReferringDomains ? ' (Mixed*)' : ' (Est.)'}`, fmt(competitors.avg_rd)],
            [`Avg Word Count${result.dataQuality?.competitorWords ? ' (Mixed*)' : ' (Est.)'}`, fmt(competitors.avg_words)],
            [`Content Freshness${result.dataQuality?.competitorFreshness ? '' : ' (Est.)'}`, competitors.freshness],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xl font-black text-slate-800">{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {competitors.top?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            Top Competitors
            {result.dataQuality?.serpTop ? (
              <span className="ml-2 text-[9px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full align-middle">Live SERP</span>
            ) : (
              <span className="ml-2 text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">Estimated</span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  {result.dataQuality?.serpTop && <th className="text-left pb-2">#</th>}
                  <th className="text-left pb-2">Domain</th>
                  <th className="text-right pb-2">DA*</th>
                  <th className="text-right pb-2">Ref. Domains*</th>
                  <th className="text-right pb-2">Words*</th>
                  <th className="text-right pb-2">vs Your DA</th>
                </tr>
              </thead>
              <tbody>
                {competitors.top.map((c, i) => {
                  const diff = c.da - result.website.da_score
                  return (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      {result.dataQuality?.serpTop && (
                        <td className="py-2 text-slate-400 font-mono text-xs">{c.position ?? '—'}</td>
                      )}
                      <td className="py-2 font-medium text-slate-700">
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600" title={c.url}>
                            {c.domain}
                          </a>
                        ) : c.domain}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {c.da}
                        {!c.daIsReal && <span className="ml-1 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {fmt(c.rd)}
                        {!c.rdIsReal && <span className="ml-1 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {fmt(c.words)}
                        {!c.wordsIsReal && <span className="ml-1 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold text-xs ${diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">*DA (OpenPageRank), Ref. Domains (DataForSEO), and Words (real page fetch) are measured per domain where available, individually marked Est. otherwise.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            Schema Types Used
            {result.dataQuality?.competitorSchemaTypes ? (
              <span className="ml-2 text-[9px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full align-middle">Live Data</span>
            ) : (
              <span className="ml-2 text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">Estimated</span>
            )}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {competitors.schema_types?.length > 0
              ? competitors.schema_types.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                ))
              : <span className="text-xs text-slate-400">None detected</span>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-2">E-E-A-T Level</h3>
          <div className="text-2xl font-black text-slate-800">{competitors.eeat_level}</div>
          <div className="text-xs text-slate-400 mt-1.5">Page Speed Benchmark: {competitors.page_speed}</div>
        </div>
      </div>
    </div>
  )
}

function GapsTab({ result }: { result: RankingResult }) {
  const { website, competitors } = result
  const gapEntries = Object.entries(website.gaps) as [string, number][]

  const userScoreFor: Record<string, number> = {
    authority: website.da_score,
    backlinks: website.backlink_score,
    content: website.content_score,
    topical: website.topical_score,
    technical: website.technical_score,
  }

  // Derive competitor 0-100 scores from the gap values.
  // authority/content/topical/technical gaps are in the same 0-100 scale as the user scores.
  // backlinks gap is raw referring-domain count, so use a log scale against avg_rd instead.
  const compScoreFor: Record<string, number> = {
    authority: Math.min(100, Math.max(0, website.da_score - website.gaps.authority)),
    backlinks: Math.min(100, Math.round(Math.log10(Math.max(2, competitors.avg_rd)) * 26)),
    content:   Math.min(100, Math.max(0, website.content_score   - website.gaps.content)),
    topical:   Math.min(100, Math.max(0, website.topical_score   - website.gaps.topical)),
    technical: Math.min(100, Math.max(0, website.technical_score - website.gaps.technical)),
  }

  function gapBadge(key: string, gap: number): string {
    if (key === 'backlinks') return gap < 0 ? `-${fmt(Math.abs(gap))} RDs` : `+${fmt(gap)} RDs`
    return gap < 0 ? `${gap} gap` : `+${gap} advantage`
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Competitive Gap Analysis</h3>
        <div className="space-y-5">
          {gapEntries.map(([key, gap]) => {
            const userScore = userScoreFor[key] ?? 0
            const compScore = compScoreFor[key] ?? 0
            const isDeficit = gap < 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {GAP_LABELS[key] ?? key}
                    {key === 'authority' && (result.dataQuality?.userAuthority
                      ? <span className="ml-1.5 text-[9px] font-semibold text-green-600 uppercase align-middle">Live</span>
                      : <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>)}
                    {key === 'backlinks' && (result.dataQuality?.userReferringDomains
                      ? <span className="ml-1.5 text-[9px] font-semibold text-green-600 uppercase align-middle">Live</span>
                      : <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>)}
                    {key === 'technical' && (result.dataQuality?.technicalScore
                      ? <span className="ml-1.5 text-[9px] font-semibold text-green-600 uppercase align-middle">Live</span>
                      : <span className="ml-1.5 text-[9px] font-semibold text-amber-500 uppercase align-middle">Est.</span>)}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDeficit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {gapBadge(key, gap)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                      <span>Your score</span>
                      <span>{Math.round(userScore)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, userScore))}%`, backgroundColor: '#0000FF' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                      <span>Competitor avg</span>
                      <span>{Math.round(compScore)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-300 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, compScore))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Your Website Scores</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            [`Domain Authority${result.dataQuality?.userAuthority ? ' (OPR)' : ' (Est.)'}`, website.da_score],
            [`Backlinks${result.dataQuality?.userReferringDomains ? ' (Live)' : ' (Est.)'}`, website.backlink_score],
            ['Content', website.content_score],
            ['Topical', website.topical_score],
            [`Technical SEO${result.dataQuality?.technicalScore ? ' (PSI)' : ' (Est.)'}`, website.technical_score],
            ['E-E-A-T', website.eeat_score],
          ] as [string, number][]).map(([label, val]) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className={`text-xl font-black ${scoreColor(val)}`}>{val}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopicalTab({ result }: { result: RankingResult }) {
  const { topical, content_gaps } = result
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-6">
          <div className="text-center flex-shrink-0">
            <div className={`text-5xl font-black ${scoreColor(topical.cluster_pct)}`}>{topical.cluster_pct}%</div>
            <div className="text-xs text-slate-400 mt-1">Cluster Completeness</div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Published articles</span>
              <span className="font-semibold text-slate-700">{topical.published}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Semantic score</span>
              <span className="font-semibold text-slate-700">{topical.semantic_score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${topical.cluster_pct}%`, backgroundColor: '#0000FF' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Covered Topics</h3>
          <div className="flex flex-wrap gap-1.5">
            {topical.covered?.length > 0
              ? topical.covered.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full">{t}</span>
                ))
              : <span className="text-xs text-slate-400">None detected</span>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Missing Topics</h3>
          <div className="flex flex-wrap gap-1.5">
            {topical.missing?.length > 0
              ? topical.missing.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-full">{t}</span>
                ))
              : <span className="text-xs text-slate-400">No gaps detected</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ['Missing Topics', content_gaps.topics, 'bg-orange-50 text-orange-700'],
          ['Missing Entities', content_gaps.entities, 'bg-purple-50 text-purple-700'],
          ['Missing FAQs', content_gaps.faqs, 'bg-blue-50 text-blue-700'],
          ['Schema Opportunities', content_gaps.schema, 'bg-teal-50 text-teal-700'],
        ] as [string, string[], string][]).map(([title, items, chipClass]) => (
          <div key={title} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-full ${chipClass}`}>{item}</span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">None identified</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ForecastTab({ result }: { result: RankingResult }) {
  const { forecast, score } = result
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800">Current Probability</h3>
          <span className="text-xl font-black" style={{ color: probColor(score.overall) }}>{score.overall}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score.overall}%`, backgroundColor: probColor(score.overall) }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">Baseline probability of achieving &quot;{score.label}&quot;</p>
      </div>

      <div className="space-y-3">
        {forecast?.map((f, i) => {
          const improvement = f.probability - score.overall
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-bold text-slate-800">{f.scenario}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm text-slate-400">{score.overall}%</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                      <path d="M3 8h10M9 4l4 4-4 4"/>
                    </svg>
                    <span className="text-sm font-bold" style={{ color: probColor(f.probability) }}>{f.probability}%</span>
                    {improvement > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">+{improvement} pts</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black" style={{ color: probColor(f.probability) }}>{f.probability}%</div>
                  <div className="text-xs text-slate-400">probability</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${f.probability}%`, backgroundColor: probColor(f.probability) }}
                />
              </div>
              <ul className="space-y-1.5">
                {f.actions?.map((a, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                    <span style={{ color: '#0000FF' }} className="mt-0.5 flex-shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionsTab({ result }: { result: RankingResult }) {
  const { recommendations } = result
  return (
    <div className="space-y-4">
      {recommendations.blockers?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">What&apos;s Blocking You</h3>
          <div className="space-y-2">
            {recommendations.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-3 border-l-2 border-red-400 pl-3 py-1">
                <span className="text-xs font-bold text-red-500 flex-shrink-0">{i + 1}.</span>
                <span className="text-sm text-slate-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.actions?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Prioritized Action Plan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 pr-4">Action</th>
                  <th className="text-left pb-2 pr-3">Impact</th>
                  <th className="text-left pb-2 pr-3">Effort</th>
                  <th className="text-right pb-2">Gain</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.actions.map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-700">{a.action}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${impactChip(a.impact)}`}>
                        {a.impact}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${impactChip(a.effort)}`}>
                        {a.effort}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        +{a.gain} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function RankingEngineClient({ unlocked }: { unlocked: boolean }) {
  const [form, setForm] = useState<FormState>({
    keyword: '',
    domain: '',
    country: 'United States',
    goal: 'Top 10',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RankingResult | null>(null)
  const [tab, setTab] = useState<Tab>('Overview')
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  async function analyze() {
    if (!form.keyword.trim() || !form.domain.trim()) {
      setError('Keyword and domain are required')
      return
    }
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/ranking-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setResult(d as RankingResult)
      setTab('Overview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!unlocked) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 15 15" fill="none" stroke="#0000FF" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7.5" cy="7.5" r="6.5"/>
              <circle cx="7.5" cy="7.5" r="3"/>
              <circle cx="7.5" cy="7.5" r="1" fill="#0000FF" stroke="none"/>
              <line x1="7.5" y1="0" x2="7.5" y2="2"/>
              <line x1="7.5" y1="13" x2="7.5" y2="15"/>
              <line x1="0" y1="7.5" x2="2" y2="7.5"/>
              <line x1="13" y1="7.5" x2="15" y2="7.5"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ranking Possibility Engine</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            See your real chances of ranking for any keyword: a weighted score, competitor gap analysis, and a step-by-step action plan.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0000FF' }}
          >
            Upgrade to Pro to unlock
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900">Ranking Possibility Engine</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Predict your chances of ranking for any keyword: weighted score, gap analysis, and a prioritized action plan.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-5">
        {result ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-slate-400 mb-1">Keyword</label>
              <input
                value={form.keyword}
                onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-slate-400 mb-1">Domain</label>
              <input
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={form.goal}
              onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GOAL_OPTIONS.map(g => <option key={g}>{g}</option>)}
            </select>
            <button
              onClick={analyze}
              disabled={loading}
              className="px-4 py-1.5 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity whitespace-nowrap"
              style={{ backgroundColor: '#0000FF' }}
            >
              {loading ? 'Analyzing...' : 'Re-analyze'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Keyword</label>
                <input
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder="e.g. best IVF clinics London"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Domain URL</label>
                <input
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g. yourdomain.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Country</label>
                <select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Ranking Goal</label>
                <select
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {GOAL_OPTIONS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full md:w-auto px-6 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(to right, #2563EB, #0000FF)' }}
            >
              {loading ? 'Analyzing...' : 'Analyze Ranking Possibility'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <div
            className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: '#0000FF', borderTopColor: 'transparent' }}
          />
          <p className="text-slate-500 text-sm font-medium">Analyzing ranking possibility...</p>
          <p className="text-slate-400 text-xs mt-1">Claude is estimating competitor metrics and gap analysis</p>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="flex gap-0 border-b border-slate-100 mb-5 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t
                    ? 'border-b-2 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                style={tab === t ? { borderBottomColor: '#0000FF', color: '#0000FF' } : undefined}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview'  && <OverviewTab  result={result} />}
          {tab === 'SERP'      && <SERPTab      result={result} />}
          {tab === 'Gaps'      && <GapsTab      result={result} />}
          {tab === 'Topical'   && <TopicalTab   result={result} />}
          {tab === 'Forecast'  && <ForecastTab  result={result} />}
          {tab === 'Actions'   && <ActionsTab   result={result} />}
        </>
      )}
    </div>
  )
}
