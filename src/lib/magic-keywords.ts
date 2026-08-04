/** Shared definition of a "magic" keyword — one you can realistically win.
 *
 *  Kept in one place because both the dashboard (which renders the tab) and the
 *  SERP-check route (which decides what to spend DataForSEO calls on) filter on it;
 *  if the two ever drifted apart, the button would check a different set of keywords
 *  than the table displays.
 *
 *  Both thresholds read straight from stored DataForSEO values, so the rule is
 *  reproducible and can be stated to the user in full. */
export const MAGIC_MAX_KD = 30
export const MAGIC_MIN_VOLUME = 100

/** Keyword Difficulty is derived from the backlink profile of the *pages* currently
 *  ranking, which makes it blind to domain-level authority: a page with 9 referring
 *  domains on nike.com scores KD 0 even though nobody is outranking Nike. Verified
 *  live — "best running shoes for flat feet" (9,900/mo) scores KD 0 while its top 10
 *  is Reddit, Runner's World, Brooks, Nike and Dick's.
 *
 *  No batchable second metric corrects this: average domain rank across the SERP is
 *  inverted (obscure queries score *higher* because Reddit/YouTube dominate them),
 *  and average referring domains shares KD's page-level blind spot. So rather than
 *  compress it into another number, callers verify candidates against the actual
 *  ranking domains and let a human judge. */
export function isMagicCandidate(kw: { difficulty: number | null; searchVolume: number | null }): boolean {
  return kw.difficulty !== null && kw.difficulty <= MAGIC_MAX_KD && (kw.searchVolume ?? 0) >= MAGIC_MIN_VOLUME
}

/** Domains are stored comma-separated (they never contain commas) to match the
 *  scalar-only style of the rest of the schema. Null means "not checked yet";
 *  an empty string means checked and the SERP genuinely returned nothing. */
export function parseTopDomains(stored: string | null): string[] {
  if (!stored) return []
  return stored.split(',').map(d => d.trim()).filter(Boolean)
}

/** Lowercase alphanumerics only, so "SE Ranking" and "seranking.com" compare equal. */
function collapse(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Registrable label of a host, minus www and TLD: "www.seranking.com" -> "seranking". */
function domainLabel(host: string): string {
  const bare = host.toLowerCase().replace(/^www\./, '')
  return collapse(bare.split('.')[0] ?? '')
}

/** How much of the keyword the #1 domain's name must account for before it reads as
 *  that brand's own query. Tuned against real candidates: "seoptimer" is 100% covered
 *  by seoptimer.com and "se ranking login" is 64% covered by seranking.com, while a
 *  generic term whose SERP is owned by unrelated majors scores near zero. */
export const BRAND_COVERAGE_THRESHOLD = 0.6

/**
 * True when the keyword is somebody's brand query.
 *
 * These are the worst possible "opportunities": they score low difficulty precisely
 * BECAUSE they are brand terms — nobody competes for a rival's brand, so the ranking
 * pages carry few links and every difficulty metric reads that as weakness. You cannot
 * win "seoptimer" at any KD, because SEOptimer will always be the best result for it.
 *
 * The only reliable signal is the SERP itself: if the #1 domain's name is most of the
 * keyword, or the keyword opens with it, the keyword names that company.
 *
 * Intent labels deliberately play no part. They were tried and measured against real
 * candidates, where they called one correctly and one wrongly while missing both of the
 * cases that prompted this: "seoptimer" is tagged commercial, "se ranking api"
 * informational, and the perfectly generic "backlink generator" navigational. A signal
 * that lands near chance is worse than none, because it looks like a filter.
 *
 * Consequence: a keyword can only be judged once its SERP has been fetched. Unchecked
 * keywords are treated as not-brand rather than guessed at.
 */
export function isBrandQuery(kw: { keyword: string; topDomains: string | null }): boolean {
  const domains = parseTopDomains(kw.topDomains)
  if (domains.length === 0) return false

  const top = domainLabel(domains[0])
  const collapsed = collapse(kw.keyword)
  if (!top || !collapsed) return false
  if (top.length < 4 || !collapsed.includes(top)) return false
  // Either the brand name is most of the keyword ("seoptimer"), or the keyword leads
  // with it and trails into a feature or action ("se ranking ai visibility tracker",
  // "se ranking login") — both are that company's own query, not an opening.
  return top.length / collapsed.length >= BRAND_COVERAGE_THRESHOLD || collapsed.startsWith(top)
}
