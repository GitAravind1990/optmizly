'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

type Page = {
  id: string
  url: string
  title: string
  pageScore: number
  semanticScore: number
  structureScore: number
  answerScore: number
  wordCount: number
  headingCount: number
  faqCount: number
  mainTopic: string | null
  retrievable: boolean
  retrievalReason: string | null
  issues: string[]
}

type QueryTest = {
  id: string
  query: string
  retrieved: boolean
  retrievalScore: number
  answer: string | null
  answerQuality: number | null
  missingContent: string[]
  createdAt: string
}

type Analysis = {
  id: string
  websiteUrl: string
  domain: string
  llmVisibilityScore: number
  semanticRelevance: number
  retrievalLikelihood: number
  contentStructure: number
  answerability: number
  technicalAccess: number
  pagesAnalyzed: number
  totalWords: number
  topicsFound: number
  entitiesFound: number
  faqSections: number
  criticalGaps: string[]
  warnings: string[]
  opportunities: string[]
  recommendations: string[]
  pages: Page[]
  queryTests: QueryTest[]
  createdAt: string
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBgBorder(score: number) {
  if (score >= 75) return 'bg-green-50 border-green-300'
  if (score >= 50) return 'bg-yellow-50 border-yellow-300'
  return 'bg-red-50 border-red-300'
}

function scoreLabel(score: number) {
  if (score >= 75) return { icon: '✅', text: 'Strong AI answer retrieval likelihood' }
  if (score >= 50) return { icon: '⚠️', text: 'Moderate — Room for improvement' }
  return { icon: '❌', text: 'Low — Content needs optimization' }
}

export default function LLMVisibilityReportPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = use(params)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [testing, setTesting] = useState(false)
  const [latestTest, setLatestTest] = useState<QueryTest | null>(null)
  const [testError, setTestError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const r = await fetch(`/api/tools/llm-visibility/${analysisId}`)
      const d = await r.json()
      if (r.ok) setAnalysis(d)
      setLoading(false)
    }
    load()
  }, [analysisId])

  async function testQuery() {
    if (!query.trim()) return
    setTestError('')
    setTesting(true)
    try {
      const r = await fetch('/api/tools/llm-visibility/test-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, query }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Test failed')
      setLatestTest(d.queryTest)
      setQuery('')
      load()
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading report...
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">❌</div>
          <div className="font-bold text-slate-700">Analysis not found</div>
          <Link href="/dashboard/optimizer/llm-visibility" className="text-sm text-cyan-600 mt-2 inline-block">
            ← Back to Analyses
          </Link>
        </div>
      </div>
    )
  }

  const label = scoreLabel(analysis.llmVisibilityScore)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-3">
        <Link
          href="/dashboard/optimizer/llm-visibility"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-black text-slate-800">🤖 LLM Visibility Report</h1>
      </div>

      {/* Hero */}
      <div className="mx-6 mb-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium opacity-80 mb-1">{analysis.domain}</div>
            <div className="text-6xl font-black mb-2">{analysis.llmVisibilityScore}</div>
            <div className="text-sm opacity-80">LLM Visibility Score / 100</div>
            <div className="mt-3 text-sm font-medium">
              {label.icon} {label.text}
            </div>
          </div>
          <div className="text-right text-sm opacity-70 space-y-1">
            <div>{analysis.pagesAnalyzed} pages analyzed</div>
            <div>{analysis.totalWords.toLocaleString()} total words</div>
            <div>{analysis.topicsFound} topics found</div>
            <div>{analysis.entitiesFound} entities found</div>
            <div>{analysis.faqSections} FAQ sections</div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-5 pb-8">
        {/* Score Breakdown */}
        <div>
          <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Score Breakdown</h2>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Semantic Relevance', value: analysis.semanticRelevance, desc: 'Topic & query alignment' },
              { label: 'Retrieval Likelihood', value: analysis.retrievalLikelihood, desc: '% pages retrievable' },
              { label: 'Content Structure', value: analysis.contentStructure, desc: 'AI-parseable format' },
              { label: 'Answerability', value: analysis.answerability, desc: 'Direct answer quality' },
              { label: 'Technical Access', value: analysis.technicalAccess, desc: 'Crawlability' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border p-3 text-center ${scoreBgBorder(item.value)}`}>
                <div className={`text-3xl font-black ${scoreColor(item.value)}`}>{item.value}</div>
                <div className="text-xs font-bold text-slate-700 mt-1">{item.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Query Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-1">🧪 Test Query Retrieval</h2>
          <p className="text-xs text-slate-500 mb-3">
            Test how your content would perform for specific AI queries
          </p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g., 'What services do you offer?', 'How much does it cost?'"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              onKeyDown={e => e.key === 'Enter' && testQuery()}
            />
            <button
              onClick={testQuery}
              disabled={testing || !query.trim()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 disabled:opacity-60 transition-colors min-w-[100px]"
            >
              {testing ? '⏳ Testing...' : '▶ Test'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            e.g., &quot;Best fertility hospital in Chennai&quot;, &quot;IVF cost in Tamil Nadu&quot;, &quot;How do I get started?&quot;
          </p>
          {testError && <p className="text-xs text-red-500 mb-2">{testError}</p>}

          {latestTest && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs font-bold text-slate-600 mb-2">Query: &quot;{latestTest.query}&quot;</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg p-2 text-center border border-slate-100">
                  <div className={`text-lg font-bold ${latestTest.retrieved ? 'text-green-600' : 'text-red-500'}`}>
                    {latestTest.retrieved ? '✅ Retrieved' : '❌ Not Retrieved'}
                  </div>
                  <div className="text-[10px] text-slate-400">Retrieval Status</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-slate-100">
                  <div className="text-lg font-bold text-slate-700">
                    {Math.round(latestTest.retrievalScore * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-400">Retrieval Score</div>
                </div>
              </div>
              {latestTest.answer && (
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-1">Generated Answer:</div>
                  <div className="text-xs text-slate-600 bg-white rounded p-2 border border-slate-100 leading-relaxed">
                    {latestTest.answer.slice(0, 300)}{latestTest.answer.length > 300 ? '...' : ''}
                  </div>
                  {latestTest.answerQuality !== null && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      Answer quality: {latestTest.answerQuality}/100
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Critical Issues */}
        <div className={`rounded-xl border p-5 ${analysis.criticalGaps.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <h2 className="font-bold text-slate-800 mb-3">🚨 Critical Issues</h2>
          {analysis.criticalGaps.length === 0 ? (
            <p className="text-sm text-green-600">No critical issues found!</p>
          ) : (
            <ul className="space-y-1.5">
              {analysis.criticalGaps.map((gap, i) => (
                <li key={i} className="text-sm text-red-700 flex gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-800 mb-3">💡 AI Optimization Recommendations</h2>
          <div className="space-y-2">
            {analysis.recommendations.slice(0, 5).map((rec, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border-l-4 border-cyan-500">
                <p className="text-sm text-slate-700">{i + 1}. {rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Page by Page Analysis */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-800 mb-3">📄 Page-by-Page Analysis</h2>
          <div className="overflow-y-auto max-h-96 space-y-1">
            {analysis.pages.map(page => (
              <div
                key={page.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{page.title}</div>
                  <div className="text-xs text-slate-400">{page.wordCount.toLocaleString()} words · {page.headingCount} headings · {page.faqCount > 0 ? `${page.faqCount} FAQs` : 'No FAQ'}</div>
                </div>
                <div className="ml-4 text-right">
                  <div className={`text-xl font-black ${scoreColor(page.pageScore)}`}>{page.pageScore}</div>
                  <div className={`text-[10px] font-medium ${page.retrievable ? 'text-green-500' : 'text-red-400'}`}>
                    {page.retrievable ? '✅ Retrievable' : '❌ Low retrieval'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Query Test History */}
        {analysis.queryTests.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-bold text-slate-800 mb-3">📊 Recent Query Tests</h2>
            <div className="overflow-y-auto max-h-48 space-y-1">
              {analysis.queryTests.map(qt => (
                <div key={qt.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">
                  <span className="flex-1 text-slate-700 truncate">{qt.query}</span>
                  <span className={`font-medium ${qt.retrieved ? 'text-green-600' : 'text-red-500'}`}>
                    {qt.retrieved ? '✅' : '❌'}
                  </span>
                  <span className="text-slate-400 text-xs w-10 text-right">
                    {Math.round(qt.retrievalScore * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
