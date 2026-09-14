/**
 * The Optmizly entity, defined once.
 *
 * These nodes were written inline on the homepage and nowhere else, so /pricing — the page
 * most likely to be quoted back as "how much does Optmizly cost" — carried FAQPage markup
 * and no statement of who Optmizly is. Copying the block to a second page would have set up
 * the same drift the pricing FAQ just cost us: an email, a logo path and a sameAs list typed
 * twice, diverging the first time one of them changes.
 *
 * `@id` is the anchor, not the URL of the page carrying it. The same organization appearing
 * on five pages is one entity referenced five times, which is what a stable `@id` says and
 * what lets a page's WebPage node point at it with `{ '@id': ... }` instead of restating it.
 */
export const APP_URL = 'https://optmizly.com'

export const ORG_ID = `${APP_URL}/#organization`
export const SITE_ID = `${APP_URL}/#website`

/**
 * When this site first went live: the repository's initial commit. A fixed historical fact,
 * so a constant rather than something derived at build — deriving it would read the oldest
 * commit a clone happens to contain, and Vercel clones shallowly, so a truncated history
 * would silently publish a wrong founding date.
 */
export const SITE_PUBLISHED = '2026-06-03'

/**
 * Last changed, resolved from git at build time. See resolveLastModified in next.config.js
 * for why it is not a literal and not `new Date()`.
 */
export const SITE_MODIFIED = process.env.SITE_LAST_MODIFIED ?? SITE_PUBLISHED

export const organizationNode = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Optmizly',
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  description:
    'AI search optimization platform covering SEO, GEO and AEO — auditing, optimizing and monitoring how websites appear in Google and in AI-generated answers.',
  // The address the Terms and Refund Policy both publish as the support contact, so this
  // schema field names an inbox that is documented as monitored.
  email: 'support@Optmizly.com',
  // Only profiles that actually exist. This is the field that resolves "Optmizly" to a known
  // entity rather than a word; add to it as more profiles do exist.
  sameAs: ['https://x.com/optmizly', 'https://linkedin.com/company/optmizly'],
} as const

export const websiteNode = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: APP_URL,
  name: 'Optmizly',
  publisher: { '@id': ORG_ID },
} as const

/**
 * A page's own `@graph`: the shared entity, this page, and the trail to it.
 *
 * `breadcrumb` is the trail *below* the homepage — `[{ name: 'Pricing', path: '/pricing' }]`
 * renders Home › Pricing. Pass nothing on the homepage: a BreadcrumbList whose only item is
 * the page it sits on describes no trail, and our own SEO audit scores it not-applicable
 * there for that reason.
 *
 * Render the same trail visibly wherever you pass one. Markup describing navigation a reader
 * cannot see is the fault this module's neighbour, pricing-faq.ts, exists to document.
 */
export function buildPageGraph(opts: {
  path: string
  name: string
  dateModified?: string
  breadcrumb?: Array<{ name: string; path: string }>
  extra?: Array<Record<string, unknown>>
}): string {
  const url = `${APP_URL}${opts.path === '/' ? '' : opts.path}`
  const graph: Array<Record<string, unknown>> = [
    { ...organizationNode },
    { ...websiteNode },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: opts.name,
      isPartOf: { '@id': SITE_ID },
      about: { '@id': ORG_ID },
      datePublished: SITE_PUBLISHED,
      dateModified: opts.dateModified ?? SITE_MODIFIED,
      inLanguage: 'en',
    },
  ]

  if (opts.breadcrumb?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [{ name: 'Home', path: '/' }, ...opts.breadcrumb].map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: `${APP_URL}${item.path === '/' ? '' : item.path}`,
      })),
    })
  }

  if (opts.extra) graph.push(...opts.extra)

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}
