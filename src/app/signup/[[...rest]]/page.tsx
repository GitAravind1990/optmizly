import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = {
  title: 'Sign Up — Start Free | Optmizly',
  robots: { index: false, follow: false },
}

const perks = [
  '3 free analyses every month, no card needed',
  'Rank on Google, ChatGPT, Gemini, Claude & Perplexity',
  'E-E-A-T scoring built for Google quality signals',
  'AI-powered content optimizer & full rewriter',
  'SERP audit, topical maps & backlink finder',
]

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white" style={{ background: 'linear-gradient(135deg, #020818 0%, #07112E 50%, #0000AA 100%)' }}>
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-white text-xl tracking-tight w-fit">
          <img src="/logo.png" alt="Optmizly" className="w-9 h-9 object-contain flex-shrink-0" />
          optmizly
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-4 py-1.5 text-xs font-bold text-blue-300 mb-6">
            Free plan, no credit card required
          </div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            Rank higher everywhere<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              search happens.
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-sm">
            17 AI-powered tools for SEO, GEO & AEO. Optimize once, rank everywhere.
          </p>

          <ul className="space-y-4">
            {perks.map((text) => (
              <li key={text} className="flex items-center gap-3 text-slate-200 text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4DEEFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M5 12l5 5L20 7"/></svg>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-8 flex gap-8">
          {[['3', 'Free analyses/mo'], ['17', 'AI tools'], ['3', 'Plan tiers']].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-black">{n}</div>
              <div className="text-xs text-slate-400 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign-up form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight mb-10 lg:hidden">
          <img src="/logo.png" alt="Optmizly" className="w-8 h-8 object-contain flex-shrink-0" />
          optmizly
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-black text-slate-900">Create your free account</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>

          <SignUpForm />
        </div>
      </div>
    </div>
  )
}
