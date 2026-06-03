'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AnalysisResult {
  overall_score: number
  grade: string
  summary: string
  scores: Record<string, number>
  top_issues: Array<{ issue: string; category: string; impact: string; fix: string }>
  entity_gaps: string[]
  quick_wins: string[]
  llm_citation_tip: string
  plan?: string
}

interface ContentContextValue {
  content: string
  setContent: (v: string) => void
  analysisResult: AnalysisResult | null
  setAnalysisResult: (r: AnalysisResult | null) => void
  toolResults: Record<string, unknown>
  setToolResult: (tab: string, result: unknown) => void
  clearToolResults: () => void
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [toolResults, setToolResults] = useState<Record<string, unknown>>({})

  function setToolResult(tab: string, result: unknown) {
    setToolResults(prev => ({ ...prev, [tab]: result }))
  }

  function clearToolResults() {
    setToolResults({})
    setAnalysisResult(null)
  }

  return (
    <ContentContext.Provider value={{
      content, setContent,
      analysisResult, setAnalysisResult,
      toolResults, setToolResult,
      clearToolResults,
    }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent must be used inside ContentProvider')
  return ctx
}
