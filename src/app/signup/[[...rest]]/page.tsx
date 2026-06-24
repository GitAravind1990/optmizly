import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = {
  title: 'Sign Up — Start Free | Optmizly',
  robots: { index: false, follow: false },
}

const perks = [
  { icon: '🆓', text: '3 free analyses every month — no card needed' },
  { icon: '⚡', text: 'Detect & fix content issues automatically' },
  { icon: '🔭', text: 'AI visibility: get cited by ChatGPT & Perplexity' },
  { icon: '🏆', text: 'E-E-A-T scoring built for Google\'s quality signals' },
  { icon: '📈', text: 'SERP audit, topical maps & backlink finder' },
]

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-12 text-white">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-white text-xl tracking-tight w-fit">
          <img src="/logo.png" alt="Optmizly" className="w-9 h-9 object-contain flex-shrink-0" />
          optmizly
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300 mb-6">
            Free plan — no credit card required
          </div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            Start ranking<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              smarter today.
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-sm">
            11 AI-powered SEO tools that detect AND fix your content — used by content teams, SEOs, and agencies.
          </p>

          <ul className="space-y-4">
            {perks.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-200 text-sm">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0">{icon}</span>
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
