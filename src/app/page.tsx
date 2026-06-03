import type { Metadata } from 'next'
import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Optmizly â€” AI Content Optimizer | Rank Higher on Google & AI Search',
  description: 'Rank higher on Google and get cited by ChatGPT, Perplexity, and every AI engine. 11 AI-powered SEO tools: Content Optimizer, E-E-A-T Analysis, Topical Authority, SERP Audit, and more.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Optmizly â€” AI Content Optimizer',
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 11 AI-powered SEO tools for content teams and agencies.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly â€” AI Content Optimizer' }],
  },
}

const tools = [
  { icon: 'ðŸ“Š', name: 'Content Analyzer', desc: '8-dimension score with Issues & Entity tabs built in', plan: 'Free' },
  { icon: 'âš¡', name: 'Content Optimizer', desc: 'Semantic SEO analysis + Full Rewrite mode â€” two tools in one', plan: 'Pro', new: true },
  { icon: 'ðŸ†', name: 'E-E-A-T Analysis', desc: 'Deep Experience, Expertise, Authority, Trust analysis', plan: 'Pro' },
  { icon: 'ðŸ”—', name: 'Relevant Backlinks', desc: 'Real site-specific link building opportunities', plan: 'Pro' },
  { icon: 'ðŸ”­', name: 'AI Visibility', desc: 'Citation strategy + AI query mapping â€” get cited by ChatGPT & Perplexity', plan: 'Pro' },
  { icon: 'ðŸ•³ï¸', name: 'Content Gap', desc: 'Topics competitors cover that you don\'t', plan: 'Pro' },
  { icon: 'ðŸŽ¯', name: 'Cite Tracker', desc: 'Simulate ChatGPT & Perplexity responses for your queries', plan: 'Agency' },
  { icon: 'âš¡', name: 'AI Performance Fixer', desc: 'Fix Core Web Vitals â€” LCP, CLS, FID â€” with AI-generated code patches', plan: 'Agency' },
  { icon: 'ðŸ“', name: 'Local SEO Suite', desc: '4 tools â€” entities, NAP, local queries, GBP content', plan: 'Agency' },
  { icon: 'ðŸ“ˆ', name: 'SERP Audit', desc: 'Competitor breakdown, root cause diagnosis, recovery plan', plan: 'Agency' },
  { icon: 'ðŸ—ºï¸', name: 'Topical Authority', desc: 'Visual keyword cluster map with search volumes & calendar', plan: 'Agency' },
]

const testimonials = [
  { quote: 'Optmizly completely changed how we approach content briefs. The Content Optimizer alone saves us hours â€” our content automatically gets fixed for E-E-A-T, citations, and schema in one click.', name: 'Sarah R.', role: 'Head of Content Â· SaaS Startup, Austin TX' },
  { quote: 'The Topical Authority mapper is unlike anything else. It gave me a full keyword cluster map for our niche in minutes â€” something that used to take our team an entire day in spreadsheets.', name: 'Mohamed K.', role: 'SEO Lead Â· Digital Agency, New York NY' },
  { quote: "We used to spend 3-4 hours per article on SEO research. With Optmizly we run an analysis in 30 seconds. Our average article score went from 48 to 79 in a month.", name: 'Priya L.', role: 'Founder Â· Content Studio, Los Angeles CA' },
  { quote: 'The SERP Audit and Local SEO suite together are worth the Agency plan alone. We onboarded 3 new local clients last month and ran full audits for each in under 10 minutes.', name: 'James T.', role: 'Director Â· Local SEO Agency, Dallas TX' },
  { quote: 'Finally a tool that understands AI search is different from traditional SEO. Traffic is up 34%.', name: 'Anika N.', role: 'Growth Manager Â· B2B SaaS, San Francisco CA' },
  { quote: "I compared Optmizly to Surfer SEO and MarketMuse. It's faster, cheaper, and the Content Optimizer actually FIXES issues â€” something neither offers.", name: 'Ravi V.', role: 'CEO Â· SEO Agency, Chicago IL' },
]

