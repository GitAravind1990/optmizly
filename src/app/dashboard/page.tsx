'use client'

import { useState, useCallback } from 'react'
import { ToolRunner } from '@/components/tools/ToolRunner'
import { exportScoresCSV, exportScoresPDF, exportEntitiesCSV, exportEntitiesPDF } from '@/lib/export'
import { Card, ScoreBar, Badge, EmptyState } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import Link from 'next/link'

type Tab = 'scores' | 'issues' | 'entities'

const SCORE_DIMS = [
  { key: 'technical_seo',          label: 'Technical SEO',     weight: '10%' },
  { key: 'on_page_seo',            label: 'On-Page SEO',       weight: '20%' },
  { key: 'entity_optimization',    label: 'Entity Optim.',     weight: '15%' },
  { key: 'eeat_signals',           label: 'E-E-A-T Signals',   weight: '15%' },
  { key: 'semantic_richness',      label: 'Semantic Richness', weight: '10%' },
  { key: 'llm_citation_triggers',  label: 'LLM Citation',      weight: '20%' },
  { key: 'structured_data',        label: 'Structured Data',   weight: '5%'  },
  { key: 'authority_reinforcement', label: 'Authority',        weight: '5%'  },
]

const GRADE_COLORS: Record<string, string> = { S: 'text-purple-600', A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600', D: 'text-red-600' }

export default function DashboardPage() {
  const { analysisResult, setAnalysisResult, setContent } = useContent()
  const [tab, setTab] = useState<Tab>('scores')

  const handleResult = useCallback((result: typeof analysisResult, content: string) => {
    setAnalysisResult(result)
    setContent(content)
    setTab('scores')
  }, [setAnalysisResult, setContent])

  const issues = analysisResult?.top_issues ?? []
  const gaps   = analysisResult?.entity_gaps ?? []
  const wins   = analysisResult?.quick_wins ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ToolRunner onResult={handleResult} />

      {analysisResult && (
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-200 bg-white shrink-0">
          {([['scores', 'Scores'], ['issues', 'Issues'], ['entities', 'Entities']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
              {id === 'issues' && issues.length > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  issues.some(iss => iss.impact === 'high') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{issues.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!analysisResult ? (
          <EmptyState icon="◈" title="Analyse your content" desc="Paste your content or enter a URL above and click Analyse — you'll get a score across 8 SEO dimensions in seconds." />
        ) : tab === 'scores' ? (
          <div className="max-w-3xl mx-auto fade-up space-y-5">
            <Card className="flex items-center gap-5">
              <div className="text-center flex-shrink-0 w-20">
                <div className={`text-5xl font-black ${GRADE_COLORS[analysisResult.grade] ?? 'text-slate-900'}`}>{analysisResult.grade}</div>
                <div className="text-xs text-slate-400 mt-1">Grade</div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black">{analysisResult.overall_score}</span>
                  <span className="text-slate-400 text-sm">/100</span>
                </div>
                <p className="text-sm text-slate-600">{analysisResult.summary}</p>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-bold text-slate-800 mb-4">Score Breakdown</h2>
              {SCORE_DIMS.map(d => (
                <ScoreBar key={d.key} value={analysisResult.scores?.[d.key] ?? 0} label={d.label} weight={d.weight} />
              ))}
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <h2 className="text-sm font-bold mb-3">Top Issues ({issues.length})</h2>
                <div className="space-y-2.5">
                  {issues.slice(0, 5).map((issue, i) => (
                    <div key={i} className="flex gap-2.5">
                      <Badge variant={issue.impact === 'high' ? 'red' : issue.impact === 'medium' ? 'amber' : 'green'}>{issue.impact}</Badge>
                      <div>
                        <div className="text-xs font-bold">{issue.issue}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{issue.fix}</div>
                      </div>
                    </div>
                  ))}
                  {issues.length > 5 && (
                    <button onClick={() => setTab('issues')} className="text-xs text-blue-600 font-medium hover:underline">+{issues.length - 5} more →</button>
                  )}
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-bold mb-3">Quick Wins</h2>
                <div className="space-y-2 mb-4">
                  {wins.map((w, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                      <span className="text-slate-700">{w}</span>
                    </div>
                  ))}
                </div>
                {gaps.length > 0 && (
                  <>
                    <h2 className="text-sm font-bold mb-2">Missing Entities</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {gaps.slice(0, 6).map((e, i) => <Badge key={i} variant="purple">{e}</Badge>)}
                      {gaps.length > 6 && (
                        <button onClick={() => setTab('entities')} className="text-xs text-blue-600 font-medium hover:underline">+{gaps.length - 6} more</button>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {analysisResult.llm_citation_tip && (
              <Card className="bg-blue-50 border-blue-200">
                <h2 className="text-xs font-bold text-blue-700 mb-1">AI Visibility Tip</h2>
                <p className="text-sm text-blue-800">{analysisResult.llm_citation_tip}</p>
              </Card>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => exportScoresCSV(analysisResult as never)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Export CSV</button>
              <button onClick={() => exportScoresPDF(analysisResult as never)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Export PDF</button>
            </div>
          </div>
        ) : tab === 'issues' ? (
          <div className="max-w-3xl mx-auto fade-up space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-black">Content Issues</h1>
              <div className="flex items-center gap-3">
                <Badge variant={issues.length > 5 ? 'red' : issues.length > 2 ? 'amber' : 'green'}>{issues.length} issues found</Badge>
                {issues.length > 0 && (
                  <Link href="/dashboard/optimizer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                    Optimize Content
                  </Link>
                )}
              </div>
            </div>
            {issues.length === 0 ? (
              <Card className="text-center py-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="3,9 7,13 15,5"/></svg>
                </div>
                <p className="font-bold text-slate-800">No critical issues found</p>
                <p className="text-sm text-slate-500 mt-1">Your content is in good shape.</p>
              </Card>
            ) : issues.map((issue, i) => (
              <Card key={i} className={`border-l-4 ${issue.impact === 'high' ? 'border-l-red-400' : issue.impact === 'medium' ? 'border-l-amber-400' : 'border-l-blue-400'}`}>
                <div className="flex items-start gap-3 mb-2">
                  <Badge variant={issue.impact === 'high' ? 'red' : issue.impact === 'medium' ? 'amber' : 'blue'}>{issue.impact}</Badge>
                  <span className="font-bold text-sm flex-1">{issue.issue}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{issue.category}</span>
                </div>
                {issue.fix && (
                  <div className="flex gap-2 text-sm ml-16">
                    <span className="text-brand-600 font-bold flex-shrink-0">Fix:</span>
                    <span className="text-slate-600">{issue.fix}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto fade-up space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="text-base font-black">Entity Gaps</h1>
              <div className="flex gap-2">
                <button onClick={() => exportEntitiesCSV(gaps, wins)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Export CSV</button>
                <button onClick={() => exportEntitiesPDF(gaps, wins)} className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Export PDF</button>
              </div>
            </div>
            <Card>
              <h2 className="text-sm font-bold mb-3">Missing Entities ({gaps.length})</h2>
              <p className="text-xs text-slate-500 mb-4">These entities are expected for this topic but absent from your content. Adding them improves semantic richness and LLM citation likelihood.</p>
              {gaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {gaps.map((e, i) => <Badge key={i} variant="purple">{e}</Badge>)}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No entity gaps found — good coverage.</p>
              )}
            </Card>
            <Card>
              <h2 className="text-sm font-bold mb-3">Quick Wins</h2>
              <div className="space-y-2">
                {wins.map((w, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-emerald-500 font-bold flex-shrink-0">→</span>
                    <span className="text-slate-700">{w}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
