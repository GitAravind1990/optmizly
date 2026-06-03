import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

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
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base">◈</span>
          Optmizly
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

        <blockquote className="border-t border-white/10 pt-8">
          <p className="text-slate-300 text-sm leading-relaxed italic mb-3">
            "We used to spend 3-4 hours per article on SEO research. With Optmizly we run an analysis in 30 seconds."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">P</div>
            <div>
              <div className="text-xs font-semibold text-white">Priya L.</div>
              <div className="text-xs text-slate-400">Founder · Content Studio, Los Angeles CA</div>
            </div>
          </div>
        </blockquote>
      </div>

      {/* Right panel — sign-up form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight mb-10 lg:hidden">
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">◈</span>
          Optmizly
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

          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border border-slate-200 rounded-2xl bg-white',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-slate-200 hover:bg-slate-50',
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm font-bold',
                footerActionLink: 'text-blue-600 hover:text-blue-700',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
