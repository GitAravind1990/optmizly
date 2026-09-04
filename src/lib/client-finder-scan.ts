/**
 * The per-business half of SEO Client Finder: analyse one site, score it, and the small
 * amount of machinery a batch of them needs.
 *
 * Extracted from the route because a deep scan spans several requests - the first call
 * discovers and analyses a batch, later calls analyse the next batch of the same stored
 * pool - and both handlers need identical scoring. Two copies of this would drift, and a
 * prospect scored differently on page two of a scan than on page one is a bug nobody
 * would think to look for.
 */
import type { DiscoveredBusiness } from '@/lib/places-discovery'
import { fetchHomepage, analyzeHomepage, type SEOFinding } from '@/lib/homepage-seo-check'
import { extractContacts, type ExtractedContacts } from '@/lib/contact-extract'
import { scoreOpportunity, classifyOpportunity, prospectRank, type OpportunityLevel } from '@/lib/opportunity-score'
import { summarizeProspects } from '@/lib/client-finder-ai'

/** How many sites one request analyses. Sized by the time budget, not by the page size:
 *  ten fetches at concurrency 5 with an 8s ceiling is ~16s, which leaves room inside the
 *  60s a signed-in POST gets. */
export const BATCH_SIZE = 10

/** Five at a time: enough to hide latency, few enough that a batch cannot open ten
 *  sockets and blow the memory ceiling on a small function. */
export const CONCURRENCY = 5

/** A scan stops once it has this many qualifying leads, or when the pool runs out. */
export const QUALIFIED_TARGET = 10

/**
 * What the user asked to see: Good and High only.
 *
 * Deliberately expressed against the level rather than a raw score, so it stays tied to
 * classifyOpportunity's calibrated bands. Anyone tempted to loosen this should move the
 * bands with fresh measurements instead - see opportunity-score.ts.
 */
export function isQualified(p: Prospect): boolean {
  return p.status === 'ANALYZED' && (p.opportunityLevel === 'Good' || p.opportunityLevel === 'High')
}

/**
 * Reorder a discovered pool so that any prefix of it samples the whole ranking.
 *
 * A scan analyses the pool in order and stops early once it has enough leads, so plain
 * Maps order would spend the first batches on ranks 1-10 - the businesses whose sites are
 * good, which is why they rank there. Interleaving by stride means batch one already
 * reaches ranks 1, 11, 21, 31... where the fixable sites are, so a scan that stops early
 * stops on better leads and pays for fewer fetches.
 */
export function spreadOrder<T>(items: T[], stride = BATCH_SIZE): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (a.i % stride) - (b.i % stride) || a.i - b.i)
    .map(x => x.item)
}

export type ProspectStatus = 'ANALYZED' | 'WEBSITE_UNAVAILABLE' | 'NO_WEBSITE'

export interface Prospect {
  id: string
  name: string
  website: string | null
  location: string
  rating: number | null
  phone: string | null
  opportunityScore: number
  opportunityLevel: OpportunityLevel
  topIssues: string[]
  findings: SEOFinding[]
  contacts: ExtractedContacts | null
  salesAngle: string | null
  status: ProspectStatus
  siteReachable: boolean
  rank: number
}

/**
 * Runs `worker` over `items` with at most `limit` in flight.
 *
 * A throwing worker must not reject the pool. analyzeBusiness is written not to throw, but
 * one unexpected exception would otherwise reject Promise.all and lose nine good prospects
 * along with the bad one, which is exactly the failure this tool cannot afford on a first
 * run. `onError` supplies the placeholder instead.
 */
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
  onError: (item: T, e: unknown) => R,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      try {
        results[i] = await worker(items[i])
      } catch (e) {
        results[i] = onError(items[i], e)
      }
    }
  })

  await Promise.all(runners)
  return results
}

