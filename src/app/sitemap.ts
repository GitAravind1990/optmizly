import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'
import { PRICING_UPDATED } from '@/lib/pricing-faq'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://optmizly.com'

/**
 * `lastmod` is stated only where a real edit date exists, and omitted everywhere else.
 *
 * Every static entry here used to carry `new Date()`. Rendered per request, that claims
 * the whole site changed seconds ago, on every fetch, forever — a page that is always
 * fresh is indistinguishable from one that is never fresh, and it is the one signal in
 * the file Google can check against its own crawl. Worse, it drowned the entries where
 * the date is real: the posts were the only honest `lastmod` in the file and sat among
 * eleven that cried wolf.
 *
 * `lastmod` is optional in the protocol. No claim beats a false one, so pages whose edit
 * date is not derivable from data simply do not make one. The three that are:
 *   - blog posts, from `updatedAt` (see PostMeta.updated)
 *   - /pricing, from PRICING_UPDATED — the same constant the page prints and puts in its
 *     `dateModified`, so all three move together
 *   - /blog, from its newest post, since that is exactly when the index last changed
 *
 * If a static page gains a real modified date, give it one here too — do not reach back
 * for `new Date()`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getAllPosts()
  const posts = allPosts.map(post => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Newest edit across the index, not the newest publish: an edited post changes /blog's
  // rendered cards too.
  const blogIndexModified = allPosts.reduce<Date | undefined>((latest, p) => {
    const d = new Date(p.updated)
    return !latest || d > latest ? d : latest
  }, undefined)

  return [
    { url: APP_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/pricing`, lastModified: new Date(`${PRICING_UPDATED}T00:00:00Z`), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${APP_URL}/blog`, ...(blogIndexModified ? { lastModified: blogIndexModified } : {}), changeFrequency: 'weekly', priority: 0.8 },
    // Public, no-signup tools — the pages most likely to earn links, so they rank
    // just under the homepage rather than buried with the legal pages.
    { url: `${APP_URL}/tools/find-clients`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${APP_URL}/tools/ai-search-readiness`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${APP_URL}/tools/ai-regex`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${APP_URL}/tools/eeat`, changeFrequency: 'monthly', priority: 0.9 },
    ...posts,
    // Above the legal pages: these two carry the trust signals a first-time visitor and an
    // AI crawler both look for — who builds this, and how to reach them.
    { url: `${APP_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${APP_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}

