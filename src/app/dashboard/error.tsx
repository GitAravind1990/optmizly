'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
    posthog.captureException(error)
  }, [error])
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-amber-600">
          <path d="M11 2L1 20h20L11 2z"/>
          <path d="M11 9v4"/>
          <circle cx="11" cy="16.5" r="0.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <h2 className="text-base font-black text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-xs">{error.message ?? 'An unexpected error occurred.'}</p>
      <button onClick={reset} className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
        Try again
      </button>
    </div>
  )
}
