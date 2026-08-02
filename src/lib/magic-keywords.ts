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
