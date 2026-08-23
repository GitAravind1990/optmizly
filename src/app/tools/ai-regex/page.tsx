import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PublicAiRegex } from './client'

export const metadata: Metadata = {
  title: 'Free AI Regex Generator — Describe It in Plain English | Optmizly',
  description:
    'Describe what you want to match and get a working regex, then run it on your own data instantly. Free, no signup. Built for SEO data: search queries, keywords and URLs.',
  alternates: { canonical: 'https://optmizly.com/tools/ai-regex' },
  openGraph: {
    title: 'Free AI Regex Generator — Describe It in Plain English',
    description:
      'Describe what you want to match, get a working regex, and run it on your own data. Free, no signup.',
    url: 'https://optmizly.com/tools/ai-regex',
    type: 'website',
  },
}

/** Marked up as a tool rather than an article: this page exists to be used, and the
 *  FAQ answers the two objections people actually have (is it accurate, is it free). */
const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'AI Regex Generator',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      url: 'https://optmizly.com/tools/ai-regex',
      description:
        'Generates a regular expression from a plain-English description and runs it against your data.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Optmizly', url: 'https://optmizly.com' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does the AI decide which lines match?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The AI only writes the pattern. Your data is matched by a real regex engine (RE2), so the result is exact and repeatable — the same pattern on the same data always returns the same rows.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Five generated patterns per day, no account needed. Editing a pattern and re-running it does not count against that, because matching happens locally and costs nothing.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is my data sent anywhere?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Only a sample of up to 15 lines is sent to the AI provider as context for writing the pattern. The full dataset is matched on our server and is not stored.',
          },
        },
      ],
    },
  ],
}

export default function PublicAiRegexPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <PageHeader />

      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            AI Regex Generator
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Describe what you want to match in plain English. Get a working regex, and run it on your
            own data straight away. Free, no signup.
          </p>
        </div>

        <PublicAiRegex />

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            {
              h: 'The AI writes the pattern. It does not pick the rows.',
              p: 'Your data is matched by a real regex engine, so the result is exact and repeatable — the same pattern on the same data always returns the same rows. You can read the pattern, check it, and edit it.',
            },
            {
              h: 'Editing and re-running is unlimited.',
              p: 'Only generating a new pattern counts against the daily limit. Tweak a word boundary, flip the inversion, run it again as often as you like.',
            },
            {
              h: 'Built for SEO data.',
              p: 'Search Console queries, keyword lists, URLs and headings. It knows what "question queries", "long-tail" and "non-branded" mean without being told.',
            },
          ].map(c => (
            <div key={c.h} className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-2">{c.h}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-center">
          <p className="text-sm text-slate-700 font-semibold">
            Optmizly is an SEO platform with 23 tools — rank tracking, content scoring, backlink
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
