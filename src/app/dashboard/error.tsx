'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-base font-black text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-xs">{error.message ?? 'An unexpected error occurred.'}</p>
      <button onClick={reset} className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
        Try again
      </button>
    </div>
  )
}
