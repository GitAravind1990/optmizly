import { getBulkDomainRanks } from '@/lib/dataforseo'

/**
 * Domain authority, from DataForSEO's backlink rank.
 *
 * Replaces OpenPageRank, which died on 2026-09-21 when its API moved to Keywords Everywhere
 * and the old host started 301ing to a 404. The replacement was already in the building: every
 * `/v3/backlinks/summary/live` response carries a `rank`, and three of the six tools that
 * wanted authority were already making that call and discarding the field.
 *
 * **The scale changed, and the numbers are not comparable.** OPR was 0-10 and scored google.com
 * at 6.32 for as long as the health cron has records; DataForSEO is 0-1000 and scores it 940.
 * Rendered on the product's usual 0-100 that is 63 against 94 — the same domain, a 31-point
 * move, from swapping vendors rather than from anything changing in the world. Any stored score
 * written before this switch is on the old basis. Do not chart the two together.
 */

/** Authority for one domain, on the 0-100 scale every surface renders. */
export type DomainAuthority = {
  domain: string
  /** DataForSEO's raw backlink rank, 0-1000. Kept so a future rescale can be exact. */
  rank: number
  /** 0-100. Meaningless unless `known`. */
  score: number
  /**
   * False when the vendor has no usable record of this domain.
   *
   * **This is the field that matters.** Every consumer has an estimate to fall back on, and the
   * whole point of a real lookup is knowing which of the two you are looking at — the
   * `isReal` flags in the ranking engine and `quality.authority` in Competitor Spy both hang
   * off it. OpenPageRank answered this with a per-domain status code; DataForSEO does not, so
   * it is derived below. Read `rankIsKnown` before trusting a zero anywhere.
   */
  known: boolean
}

/**
 * A rank of 0 is treated as "unknown", not as a measured zero.
 *
 * Measured 2026-09-23: `bulk_ranks` returns `rank: 0` both for optmizly.com, a real domain with
 * almost no backlinks, and for `a-domain-that-does-not-exist-9xq7.com`, which has never
 * existed. The response cannot tell them apart, so neither can we.
 *
 * Resolving the ambiguity toward "unknown" is deliberate. The two errors are not symmetric: a
 * genuinely unlinked domain reported as unknown falls back to an estimate, which is roughly
 * right and labelled as an estimate; an unknown domain reported as a real 0 renders a
 * confident "0/100" that is a claim we cannot support. Competitor Spy's existing comment names
 * that exact failure as the reason it checked OPR's per-domain status, so it is a mistake this
 * codebase has already decided not to make.
 *
 * The cost is real, and larger than it first looks. Measured the same day: optmizly.com has
 * **23 referring domains** and still ranks 0. So rank 0 is not only the empty case — small
 * sites with genuine links land there too, and they are exactly the customers this product
 * serves. Those domains will show an estimate rather than a measured score.
 *
 * Where a caller also holds the backlinks summary it can do better, because `referring_domains`
 * disambiguates: rank 0 with referring domains > 0 is a real measurement of negligible
 * authority, while rank 0 with no referring domains is indistinguishable from unknown. Use
 * `authorityFromSummary` on those paths. The bulk endpoint returns no such field, so callers
 * batching many domains have only the conservative rule.
 */
export function rankIsKnown(rank: number | null | undefined): boolean {
  return typeof rank === 'number' && rank > 0
}

/** DataForSEO's 0-1000 onto the 0-100 the UI renders. */
export function scoreFromRank(rank: number): number {
  return Math.round(Math.min(1000, Math.max(0, rank)) / 10)
}

export function authorityFromRank(domain: string, rank: number | null | undefined): DomainAuthority {
  const r = typeof rank === 'number' ? rank : 0
  return { domain, rank: r, score: scoreFromRank(r), known: rankIsKnown(r) }
}

/** DataForSEO caps `bulk_ranks` at 1000 targets per call. */
const MAX_TARGETS_PER_CALL = 1000

/**
 * Authority for many domains in one call.
 *
 * Measured 2026-09-23: eight domains cost $0.0243, the same as a single-domain summary call, so
 * the per-domain cost of a batch is effectively nil and a batch is always worth preferring over
 * a loop. `/v3/backlinks/summary/live` refuses more than one task per request — that is the
 * limitation this path exists to avoid.
 *
 * Domains the vendor has no record of are absent from the vendor's result; they come back here
 * as `known: false` rather than going missing, so a caller iterating its own domain list always
 * finds an entry and never has to guess what an absence meant.
 */
export async function getDomainAuthorities(domains: string[]): Promise<Map<string, DomainAuthority>> {
  const out = new Map<string, DomainAuthority>()
  const unique = [...new Set(domains.filter(Boolean))]
  if (unique.length === 0) return out

  for (let i = 0; i < unique.length; i += MAX_TARGETS_PER_CALL) {
    const batch = unique.slice(i, i + MAX_TARGETS_PER_CALL)
    const ranks = await getBulkDomainRanks(batch)
    for (const d of batch) out.set(d, authorityFromRank(d, ranks.get(d)))
  }
  return out
}

/**
 * Authority for one domain.
 *
 * A domain the vendor does not know comes back with `known: false` rather than null, because
 * "asked, nothing there" is a final answer while a thrown lookup is worth retrying. Callers
 * that cannot tolerate a throw should catch it themselves, as they did with OpenPageRank.
 */
export async function getDomainAuthority(domain: string): Promise<DomainAuthority> {
  const map = await getDomainAuthorities([domain])
  return map.get(domain) ?? authorityFromRank(domain, 0)
}

/**
 * Authority from a backlinks summary, which carries `referring_domains` alongside the rank.
 *
 * Better than `authorityFromRank` wherever a summary is already in hand: a domain with links
 * but a rank of 0 is a genuine "measured, and it is negligible", not an absence. Only the
 * no-links-and-no-rank case stays unknown, which is the case that truly is unknowable here.
 */
export function authorityFromSummary(
  domain: string,
  summary: { rank?: number | null; referringDomains?: number | null } | null | undefined
): DomainAuthority {
  const rank = typeof summary?.rank === 'number' ? summary.rank : 0
  const refs = typeof summary?.referringDomains === 'number' ? summary.referringDomains : 0
  return { domain, rank, score: scoreFromRank(rank), known: rank > 0 || refs > 0 }
}
