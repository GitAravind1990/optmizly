/**
 * The SEO Opportunity Score: how much fixable SEO work a prospect's homepage shows.
 *
 * READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * This is a SALES score, not a search score. A high number means "this business has
 * problems an agency could fix and get paid for", not "this business ranks badly" and
 * certainly not "fixing these will move them up N positions". Nothing in this file sees a
 * SERP, and nothing here should ever be labelled a ranking score in code, in the API, or in
 * the UI. Optmizly has been burned before by a number that read as a measurement and was
 * actually an estimate.
 *
 * Deterministic and pure by design. The model that writes the sales angle never computes
 * this - it is handed the score after the fact. Same content in, same score out, every
 * time, which is what makes it defensible in front of a prospect.
 */
import type { SEOSignals } from './homepage-seo-check'

/**
 * Weights sum to exactly 100, and each check contributes a fraction of its own weight.
 *
 * Kept at 100 deliberately rather than normalising a running total: adding a check means
 * deciding what it is worth relative to the others and taking those points from somewhere,
 * which is a conversation worth being forced into. Normalising would silently rescale every
 * existing score the moment a check was added, and last month's prospect list would stop
 * matching this month's.
 *
 * The ordering reflects what an agency can actually sell. Missing schema and no HTTPS are
 * near the top not because they are the hardest SEO problems but because they are visible,
 * cheap to fix, and easy to show a business owner in their own browser. Canonical tags are
 * near the bottom for the same reason inverted: real, but nobody signs a contract over one.
 */
export const OPPORTUNITY_WEIGHTS = {
  /** Browsers label plain HTTP "Not secure". Visible to the owner in one click. */
  https: 10,
  /** The single biggest on-page lever, and the easiest to demo against a competitor. */
  title: 16,
  /** Missing descriptions mean Google writes the snippet. Easy, visible win. */
  metaDescription: 12,
  /** No H1, or several, is a standard audit finding and a quick fix. */
  h1: 10,
  /** Skipped levels: real but minor. */
  headings: 5,
  /** Thin homepages are the most common local-business problem and the biggest retainer. */
  content: 15,
  /** Alt coverage: accessibility and image search, rarely the thing that closes a deal. */
  imageAlt: 6,
  /** LocalBusiness markup is the classic "you are invisible to Google" pitch. */
  schema: 12,
  canonical: 3,
  /** Most local search is mobile; no viewport is severe and instantly demonstrable. */
  mobile: 8,
  /** A homepage that links nowhere strands the rest of the site. */
  internalLinks: 3,
} as const

const TOTAL_WEIGHT = Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0)

/** Guards the invariant above rather than trusting whoever edits the table next. */
if (TOTAL_WEIGHT !== 100) {
  throw new Error(`OPPORTUNITY_WEIGHTS must sum to 100, got ${TOTAL_WEIGHT}`)
}

export type OpportunityLevel = 'Low' | 'Moderate' | 'Good' | 'High'

/** Per-check severity in 0..1, multiplied by that check's weight. Exported so the UI can
 *  show which checks drove a score without recomputing it differently. */
export function opportunityBreakdown(s: SEOSignals): Record<keyof typeof OPPORTUNITY_WEIGHTS, number> {
  // Title: absent is the whole weight; generic is most of it, because a placeholder title
  // is nearly as useless as none; length alone is a partial miss.
  let title = 0
  if (!s.titlePresent) title = 1
  else if (s.titleGeneric) title = 0.75
  else if (s.titleLength < 20 || s.titleLength > 65) title = 0.4

  let metaDescription = 0
  if (!s.metaDescriptionPresent) metaDescription = 1
  else if (s.metaDescriptionLength < 70 || s.metaDescriptionLength > 165) metaDescription = 0.4

  // Several H1s is a real finding but a smaller one than having none at all.
  let h1 = 0
  if (s.h1Count === 0) h1 = 1
  else if (s.h1Count > 1) h1 = 0.5

  // Banded rather than continuous so a one-word difference cannot move a prospect between
  // levels. The bands are where the sales conversation changes, not where the maths does.
  let content = 0
  if (s.wordCount < 150) content = 1
  else if (s.wordCount < 300) content = 0.7
  else if (s.wordCount < 600) content = 0.3

  // A page with no images cannot be faulted for alt text.
  let imageAlt = 0
  if (s.imageCount > 0) {
    const coverage = s.imagesWithAlt / s.imageCount
    if (coverage < 0.5) imageAlt = 1
    else if (coverage < 0.8) imageAlt = 0.5
  }

  return {
    https: s.https ? 0 : 1,
    title,
    metaDescription,
    h1,
    headings: s.headingHierarchySane ? 0 : 1,
    content,
    imageAlt,
    schema: s.schemaPresent ? 0 : 1,
    canonical: s.canonicalPresent ? 0 : 1,
    mobile: s.viewportPresent ? 0 : 1,
    internalLinks: s.internalLinkCount < 5 ? 1 : 0,
  }
}

