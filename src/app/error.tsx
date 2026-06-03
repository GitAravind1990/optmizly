'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          An unexpected error occurred. If this keeps happening, please contact support.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
            Try again
          </button>
          <Link href="/" className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
