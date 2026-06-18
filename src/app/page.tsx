import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PageHero } from '@/components/page-hero'
import { PagePricing } from '@/components/page-pricing'

export const metadata: Metadata = {
  title: 'Optmizly – AI Content Optimizer | Rank Higher on Google & AI Search',
  description: 'Rank higher on Google and get cited by ChatGPT, Perplexity, and every AI engine. 11 AI-powered SEO tools: Content Optimizer, E-E-A-T Analysis, Topical Authority, SERP Audit, and more.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Optmizly – AI Content Optimizer',
    description: 'Rank higher on Google and get cited by ChatGPT & Perplexity. 11 AI-powered SEO tools for content teams and agencies.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – AI Content Optimizer' }],
  },
}

const tools = [
  { icon: '📊', name: 'Content Analyzer', desc: '8-dimension score with Issues & Entity tabs built in', plan: 'Free' },
  { icon: '🔍', name: 'On-Page SEO', desc: 'Title, meta, headings, schema and technical SEO audit', plan: 'Free' },
  { icon: '⚡', name: 'Content Optimizer', desc: 'Semantic SEO analysis + Full Rewrite mode – two tools in one', plan: 'Pro', new: true },
  { icon: '💡', name: 'Content Planner', desc: 'AI-generated content briefs and topic ideas for your niche', plan: 'Pro' },
  { icon: '📈', name: 'Rank Tracker', desc: 'Track keyword positions over time with trend alerts', plan: 'Pro' },
  { icon: '🕵️', name: 'Competitor Spy', desc: 'Reverse-engineer competitor content strategy and gaps', plan: 'Pro' },
  { icon: '🏆', name: 'E-E-A-T Analysis', desc: 'Deep Experience, Expertise, Authority, Trust analysis', plan: 'Pro' },
  { icon: '🕳️', name: 'Content Gap', desc: 'Topics competitors cover that you don\'t', plan: 'Pro' },
  { icon: '🔭', name: 'AI Visibility', desc: 'Citation strategy + AI query mapping – get cited by ChatGPT & Perplexity', plan: 'Pro' },
  { icon: '🔗', name: 'Backlinks', desc: 'Real site-specific link building opportunities', plan: 'Pro' },
  { icon: '🩺', name: 'SEO Audit', desc: 'Full technical SEO crawl with prioritised fix list', plan: 'Agency' },
  { icon: '📍', name: 'Local SEO Suite', desc: '4 tools – entities, NAP, local queries, GBP content', plan: 'Agency' },
  { icon: '📈', name: 'SERP Audit', desc: 'Competitor breakdown, root cause diagnosis, recovery plan', plan: 'Agency' },
  { icon: '🗺️', name: 'Topical Authority', desc: 'Visual keyword cluster map with search volumes & calendar', plan: 'Agency' },
  { icon: '🎯', name: 'Cite Tracker', desc: 'Simulate ChatGPT & Perplexity responses for your queries', plan: 'Agency' },
  { icon: '⚡', name: 'AI Performance Fixer', desc: 'Fix Core Web Vitals – LCP, CLS, FID – with AI-generated code patches', plan: 'Agency' },
  { icon: '📋', name: 'Client Reports', desc: 'White-label reports for all tools – export and share with clients', plan: 'Agency' },
]

const testimonials = [
  { quote: 'Optmizly completely changed how we approach content briefs. The Content Optimizer alone saves us hours – our content automatically gets fixed for E-E-A-T, citations, and schema in one click.', name: 'Sarah R.', role: 'Head of Content · SaaS Startup, Austin TX' },
  { quote: 'The Topical Authority mapper is unlike anything else. It gave me a full keyword cluster map for our niche in minutes – something that used to take our team an entire day in spreadsheets.', name: 'Mohamed K.', role: 'SEO Lead · Digital Agency, New York NY' },
  { quote: "We used to spend 3-4 hours per article on SEO research. With Optmizly we run an analysis in 30 seconds. Our average article score went from 48 to 79 in a month.", name: 'Priya L.', role: 'Founder · Content Studio, Los Angeles CA' },
  { quote: 'The SERP Audit and Local SEO suite together are worth the Agency plan alone. We onboarded 3 new local clients last month and ran full audits for each in under 10 minutes.', name: 'James T.', role: 'Director · Local SEO Agency, Dallas TX' },
  { quote: 'Finally a tool that understands AI search is different from traditional SEO. Traffic is up 34%.', name: 'Anika N.', role: 'Growth Manager · B2B SaaS, San Francisco CA' },
  { quote: "I compared Optmizly to Surfer SEO and MarketMuse. It's faster, cheaper, and the Content Optimizer actually FIXES issues – something neither offers.", name: 'Ravi V.', role: 'CEO · SEO Agency, Chicago IL' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <PageHero />

      {/* Social proof */}
      <section className="border-y border-slate-100 bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center mb-14">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
              Trusted by 500+ content teams worldwide
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className={`rounded-2xl border bg-white p-6 ${i === 5 ? 'border-brand-500 border-2' : 'border-slate-200'}`}>
                <div className="text-amber-400 text-sm mb-3">★★★★★</div>
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
              <span className="text-amber-400">★★★★★</span> 4.9 / 5 · 287 reviews
            </span>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">Everything you need</p>
          <h2 className="text-4xl font-extrabold text-center tracking-tight mb-4">17 Tools. One Platform.</h2>
          <p className="text-center text-slate-500 max-w-lg mx-auto mb-12">From content scoring to topical authority mapping and AI-powered fixing – built for content teams, SEOs, and agencies.</p>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map(t => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md hover:border-slate-300">
                {t.new && <div className="inline-block text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mb-2">NEW</div>}
                <div className="text-2xl mb-3">{t.icon}</div>
                <div className="font-bold text-sm mb-1">{t.name}</div>
                <div className="text-xs text-slate-500 leading-relaxed mb-3">{t.desc}</div>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                  t.plan === 'Free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  t.plan === 'Pro' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>{t.plan}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PagePricing />

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-6 text-center text-sm text-slate-400">
        <div className="font-bold text-slate-700 mb-1">Optmizly</div>
        <div className="mb-3">AI-powered content optimization for Google & AI search · © 2026 Optmizly</div>
        <div className="flex justify-center gap-6 text-xs">
          <Link href="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <a href="mailto:hello@optmizly.com" className="hover:text-slate-700">Contact</a>
        </div>
      </footer>
    </div>
  )
}
