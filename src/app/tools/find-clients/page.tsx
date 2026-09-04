import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { PublicProspectFinder } from './client'

export const metadata: Metadata = {
  title: 'Find Your Next SEO Client — Free Prospect Finder | Optmizly',
  description:
    'Enter an industry and a city and see local businesses whose websites have fixable SEO problems, scored by opportunity. Free, no signup, 3 searches a month.',
  alternates: { canonical: 'https://optmizly.com/tools/find-clients' },
  openGraph: {
    title: 'Find Your Next SEO Client — Free Prospect Finder',
    description:
      'Local businesses with fixable SEO problems, scored by opportunity. Free, no signup.',
    url: 'https://optmizly.com/tools/find-clients',
    type: 'website',
  },
}

/** A tool, not an article. The FAQ answers what a sceptical agency owner actually asks:
 *  where the data comes from, why it is free, and what the paid product adds. */
const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'SEO Prospect Finder',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: 'https://optmizly.com/tools/find-clients',
      description:
        'Finds local businesses whose websites have fixable SEO problems, scored by opportunity, from an industry and a city.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Where do the businesses come from?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Google Places, the same listings you see on Maps. We then fetch each business’s public homepage and check it for the SEO problems an agency would fix — missing titles and meta descriptions, no structured data, weak heading structure, and so on.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does the opportunity score mean?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It is the share of our checks a site fails, so a high score means more fixable problems — a better prospect, not a better website. A business already doing SEO well scores low, because there is less for you to sell.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Three searches a month with no account and no card. Each search returns ten real prospects with real scores and issues. Contact details, CSV export, saved searches and drafted outreach are part of the paid Agency plan.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why only three a month?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every search pulls live business data from Google, which we pay for per request. Three a month is what we can give away without charging for it, and it is enough to see whether the tool finds you someone worth calling.',
          },
        },
      ],
    },
  ],
}

export default function PublicProspectFinderPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Find your next SEO client
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Pick an industry and a city. We&rsquo;ll find local businesses whose websites have
            problems you can fix, and score them by how much there is to sell.
          </p>
        </div>

        <PublicProspectFinder />

        {/* Below the tool, not above it: someone who arrived to run a search should not have
            to scroll past an explanation of the search to reach it. */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            ['We look them up', 'Real businesses from Google Places, the same listings on Maps.'],
            ['We read their site', 'Each public homepage, checked for the SEO problems agencies fix.'],
            ['We score the gap', 'More fixable problems means a higher score — and more to sell.'],
          ].map(([h, b]) => (
            <div key={h}>
              <p className="m-0 text-sm font-bold text-slate-900">{h}</p>
              <p className="mt-1 mb-0 text-sm leading-relaxed text-slate-600">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-bold text-slate-900">Questions</h2>
          <dl className="mt-4 space-y-5">
            {SCHEMA['@graph'][1].mainEntity!.map(q => (
              <div key={q.name}>
                <dt className="text-sm font-semibold text-slate-900">{q.name}</dt>
                <dd className="mt-1 ml-0 text-sm leading-relaxed text-slate-600">
                  {q.acceptedAnswer.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-12 text-center text-sm text-slate-500">
          Also free, no signup:{' '}
          <Link href="/tools/ai-search-readiness" className="font-semibold text-brand-600">AI Search Readiness</Link>
          {' · '}
          <Link href="/tools/eeat" className="font-semibold text-brand-600">E-E-A-T Checker</Link>
          {' · '}
          <Link href="/tools/ai-regex" className="font-semibold text-brand-600">AI Regex</Link>
        </p>
      </div>
    </div>
  )
}
