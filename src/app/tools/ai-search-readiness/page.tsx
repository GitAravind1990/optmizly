import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { FreeAudit } from '@/components/free-audit'

export const metadata: Metadata = {
  title: 'Free AI Search Readiness Audit — Can ChatGPT Read Your Site? | Optmizly',
  description:
    'Check whether AI search engines can reach, read and cite your website. Free instant audit across technical SEO, structure, schema, AEO and GEO readiness. No signup.',
  alternates: { canonical: 'https://optmizly.com/tools/ai-search-readiness' },
  openGraph: {
    title: 'Free AI Search Readiness Audit — Can ChatGPT Read Your Site?',
    description:
      'See what an AI crawler sees when it visits your page, and exactly what to fix. Free, no signup.',
    url: 'https://optmizly.com/tools/ai-search-readiness',
    type: 'website',
  },
}

/** Marked up as a tool, matching /tools/eeat. The FAQ answers the objections people
 *  actually arrive with — is this real, is it free, and what are you doing with my URL. */
const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'AI Search Readiness Audit',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: 'https://optmizly.com/tools/ai-search-readiness',
      description:
        'Audits a page for AI search readiness across technical SEO, on-page signals, content extractability, structured data, AEO and GEO, and returns prioritized fixes.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Optmizly', url: 'https://optmizly.com' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does this audit actually check?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Six categories, all measured on the page you give us: technical foundation (HTTPS, viewport, canonical), on-page signals (title, meta description, Open Graph), content and extractability (headings, word count present without JavaScript, internal links, alt text), structured data (schema types found), AEO readiness (FAQ schema, question-led headings, lists) and GEO readiness (whether AI answer crawlers are allowed in robots.txt, plus author, date and entity signals).',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Five audits per day, no account and no card. You see the complete result — every category score and every recommendation — not a preview with the useful part locked.',
          },
        },
        {
          '@type': 'Question',
          name: 'What do you do with my URL?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We fetch the page once, plus your robots.txt and llms.txt if they exist, measure them and return the result. Nothing is stored. There is no account to store it against, and no third party receives the URL — the analysis runs entirely on our own servers with no data vendor and no AI model involved.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does a low score mean my site is broken?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. It means the page is missing signals that AI search systems use. Most sites score in the 60s because they were built for traditional search, where FAQ schema, author attribution and entity links did not matter much. The score is a measure of readiness for a newer set of engines, not a verdict on your site.',
          },
        },
      ],
    },
  ],
}

export default function AiSearchReadinessPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <PageHeader />

      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            AI Search Readiness Audit
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            See what an AI search engine sees when it visits your page — and exactly what to
            fix. Free, instant, no signup.
          </p>
        </div>

        <FreeAudit location="tool_page" />

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            {
              h: 'It checks the things a normal SEO audit skips.',
              p: 'Whether answer-engine crawlers are allowed in your robots.txt. Whether your content is in the HTML or arrives after JavaScript runs, which most AI crawlers never do. Whether anything on the page says who wrote it. These decide AI visibility and rarely appear in a site audit.',
            },
            {
              h: 'Measured, never estimated.',
              p: 'Every point traces to something we read on your page. Nothing is inferred from a model and nothing is guessed. Where something could not be measured — an unreachable robots.txt, say — the report says so instead of scoring it as a pass or a fail.',
            },
            {
              h: 'Nothing is stored.',
              p: 'We fetch the page, measure it and return the result. No account, no record, no third party: there is no data vendor and no AI provider behind this tool. We keep only an IP-keyed request counter to cap abuse, which expires within 26 hours.',
            },
          ].map(c => (
            <div key={c.h} className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-2">{c.h}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">What the categories mean</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Technical foundation', 'HTTPS, a mobile viewport and a canonical URL. The checks every crawler makes before it reads anything.'],
              ['On-page signals', 'Title and meta description — what a search result or a citation actually displays.'],
              ['Content & extractability', 'How much of your content exists in the HTML itself. Most AI crawlers do not run JavaScript, so anything rendered client-side is invisible to them.'],
              ['Structured data', 'Schema markup: telling an engine what you are rather than hoping it infers correctly.'],
              ['AEO readiness', 'Whether a question on your page has a liftable answer next to it — FAQ schema, question-led headings, scannable lists.'],
              ['GEO readiness', 'Whether generative engines may fetch you at all, and whether an author, a date and an entity identify who is behind the page.'],
            ].map(([term, def]) => (
              <div key={term}>
                <dt className="font-semibold text-slate-800">{term}</dt>
                <dd className="text-slate-600 leading-relaxed">{def}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Our other free tools</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/tools/eeat" className="text-blue-600 hover:underline font-medium">
                Free E-E-A-T Checker
              </Link>
              <span className="text-slate-500"> — score content on Experience, Expertise, Authoritativeness and Trust.</span>
            </li>
            <li>
              <Link href="/tools/ai-regex" className="text-blue-600 hover:underline font-medium">
                Free AI Regex Generator
              </Link>
              <span className="text-slate-500"> — describe a pattern in English, get a working regex for filtering SEO data.</span>
            </li>
          </ul>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-center">
          <p className="text-sm text-slate-700 font-semibold">
            This audit reads one page. Optmizly is the platform that fixes what it finds —
            23 tools across SEO, GEO and AEO.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            See the full platform →
          </Link>
          <p className="mt-2 text-xs text-slate-400">Free plan available, no card required.</p>
        </div>
      </div>
    </div>
  )
}
