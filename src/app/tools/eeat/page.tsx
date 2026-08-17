import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PublicEeat } from './client'

export const metadata: Metadata = {
  title: 'Free E-E-A-T Checker — Score Your Content in Seconds | Optmizly',
  description:
    'Paste your page and get an E-E-A-T score across Experience, Expertise, Authoritativeness and Trustworthiness, with the specific fixes to make first. Free, no signup.',
  alternates: { canonical: 'https://optmizly.com/tools/eeat' },
  openGraph: {
    title: 'Free E-E-A-T Checker — Score Your Content in Seconds',
    description:
      'Score any page against Google\'s four E-E-A-T signals and see what to fix first. Free, no signup.',
    url: 'https://optmizly.com/tools/eeat',
    type: 'website',
  },
}

/** Marked up as a tool rather than an article: the page exists to be used. The FAQ answers
 *  the objections people actually arrive with — is this Google's real score, is it free,
 *  and where does my content go. */
const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'E-E-A-T Checker',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: 'https://optmizly.com/tools/eeat',
      description:
        'Scores page content against the four E-E-A-T signals — Experience, Expertise, Authoritativeness and Trustworthiness — and returns specific improvements.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Optmizly', url: 'https://optmizly.com' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is this Google\'s actual E-E-A-T score?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No, and no tool can give you one. Google does not publish an E-E-A-T score and there is no API for it. E-E-A-T is a set of quality signals its human raters and systems assess. This tool scores your content against those four signals so you can see which is weakest and fix it.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Five analyses per day, no account and no card required. It is the same analysis the paid tool runs, not a cut-down preview.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is my content stored?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The first 3,000 characters are sent to our AI provider to produce the score, and nothing is written to our database — there is no account to store it against. It is not used to train any model.',
          },
        },
        {
          '@type': 'Question',
          name: 'What do the four E-E-A-T letters mean?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Experience is first-hand involvement with the subject. Expertise is demonstrated knowledge and depth. Authoritativeness is recognition as a source worth citing. Trustworthiness covers accuracy, transparency and safety. The extra E for Experience was added by Google in December 2022.',
          },
        },
      ],
    },
  ],
}

export default function PublicEeatPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <PageHeader />

      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            E-E-A-T Checker
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Paste a page and see how it scores on Experience, Expertise, Authoritativeness and
            Trustworthiness — plus the specific things to fix first. Free, no signup.
          </p>
        </div>

        <PublicEeat />

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            {
              h: 'Nobody can show you Google\'s E-E-A-T score.',
              p: 'There isn\'t one to show. Google publishes no score and offers no API for it — E-E-A-T is a set of quality signals, not a metric. This scores your content against those four signals so you can tell which is weakest. Treat any tool claiming to read your real score with suspicion.',
            },
            {
              h: 'The same analysis the paid tool runs.',
              p: 'Not a teaser with the useful half removed. The free version and the signed-in version call one shared engine and read the same first 3,000 characters. What you get here is the real output.',
            },
            {
              h: 'Nothing is stored.',
              p: 'There is no account to store it against, so no record is written and none of it trains a model. We keep only an IP-keyed request counter to cap abuse, which expires within 26 hours.',
            },
          ].map(c => (
            <div key={c.h} className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-2">{c.h}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Learn the fundamentals</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/blog/eeat-guide-for-seo" className="text-blue-600 hover:underline font-medium">
                E-E-A-T (EEAT) Explained: The Complete Guide for SEO
              </Link>
              <span className="text-slate-500"> — what each signal is and how Google assesses it.</span>
            </li>
            <li>
              <Link href="/blog/what-is-eeat-and-how-to-improve-your-score" className="text-blue-600 hover:underline font-medium">
                What Is E-E-A-T and How to Improve Your Score
              </Link>
              <span className="text-slate-500"> — the practical changes that move each dimension.</span>
            </li>
            <li>
              <Link href="/tools/ai-regex" className="text-blue-600 hover:underline font-medium">
                Free AI Regex Generator
              </Link>
              <span className="text-slate-500"> — our other no-signup tool, for filtering SEO data.</span>
            </li>
          </ul>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-center">
          <p className="text-sm text-slate-700 font-semibold">
            Optmizly is an SEO platform with 22 tools — rank tracking, content scoring, backlink
            analysis, Search Console integration and more.
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
