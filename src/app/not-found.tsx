import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl font-black text-slate-200 mb-4">404</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
            Go to Dashboard
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