/** 0-100. Higher means more fixable problems, which means more to sell. */
export function scoreOpportunity(signals: SEOSignals): number {
  const breakdown = opportunityBreakdown(signals)
  let points = 0
  for (const key of Object.keys(OPPORTUNITY_WEIGHTS) as (keyof typeof OPPORTUNITY_WEIGHTS)[]) {
    points += OPPORTUNITY_WEIGHTS[key] * breakdown[key]
  }
  return Math.max(0, Math.min(100, Math.round(points)))
}

/**
 * Bands calibrated against real sites, 2026-08-23, not chosen in advance.
 *
 * The first version used 40/60/80 , picked before any data existed. Measured across five
 * live searches - dentists in Austin, plumbers in Bakersfield, barbers in Toledo,
 * landscapers in Mobile, accountants in Manchester UK - the actual distribution was:
 *
 *     n=31 (sites reachable and analysed)
 *     min 0   p25 5   median 13   p75 26   p90 39   max 61
 *
 * Under the old bands that put 29 of 31 in "Low" and nothing at all in "High". A tool whose
 * purpose is surfacing opportunity was telling an agency there was none, on every card.
 *
 * The reason is structural rather than a bad sample: a functioning small-business site has
 * HTTPS, a title, a viewport and a description, so it fails perhaps a third of the weighted
 * checks. Scoring 80 requires missing nearly everything at once, which describes an
 * abandoned site rather than a prospect - so the top of the old scale was unreachable by
 * anything worth phoning.
 *
 * These bands put roughly 35% / 29% / 19% / 16% of real sites into Low / Moderate / Good /
 * High, so a ten-result search surfaces one or two genuinely strong leads. The score itself
 * is unchanged and still means "share of weighted checks failed" - only the labels moved.
 *
 * Recalibrate from fresh measurements if the checks or weights change, and record the
 * distribution here when you do. Do not adjust these to make a demo look better.
 *
 * ── 2026-08-29: alt-text check corrected, bands deliberately NOT moved ───────────────────
 *
 * `imagesWithAlt` used to count `alt=""` as a missing alt attribute. An empty alt is the
 * correct markup for a decorative image, so sites whose markup was right were being faulted
 * for it, worth up to the full 6 points of `imageAlt`.
 *
 * Measured before and after across the 44 reachable sites among the 51 real prospects
 * stored in production:
 *
 *     score delta (old - new): mean 1.98, max 6, unchanged on 25 of 44
 *     bands before: Low 19, Moderate 14, Good 9, High 2
 *     bands after:  Low 23, Moderate 11, Good 8, High 2
 *     five sites moved down one band, four Moderate->Low and one Good->Moderate
 *
 * (Re-measured after the fetch rewrite in the same change, which made three more of the 51
 * reachable. The five sites that move and the size of the move are unaffected by that.)
 *
 * The bands stay at 10/20/35 on purpose. Every point removed was a fault the site did not
 * have, so the sites that moved down moved down correctly - they are less of an opportunity
 * than we thought. Re-banding to restore the old distribution would put that fabricated
 * opportunity straight back in under a different number, which is the thing this comment
 * exists to prevent.
 *
 * Knock-on worth knowing: Client Finder's qualify rate drops slightly (Good-or-High was
 * 10 of 41 here, now 9), so a deep scan examines a few more sites to reach ten leads.
 */
export function classifyOpportunity(score: number): OpportunityLevel {
  if (score >= 35) return 'High'
  if (score >= 20) return 'Good'
  if (score >= 10) return 'Moderate'
  return 'Low'
}

/**
 * Ranking order for the results list, which is NOT the opportunity score.
 *
 * A site that fails to load scores close to 100 - every check misses - while being one of
 * the worst prospects on the list: there is nobody maintaining it, quite possibly nobody
 * trading. Ranking purely by opportunity would float abandoned sites to the top of an
 * agency's call list and make the tool feel broken on first use.
 *
 * So reachability is worth 30 points of the ordering. A functioning site scoring 70 outranks
 * a dead one scoring 100 (79 against 70), while among reachable sites the opportunity score
 * still decides. Businesses with no website at all are a different category entirely and are
 * presented separately rather than ranked here.
 */
export function prospectRank(opportunityScore: number, siteReachable: boolean): number {
  return Math.round(opportunityScore * 0.7 + (siteReachable ? 100 : 0) * 0.3)
}
