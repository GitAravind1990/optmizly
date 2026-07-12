'use client'

import { useState } from 'react'

interface Props {
  score: number
  grade: string
}

export function ShareScoreButton({ score, grade }: Props) {
  const [copied, setCopied] = useState(false)

  const text = `I just scored my content with @optmizly: ${score}/100 (Grade ${grade})\n\nFree AI SEO analyzer: E-E-A-T, entity gaps, LLM citation signals & more.\n\nTry it free → https://optmizly.com`

  function shareOnX() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400',
    )
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
      <span className="text-xs text-slate-400 mr-1">Share your score:</span>
      <button
        onClick={shareOnX}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        Share on X
      </button>
      <button
        onClick={copyText}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
              <polyline points="3,9 7,13 15,5"/>
            </svg>
            <span className="text-emerald-600">Copied!</span>
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy text
          </>
        )}
      </button>
    </div>
  )
}
