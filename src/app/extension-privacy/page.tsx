import Link from 'next/link'
import type { Metadata } from 'next'
import { EXTENSION_PRIVACY_UPDATED, legalDate } from '@/lib/legal'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'Chrome Extension Privacy Policy – Optmizly',
  description:
    'The Optmizly Chrome extension collects nothing: no network requests, no storage, no account. What it reads, what it does not do, and why it asks for activeTab.',
  alternates: { canonical: '/extension-privacy' },
}

/**
 * The privacy policy the Chrome Web Store listing points at.
 *
 * Separate from /privacy on purpose, and not a subsection of it: the extension is a different
 * product with a different answer. The platform collects account data, sends content to
 * sub-processors and stores results; the extension does none of those things, and a reader
 * sent here from the Web Store needs that answer without reading a policy about a SaaS they
 * have not signed up to. The store also asks for a URL that describes the extension's own
 * data handling.
 *
 * **It has to keep matching the extension** (`G:\optmizly-chrome-extension`). If the extension
 * ever makes a network request, stores anything, or asks for another permission, this page is
 * part of that change — a policy claiming "collects nothing" is the one claim a reviewer can
 * check against the code, and the Web Store will pull a listing over it.
 */
const sections = [
  {
    title: 'What the extension is',
    body: `The Optmizly SEO & AI Search Checker is a free Chrome extension. When you click its icon, it reads the page open in the active tab — the title, meta tags, headings, visible text, images, links and structured data — scores it for SEO and AI-search readiness in your browser, and shows the result in a popup.

That is the whole of what it does. This policy covers the extension only. The Optmizly web platform at optmizly.com is a separate product with its own privacy policy.`,
  },
  {
    title: 'The extension collects nothing',
    body: `It makes no network requests. There is no server behind it, nothing is uploaded, and no analysis ever leaves your computer.

It stores nothing. No browser storage, no cookies, no history of the pages you check. Close the popup and the result is gone.

It has no account, no sign-in and no identifiers, and it does not track you across sites or build a profile of your browsing.

It does not read pages in the background. It runs on the tab you are looking at, only when you click the icon.

It contains no analytics, no telemetry and no third-party code.`,
  },
  {
    title: 'Permissions, and why each one is needed',
    body: `activeTab — grants access to the current tab for a single action, when you click the extension icon. It is the narrowest permission that allows reading the page you are looking at, and it lapses afterwards.

scripting — required to run the read-only analysis in that tab. The injected code only reads the page; it does not modify it, make network requests, or write to storage.

The extension requests no host permissions, so it has no standing access to any website. That is why the icon has to be clicked on each page you want checked, and it is deliberate: an extension that can read every site you visit is a much larger promise than this one needs to make.`,
  },
  {
    title: 'The link to optmizly.com',
    body: `The popup has a button that opens Optmizly's full audit with the address of the page you were checking. Nothing is sent when the popup opens, or while it analyses — only if you click that button, and then it is your own browser visiting a web page in the ordinary way.

What happens after that is covered by the Optmizly privacy policy. The full audit is also usable without an account.`,
  },
  {
    title: 'Children',
    body: `The extension is not directed at children under 16 and collects no personal data from anyone.`,
  },
  {
    title: 'Changes',
    body: `If a future version of the extension ever collects, transmits or stores anything, this page will say so before that version ships, and the date above will change. The current version does none of those things.`,
  },
  {
    title: 'Contact',
    body: `Questions about the extension or this policy: privacy@optmizly.com.`,
  },
]

export default function ExtensionPrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Chrome Extension Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-8">
          Last updated: <time dateTime={EXTENSION_PRIVACY_UPDATED}>{legalDate(EXTENSION_PRIVACY_UPDATED)}</time>
        </p>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 mb-12">
          <p className="text-emerald-800 font-semibold text-sm">
            The extension collects nothing. It makes no network requests, stores nothing, and has
            no account — the analysis runs entirely in your browser.
          </p>
        </div>

        {sections.map(s => (
          <section key={s.title} className="mb-10">
            <h2 className="text-lg font-bold mb-3">{s.title}</h2>
            {s.body.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-3 last:mb-0">{para.trim()}</p>
            ))}
          </section>
        ))}

        <div className="border-t border-slate-200 pt-8 flex flex-wrap gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-700">Platform Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-slate-700">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}
