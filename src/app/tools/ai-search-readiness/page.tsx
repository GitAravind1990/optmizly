import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { FreeAudit } from '@/components/free-audit'
import { buildPageGraph, ORG_ID } from '@/lib/site-schema'

export const metadata: Metadata = {
  title: 'Free AI Search Readiness Audit — No Signup',
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

/**
 * One source for the FAQ, used to build the markup *and* rendered on the page below.
 *
 * These four questions previously existed only inside the JSON-LD. That is a problem twice
 * over: Google's structured-data guidelines require FAQPage markup to reflect content visible
 * on the page, and our own audit scored this page 33/100 on AEO readiness because it counted
 * one question-style heading — the page selling answer-engine readiness failing its own check.
 * Rendering from the same constant means the visible copy and the markup cannot drift apart.
 */
const FAQ: Array<{ q: string; a: string; points?: string[] }> = [
  {
    q: 'What does this audit actually check?',
    a: 'Six categories, all measured on the page you give us:',
    points: [
      'Technical foundation — HTTPS, viewport, canonical',
      'On-page signals — title, meta description, Open Graph',
      'Content and extractability — headings, word count present without JavaScript, internal links, alt text',
      'Structured data — which schema types are found',
      'AEO readiness — FAQ schema, question-led headings, lists',
      'GEO readiness — whether AI answer crawlers are allowed in robots.txt, plus author, date and entity signals',
    ],
  },
  {
    q: 'Is it really free?',
    a: 'Yes. Five audits per day, no account and no card. You see the complete result — every category score and every recommendation — not a preview with the useful part locked.',
  },
  {
    q: 'What do you do with my URL?',
    a: 'We fetch the page once, plus your robots.txt and llms.txt if they exist, measure them and return the result. Nothing is stored. There is no account to store it against, and no third party receives the URL — the analysis runs entirely on our own servers with no data vendor and no AI model involved.',
  },
  {
    q: 'Does a low score mean my site is broken?',
    a: 'No. It means the page is missing signals that AI search systems use. Most sites score in the 60s because they were built for traditional search, where FAQ schema, author attribution and entity links did not matter much. The score is a measure of readiness for a newer set of engines, not a verdict on your site.',
  },
  {
    q: 'How is this different from a normal SEO audit?',
    a: 'A normal audit asks whether Google can rank the page. This one asks whether an answer engine can quote it, which turns on different things: whether the substance is in the HTML rather than arriving after JavaScript, whether a question on the page has a liftable answer beside it, and whether anything identifies who stands behind the claim. A page can pass a traditional audit cleanly and still be invisible to an engine that writes answers.',
  },
  {
    q: 'Does a good score mean ChatGPT will cite me?',
    a: 'No, and nothing here claims to measure that. This audit reads your page and reports what an AI crawler would find. Whether an engine then cites you also depends on your authority and on what else exists for that query — neither of which is visible from a single page. Readiness is the part you control; it is necessary, not sufficient.',
  },
]

/**
 * When this tool shipped, and when its content last changed. Both are in the markup and
 * printed on the page, because "no published or modified date" was one of three findings
 * this page's own audit raised against it — freshness being one of the few things an answer
 * engine can check cheaply.
 */
const TOOL_PUBLISHED = '2026-08-29'
const TOOL_UPDATED = '2026-09-15'

/**
 * Marked up as a tool, matching /tools/eeat, on top of the shared site graph.
 *
 * The WebApplication node used to carry its own two-field `publisher: Organization` and
 * nothing else, so this page declared no `sameAs` and no dates — the other two findings.
 * Organization, WebSite and WebPage now come from site-schema.ts, the same nodes /pricing
 * and the homepage use, and the stub publisher is a reference to the real entity rather
 * than a second, thinner copy of it.
 */
const SCHEMA_JSON = buildPageGraph({
  path: '/tools/ai-search-readiness',
  name: 'Free AI Search Readiness Audit',
  datePublished: TOOL_PUBLISHED,
  dateModified: TOOL_UPDATED,
  extra: [
    {
      '@type': 'WebApplication',
      '@id': 'https://optmizly.com/tools/ai-search-readiness#app',
      name: 'AI Search Readiness Audit',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: 'https://optmizly.com/tools/ai-search-readiness',
      description:
        'Audits a page for AI search readiness across technical SEO, on-page signals, content extractability, structured data, AEO and GEO, and returns prioritized fixes.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': ORG_ID },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://optmizly.com/tools/ai-search-readiness#faq',
      // Built from FAQ above rather than retyped, so the markup always matches what a reader
      // sees. Where an answer renders as a list, the bullets are folded back into one string:
      // schema.org Answer text is plain prose, not markup.
      mainEntity: FAQ.map(({ q, a, points }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: points ? `${a} ${points.join('; ')}.` : a,
        },
      })),
    },
  ],
})

export default function AiSearchReadinessPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA_JSON }} />
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

        {/* Rendered from the same FAQ constant the JSON-LD is built from. The h2s are the
            question text verbatim, which is what an answer engine matches against — a heading
            reading "Pricing" over an answer about pricing gives it nothing to align to. */}
        <div className="mt-12">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Questions people ask before running it</h2>
          <div className="space-y-5">
            {FAQ.map(({ q, a, points }) => (
              <div key={q} className="rounded-2xl border border-slate-200 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">{q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
                {points && (
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600 list-disc pl-5">
                    {points.map(p => <li key={p} className="leading-relaxed">{p}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {/* The same two constants the JSON-LD carries, so the dates a reader sees and the
              dates an engine reads cannot disagree. */}
          <p className="mt-6 text-xs text-slate-500">
            Published{' '}
            <time dateTime={TOOL_PUBLISHED}>
              {new Date(`${TOOL_PUBLISHED}T00:00:00Z`).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
              })}
            </time>
            {'. Last updated '}
            <time dateTime={TOOL_UPDATED}>
              {new Date(`${TOOL_UPDATED}T00:00:00Z`).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
              })}
            </time>.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-center">
          <p className="text-sm text-slate-700 font-semibold">
            This audit reads one page. Optmizly is the platform that fixes what it finds —
            24 tools across SEO, GEO and AEO.
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
