'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

export function PageHeader() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 h-16">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">◈</span>
          Optmizly
        </div>
        <div className="flex-1" />
        <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Blog</Link>
        <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
        <SignedOut>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link href="/signup" className="ml-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
            Get Started Free →
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
            Open Dashboard →
          </Link>
        </SignedIn>
      </div>
    </nav>
  )
}
