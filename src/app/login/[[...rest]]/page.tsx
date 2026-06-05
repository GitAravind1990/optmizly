import type { Metadata } from 'next'
import Link from 'next/link'

const SignIn = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? require('@clerk/nextjs').SignIn
  : function DevSignIn() {
      return (
        <div className="w-full max-w-md p-6 border border-slate-200 rounded-2xl bg-white">
          <p className="text-center text-sm text-slate-600 mb-4">
            Sign-in requires Clerk credentials. For development, use the <Link href="/dashboard" className="font-semibold text-blue-600">dashboard</Link> instead.
          </p>
        </div>
      )
    }

export const metadata: Metadata = {
  title: 'Log In — Optmizly',
  robots: { index: false, follow: false },
}

const features = [
  { icon: '📊', text: 'Content scoring across 8 dimensions' },
  { icon: '⚡', text: 'AI-powered content optimizer & rewriter' },
  { icon: '🔭', text: 'AI visibility — get cited by ChatGPT & Perplexity' },
  { icon: '🏆', text: 'E-E-A-T deep analysis' },
  { icon: '🗺️', text: 'Topical authority mapper with cluster calendar' },
]

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-12 text-white">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-white text-xl tracking-tight w-fit">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base">◈</span>
          Optmizly
        </Link>

        <div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            Rank higher.<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Get cited by AI.
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-sm">
            The only platform that detects <em>and</em> fixes content issues — 11 specialist tools in one dashboard.
          </p>

          <ul className="space-y-4">
            {features.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-200 text-sm">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex gap-8">
            {[['11', 'AI tools'], ['8', 'Score dims'], ['3', 'Plan tiers']].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-black">{n}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight mb-10 lg:hidden">
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">◈</span>
          Optmizly
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-black text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign up free
              </Link>
            </p>
          </div>

          <SignIn
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