const plans = [
  {
    name: 'Free', price: '$0', period: 'forever', color: 'gray',
    features: ['3 analyses / month', '8-dimension content score', 'Issues audit (tab)', 'Entity gaps (tab)'],
    cta: 'Get Started Free', signedOutHref: '/signup', signedInHref: '/dashboard',
  },
  {
    name: 'Pro', price: '$19', period: 'per month', color: 'blue', featured: true,
    features: ['50 analyses / month', 'Everything in Free', 'âš¡ Content Optimizer + Full Rewrite', 'E-E-A-T deep analysis', 'Relevant Backlinks finder', 'ðŸ”­ AI Visibility (Citation + Queries)', 'Content Gap analyzer'],
    cta: 'Start Pro Trial', signedOutHref: '/signup', signedInHref: '/pricing',
  },
  {
    name: 'Agency', price: '$49', period: 'per month', color: 'amber',
    features: ['200 analyses / month', 'Everything in Pro', 'AI Citation Tracker', 'Local SEO Suite (4 tools)', 'SERP Competitor Audit', 'Topical Authority Mapper â˜…', 'AI Performance Fixer (Core Web Vitals)'],
    cta: 'Start Agency Trial', signedOutHref: '/signup', signedInHref: '/pricing',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 h-16">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm">â—ˆ</span>
            Optmizly
          </div>
          <div className="flex-1" />
          <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Blog</Link>
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
          <SignedOut>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/signup" className="ml-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
              Get Started Free â†’
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
              Open Dashboard â†’
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 mb-8">
          âš¡ NEW â€” Content Optimizer: The Only Tool That FIXES Your Content
        </div>
        <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 mb-6 md:text-6xl">
          Detect Issues.<br />
          <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
            AI-Fix Them Automatically.
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Optmizly is the only platform that detects AND fixes your content issues â€” with 11 specialist tools covering content analysis, E-E-A-T, citations, local SEO, topical authority, and automated optimization.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <SignedOut>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5">
              Start Analysing Free â†’
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5">
              Open Dashboard â†’
            </Link>
          </SignedIn>
          <a href="#pricing" className="rounded-full border-2 border-slate-300 px-7 py-4 text-base font-bold text-slate-700 hover:border-brand-600 transition-colors">
            See Pricing
          </a>
        </div>
        <div className="mt-16 flex justify-center gap-12 border-t border-slate-100 pt-12 flex-wrap">
          {[['11', 'AI-powered tools'], ['8', 'Score dimensions'], ['3', 'Plan tiers'], ['100%', 'AI-powered']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-3xl font-black text-slate-900">{n}</div>
              <div className="text-sm text-slate-400 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-100 bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Trusted by content teams at</p>
          <div className="flex justify-center items-center gap-10 flex-wrap opacity-50 grayscale mb-14">
            {['Growthack', 'ContentFlow', 'RankLab', 'Verblio', 'PitchBlack'].map(n => (
              <span key={n} className="text-lg font-black text-slate-700">{n}</span>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className={`rounded-2xl border bg-white p-6 ${i === 5 ? 'border-brand-500 border-2' : 'border-slate-200'}`}>
                <div className="text-amber-400 text-sm mb-3">â˜…â˜…â˜…â˜…â˜…</div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {t.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold">
              <span className="text-amber-400">â˜…â˜…â˜…â˜…â˜…</span> 4.9 / 5 Â· 287 reviews
            </span>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">Everything you need</p>
          <h2 className="text-4xl font-extrabold text-center tracking-tight mb-4">11 Tools. One Platform.</h2>
          <p className="text-center text-slate-500 max-w-lg mx-auto mb-12">From content scoring to topical authority mapping and AI-powered fixing â€” built for content teams, SEOs, and agencies.</p>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map(t => (
              <div key={t.name} className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${t.name === 'Content Optimizer' ? 'border-blue-500 border-2 bg-blue-50' : t.name === 'Topical Authority' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                {t.new && <div className="inline-block text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mb-2">NEW</div>}
                <div className="text-2xl mb-3">{t.icon}</div>
                <div className="font-bold text-sm mb-1">{t.name}</div>
                <div className="text-xs text-slate-500 leading-relaxed mb-3">{t.desc}</div>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                  t.plan === 'Free' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  t.plan === 'Pro' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>{t.plan}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">Simple pricing</p>
          <h2 className="text-4xl font-extrabold text-center tracking-tight mb-4">Start Free. Scale as You Grow.</h2>
          <p className="text-center text-slate-500 max-w-lg mx-auto mb-12">All analysis happens securely on our servers. No API keys needed.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div key={p.name} className={`relative rounded-2xl p-7 ${p.featured ? 'bg-white border-2 border-brand-600 shadow-xl shadow-blue-100' : 'bg-white border border-slate-200'}`}>
                {p.featured && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-bold text-white whitespace-nowrap">Most Popular</div>}
                <div className="text-sm font-bold text-slate-500 mb-2">{p.name}</div>
                <div className={`text-4xl font-black mb-1 ${p.color === 'blue' ? 'text-brand-600' : p.color === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>{p.price}</div>
                <div className="text-sm text-slate-400 mb-6">{p.period}</div>
                <div className="h-px bg-slate-100 mb-6" />
                {p.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm mb-2.5">
                    <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">âœ“</span>
                    <span>{f}</span>
                  </div>
                ))}
                <SignedOut>
                  <Link href={p.signedOutHref} className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-extrabold transition-opacity hover:opacity-90 ${
                    p.color === 'blue' ? 'bg-brand-600 text-white' :
                    p.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
                    'bg-slate-100 text-slate-700'
                  }`}>{p.cta}</Link>
                </SignedOut>
                <SignedIn>
                  <Link href={p.signedInHref} className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-extrabold transition-opacity hover:opacity-90 ${
                    p.color === 'blue' ? 'bg-brand-600 text-white' :
                    p.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
                    'bg-slate-100 text-slate-700'
                  }`}>{p.cta}</Link>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-6 text-center text-sm text-slate-400">
        <div className="font-bold text-slate-700 mb-1">Optmizly</div>
        <div className="mb-3">AI-powered content optimization for Google & AI search Â· Â© 2026 Optmizly</div>
        <div className="flex justify-center gap-6 text-xs">
          <Link href="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <a href="mailto:hello@Optmizly.com" className="hover:text-slate-700">Contact</a>
        </div>
      </footer>
    </div>
  )
}