const SEVERITY_ORDER: Record<SEOFinding['severity'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

/**
 * One business: fetch its homepage, check it, score it.
 *
 * Never throws. A site that times out, blocks us, redirects somewhere private or serves a
 * PDF becomes WEBSITE_UNAVAILABLE and stays in the list - an agency still wants to know the
 * business exists, and dropping it silently would make the result count look wrong.
 */
export async function analyzeBusiness(biz: DiscoveredBusiness): Promise<Prospect> {
  const base: Omit<Prospect, 'opportunityScore' | 'opportunityLevel' | 'topIssues' | 'findings' | 'contacts' | 'status' | 'siteReachable' | 'rank'> = {
    id: biz.placeId,
    name: biz.name,
    website: biz.website ?? null,
    location: biz.address,
    rating: biz.rating ?? null,
    phone: biz.phone ?? null,
    salesAngle: null,
  }

  if (!biz.hasWebsite || !biz.website) {
    // No site at all. Deliberately NOT scored: there is no homepage to measure, and
    // inventing a 100 here would be a fabricated number sitting beside real ones.
    return {
      ...base,
      opportunityScore: 0,
      opportunityLevel: 'Low',
      topIssues: [],
      findings: [],
      contacts: null,
      status: 'NO_WEBSITE',
      siteReachable: false,
      rank: 0,
    }
  }

  const page = await fetchHomepage(biz.website)
  if (!page) {
    return {
      ...base,
      opportunityScore: 0,
      opportunityLevel: 'Low',
      topIssues: [],
      findings: [],
      contacts: null,
      status: 'WEBSITE_UNAVAILABLE',
      siteReachable: false,
      rank: 0,
    }
  }

  const { findings, signals } = analyzeHomepage(page.html, page.finalUrl)
  // Same HTML, no extra request - the contact details are already in hand.
  const contacts = extractContacts(page.html, page.finalUrl)
  const opportunityScore = scoreOpportunity(signals)
  const ordered = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return {
    ...base,
    website: page.finalUrl,
    opportunityScore,
    opportunityLevel: classifyOpportunity(opportunityScore),
    topIssues: ordered.slice(0, 3).map(f => f.title),
    findings: ordered,
    contacts,
    status: 'ANALYZED',
    siteReachable: true,
    rank: prospectRank(opportunityScore, true),
  }
}

/**
 * The stand-in for a business whose analysis threw.
 *
 * It is never a qualifying lead, so it will not reach the user - but it still counts
 * towards `examined`, which keeps the scan's denominator honest and stops a run of
 * exceptions looking like a market with nothing in it.
 */
export function placeholderProspect(biz: DiscoveredBusiness): Prospect {
  return {
    id: biz.placeId,
    name: biz.name,
    website: biz.website ?? null,
    location: biz.address,
    rating: biz.rating ?? null,
    phone: biz.phone ?? null,
    salesAngle: null,
    opportunityScore: 0,
    opportunityLevel: 'Low',
    topIssues: [],
    findings: [],
    contacts: null,
    status: 'WEBSITE_UNAVAILABLE',
    siteReachable: false,
    rank: 0,
  }
}

/**
 * Analyse one batch and return only what qualifies.
 *
 * Shared by the start and continue routes so a prospect is scored identically on batch
 * five as on batch one. Two copies of this would drift, and a lead scored differently
 * depending on which request happened to reach it is a bug nobody would think to look for.
 */
/**
 * Options exist for the free public finder, whose constraints are the opposite of the paid
 * scan's: it is a stranger waiting on a page rather than a customer working a list, so wall
 * time matters more than depth, and nothing it produces may cost more than it has to.
 *
 * Both default to today's behaviour, so the paid path is untouched.
 */
export interface RunBatchOptions {
  /** Sites in flight. Defaults to CONCURRENCY (5). */
  concurrency?: number
  /**
   * Whether to spend a model call on sales angles. Defaults true.
   *
   * The public tool passes false: it strips `salesAngle` before responding, so paying to
   * generate one is buying an answer to throw away — and the call sits on the critical
   * path of a page someone is watching. `topIssues` survives either way; the deterministic
   * findings already populate it and the model only rewrites them when it runs.
   */
  aiSummaries?: boolean
}

export async function runBatch(
  businesses: DiscoveredBusiness[],
  opts: RunBatchOptions = {},
): Promise<{
  qualified: Prospect[]
  examined: number
  aiSummaries: boolean
}> {
  const concurrency = opts.concurrency ?? CONCURRENCY
  const wantSummaries = opts.aiSummaries ?? true

  const prospects = await pool(businesses, concurrency, analyzeBusiness, (biz, e) => {
    console.error(`[client-finder] ${biz.name} threw during analysis:`, e instanceof Error ? e.message : e)
    return placeholderProspect(biz)
  })

  // Only Good and High survive. Ranked by prospectRank rather than raw opportunity: a
  // dead site scores high and is a poor lead. See opportunity-score.ts.
  const qualified = prospects.filter(isQualified).sort((a, b) => b.rank - a.rank)

  if (!wantSummaries) {
    return { qualified, examined: prospects.length, aiSummaries: false }
  }

  // One model call per batch, over the qualifying prospects only. Summarising the
  // discarded ones would be paying to describe leads nobody will ever see.
  const summaries = await summarizeProspects(
    qualified.map(p => ({ id: p.id, name: p.name, opportunityScore: p.opportunityScore, findings: p.findings })),
  )
  for (const p of qualified) {
    const s = summaries.get(p.id)
    if (!s) continue
    p.salesAngle = s.salesAngle
    if (s.topThreeIssues.length > 0) p.topIssues = s.topThreeIssues
  }

  return { qualified, examined: prospects.length, aiSummaries: summaries.size > 0 }
}
