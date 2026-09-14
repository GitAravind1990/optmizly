/**
 * The pricing FAQ and the date it was last reviewed.
 *
 * A plain module, not an export of `page-pricing.tsx`, and that is not a style preference:
 * every export of a `'use client'` module reaches a server component as a client *reference*,
 * so `PRICING_FAQ.map is not a function` at build time is what you get for importing data
 * across that boundary. /pricing needs the real array to build its JSON-LD on the server.
 */
/**
 * Plans and prices last reviewed. Rendered on the page and written into the JSON-LD as
 * `dateModified`, because freshness is one of the few things an answer engine can check
 * cheaply — and a price it cannot date is a price it has no reason to quote.
 *
 * Bump it in the same commit as any price, limit or plan change; it is on the checklist in
 * CLAUDE.md for exactly that reason. A date that stops moving is worse than no date.
 */
export const PRICING_UPDATED = '2026-09-14'

/**
 * One source for the pricing FAQ: rendered by the accordion in `page-pricing.tsx` *and*
 * imported by /pricing to build its FAQPage JSON-LD.
 *
 * It was two sources until now, and they had already drifted. The markup priced AI Visibility
 * at three credits and AI Citation Plan at two, which is what TOOL_COST_UNITS actually
 * charges; the copy a customer could read still carried the pre-rename list, pricing AI
 * Visibility at two and omitting the new tool entirely. Retyping an answer in two files is
 * how that happens, so the answer is typed once, here.
 *
 * Google's structured-data guidelines also require FAQPage markup to reflect content visible
 * on the page, so a question living only in JSON-LD is a compliance problem before it is a
 * scoring one.
 */
export const PRICING_FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan is free forever, no credit card required. You get 3 analyses per month and full access to content scoring, so you can see Optmizly’s value before committing.',
  },
  {
    q: 'What is the difference between Starter and Pro?',
    a: 'Volume, and nothing else. Starter and Pro unlock the same 12 tools; Starter gives you 15 analyses a month and Pro gives you 50. Because the data-heavy tools cost two or three credits per run, 15 credits is roughly five runs of something like Keyword Research — enough to work on one site, and the point at which most people move up to Pro.',
  },
  {
    q: 'What counts as one analysis?',
    a: 'Each time you submit content or a URL for scoring, it uses one analysis credit. Most tools cost one credit. Tools that pull more live data from third-party providers on your behalf cost more, and each one tells you its cost before you run it. Three credits: Keyword Research, Competitor Spy, Ranking Engine, Geogrid, AI Visibility and the Local SEO suite. Two credits: Backlinks, Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Citation Plan, Content Gap and Content Planner. Credits reset at the start of each billing month, and the Free plan’s tools all cost one. SEO Client Finder is the exception: it does not use analysis credits at all, and has its own limit of 5 searches a day.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings at any time, no hoops, no waiting. You keep full access until the end of your current billing period.',
  },
  {
    q: 'Can I try Optmizly before paying?',
    a: 'Yes. The Free plan gives you 2 tools and 3 analyses a month with no card required, for as long as you like. Paid plans are charged when you subscribe – there is no free trial – and you can cancel at any time from your account settings, keeping access until the end of the period you have paid for.',
  },
  {
    q: 'Do I need API keys or anything installed?',
    a: 'No. Optmizly is fully hosted and all AI analysis is included in your plan — you never need an AI provider key or any third-party setup to use it. Agency plan users can optionally connect Google Search Console for deeper SEO Audit insights, but it’s never required.',
  },
  {
    q: 'Can I pay annually?',
    a: 'Every paid plan can be billed monthly or once a year, chosen at checkout: Starter $9 or $90, Pro $19 or $190, Agency $49 or $490, Agency Plus $99 or $990 – paying yearly costs ten months instead of twelve, so you save about 17%. If you have a discount code that applies to the first billing cycle, it covers your first year and the subscription renews at the full annual price after that.',
  },
  {
    q: 'Can I upgrade or downgrade my plan?',
    a: 'Yes. Upgrade instantly from your dashboard settings. The new limits apply immediately. Downgrades take effect at the start of your next billing cycle.',
  },
]
