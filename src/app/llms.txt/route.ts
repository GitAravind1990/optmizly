import { getAllPosts } from '@/lib/blog'

export const runtime = 'nodejs'

/** Rebuilt hourly. The blog list is the only part that moves, and a crawler reading an
 *  hour-old copy of it loses nothing — while a per-request build would put a database
 *  query behind a public URL that bots poll. */
export const revalidate = 3600

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://optmizly.com'

/**
 * /llms.txt — the llmstxt.org convention: a short, curated map of the site for language
 * models, in markdown, at a fixed path.
 *
 * Generated rather than a file in /public, and generated from `getAllPosts()` — the same
 * source the sitemap uses — so the two cannot describe different sites as posts are
 * published. A hand-maintained copy of a page list is a copy that goes stale.
 *
 * **Deliberately states no prices, no plan limits and no tool count.** Those facts already
 * live in eight places that have to be updated together, and CLAUDE.md exists largely
 * because they drifted. Adding a ninth would be adding a ninth thing to forget — and a
 * stale price quoted back to someone by an AI assistant is worse than one on a page they
 * can see the date of. Everything numeric links to /pricing instead.
 *
 * An emerging convention, not a ranking factor. The audit at /tools/ai-search-readiness
 * says exactly that when it reports a missing llms.txt, and this file should not be sold
 * to anyone as more than it is.
 */
export async function GET() {
  const posts = await getAllPosts()

  const guides = posts.length
    ? posts
        .map(p => `- [${p.title}](${APP_URL}/blog/${p.slug}): ${p.description}`)
        .join('\n')
    : `- [Blog](${APP_URL}/blog)`

  const body = `# Optmizly

> An AI search optimization platform covering SEO, GEO and AEO — auditing, optimizing and monitoring how a website appears both in Google and in the AI systems that now answer on its behalf.

Optmizly exists because being found no longer means one thing. A page can rank on Google and still be unusable to a generative engine, usually because the crawler is blocked in robots.txt, the content only appears after JavaScript runs, or nothing on the page identifies who wrote it. Three kinds of work are involved and they are not interchangeable:

- **SEO** — Search Engine Optimization. Can a search engine crawl, understand and rank the page?
- **GEO** — Generative Engine Optimization. Can a generative engine reach the page, and does anything establish who is behind it? This is where crawler access, author attribution and entity signals matter.
- **AEO** — Answer Engine Optimization. Does a specific question on the page have a self-contained, liftable answer, marked up so a machine can find the pairing?

## Free tools, no account required

These need no signup, no card, and store nothing. Five uses per day each.

- [AI Search Readiness Audit](${APP_URL}/tools/ai-search-readiness): Enter a URL and get a measured readiness score across technical foundation, on-page signals, content extractability, structured data, AEO and GEO — including whether AI answer crawlers are allowed in robots.txt and whether the content survives without JavaScript. Every check is deterministic; nothing is estimated.
- [E-E-A-T Checker](${APP_URL}/tools/eeat): Paste content and score it against Experience, Expertise, Authoritativeness and Trustworthiness, with the specific weaknesses to fix first.
- [AI Regex Generator](${APP_URL}/tools/ai-regex): Describe a pattern in plain English and get a working regular expression, for filtering SEO exports and keyword lists.

## Product

- [Pricing and plan comparison](${APP_URL}/pricing): Current prices, monthly and annual options, per-plan usage limits, the full feature comparison, and answers to what counts as one analysis.
- [Home](${APP_URL}/): What the platform does, how the discover → audit → optimize → generate → monitor workflow fits together, and who each plan suits.
- [Sign up](${APP_URL}/signup): Free plan available with no card.

## Guides

${guides}

## Optional

- [Privacy Policy](${APP_URL}/privacy): What data is collected, which sub-processors receive it, and how long it is kept.
- [Terms of Service](${APP_URL}/terms): Plan limits, billing frequency and cancellation behaviour.
- [Refund Policy](${APP_URL}/refund-policy): When the card is charged and what access survives a cancellation.
`

  return new Response(body, {
    headers: {
      // text/plain so it renders in a browser rather than downloading. The content is
      // markdown, which is what the convention asks for.
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
