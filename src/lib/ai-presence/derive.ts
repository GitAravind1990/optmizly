import type { PromptOutcome, SurfaceOutcome } from '@/lib/ai-visibility'
import { classifyQuery, type ClassifiedQuery } from './classify'
import type { SourceType } from './config'

/**
 * Turns stored AI Visibility runs into everything the AI Presence dashboard shows.
 *
 * Derivation at read time rather than a second set of tables, and that is a deliberate
 * design choice rather than laziness. A CitationGap row is a *conclusion*; the run it came
 * from is the *evidence*. Storing conclusions means they survive the evidence changing — a
 * gap row would go on asserting a competitor was cited after a re-scan showed otherwise, and
 * nothing would reconcile the two. Deriving keeps exactly one source of truth, which is the
 * whole point of the no-fabrication rule.
 *
 * The cost is recomputation, which is free here: one run holds at most a few dozen prompts.
 * If that changes, cache the derivation — do not denormalise the conclusions.
 */

/** The two Google surfaces this product actually measures. Not chat assistants. */
export type Provider = 'AI Overviews' | 'AI Mode'

export type StoredRun = {
  id: string
  brand: string
  domain: string | null
  aliases: string[]
  promptSource: string
  promptCount: number
  totalMentions: number
  totalCitations: number
  answersFound: number
  lookupsFailed: number
  createdAt: Date
  outcomes: PromptOutcome[]
}

/** One prompt, on one surface, as observed. The atom everything else is counted from. */
export type QueryObservation = {
  runId: string
  query: string
  provider: Provider
  answerPresent: boolean
  mentions: number
  cited: boolean
  citedDomains: string[]
  citedUrls: Array<{ domain: string; url: string; title: string }> | null
  observedAt: Date
  /** OBSERVED: read straight out of the engine's answer. */
  sourceType: SourceType
}

/**
 * Strip a stored domain down to the bare host.
 *
 * Lowercased *first*, because the prefix patterns are case-sensitive and a host does not
 * arrive in one predictable case. Stripping before lowercasing leaves `WWW.Rival.com` as
 * `www.rival.com`, which then matches no cited domain at all — a competitor marked that way
 * would silently produce no gaps forever, with nothing on screen to say why.
 */
export function toHost(domain: string | null | undefined): string | null {
  if (!domain) return null
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '') || null
}

/**
 * Parse a run's `detail` blob without trusting it.
 *
 * The column is free text holding whatever JSON.stringify produced at the time, across
 * however many versions of the scanner have run. A malformed or older row must degrade to
 * "no observations" rather than throw — one unreadable run should not take down the whole
 * dashboard for every other run the customer has.
 */
export function parseOutcomes(detail: string): PromptOutcome[] {
  try {
    const parsed = JSON.parse(detail) as { outcomes?: unknown }
    if (!Array.isArray(parsed.outcomes)) return []
    return parsed.outcomes.filter(
      (o): o is PromptOutcome => !!o && typeof (o as PromptOutcome).prompt === 'string'
    )
  } catch {
    return []
  }
}

/** Flatten runs into per-prompt, per-surface observations. */
export function observationsFrom(runs: StoredRun[]): QueryObservation[] {
  const out: QueryObservation[] = []
  for (const run of runs) {
    for (const o of run.outcomes) {
      const surfaces: Array<[Provider, SurfaceOutcome | null]> = [
        ['AI Overviews', o.aiOverview],
        ['AI Mode', o.aiMode],
      ]
      for (const [provider, s] of surfaces) {
        // null means the lookup itself failed. Distinct from an answer that exists without
        // you in it, and it must not be counted as either a miss or a hit.
        if (s === null) continue
        out.push({
          runId: run.id,
          query: o.prompt,
          provider,
          answerPresent: s.answerPresent,
          mentions: s.mentions,
          cited: s.cited,
          citedDomains: s.citedDomains ?? [],
          // undefined means this run predates URL capture; [] means the answer cited
          // nothing. The report has to be able to tell those apart.
          citedUrls: s.citedUrls ?? null,
          observedAt: run.createdAt,
          sourceType: 'OBSERVED',
        })
      }
    }
  }
  return out
}

export type CitationMetrics = {
  /** Answers naming the domain as a source. */
  citationCount: number
  /** Answers that existed at all — the only fair denominator. */
  opportunities: number
  /** citationCount / opportunities, or null when there is nothing to divide by. */
  citationRate: number | null
  /** Distinct pages of the target domain that were cited. Empty on pre-URL runs. */
  citedPages: Array<{ url: string; title: string; count: number }>
  /** True when no run in range captured URLs, so "no pages" means "not recorded". */
  pagesUnavailable: boolean
}

export function citationMetrics(obs: QueryObservation[], targetHost: string | null): CitationMetrics {
  const answered = obs.filter(o => o.answerPresent)
  const citationCount = answered.filter(o => o.cited).length

  const pages = new Map<string, { url: string; title: string; count: number }>()
  let anyUrlData = false
  for (const o of answered) {
    if (o.citedUrls === null) continue
    anyUrlData = true
    if (!targetHost) continue
    for (const u of o.citedUrls) {
      if (toHost(u.domain) !== targetHost) continue
      const prev = pages.get(u.url)
      pages.set(u.url, { url: u.url, title: u.title, count: (prev?.count ?? 0) + 1 })
    }
  }

  return {
    citationCount,
    opportunities: answered.length,
    citationRate: answered.length ? citationCount / answered.length : null,
    citedPages: [...pages.values()].sort((a, b) => b.count - a.count),
    pagesUnavailable: !anyUrlData,
  }
}

export type AuthorityShare = {
  /** Times the target domain was cited across the answer set. */
  targetCitations: number
  /** Every citation of every domain in the same answer set. The denominator, shown. */
  totalCitations: number
  /** targetCitations / totalCitations, or null when nothing was cited at all. */
  share: number | null
  /** Who else got cited, most first. Not labelled competitors — see the UI. */
  topDomains: Array<{ domain: string; count: number }>
}

/**
 * Share of citations within the measured answer set.
 *
 * Explicitly NOT a ranking and not comparable to a search position: the denominator is the
 * citations Optmizly observed for this brand's own prompt set, so it moves when the prompt
 * set moves. The counts are returned alongside the percentage precisely so a reader can see
 * how small the base is.
 */
export function authorityShare(obs: QueryObservation[], targetHost: string | null): AuthorityShare {
  const counts = new Map<string, number>()
  let total = 0
  for (const o of obs) {
    if (!o.answerPresent) continue
    for (const d of o.citedDomains) {
      const host = toHost(d)
      if (!host) continue
      counts.set(host, (counts.get(host) ?? 0) + 1)
      total++
    }
  }
  const targetCitations = targetHost ? counts.get(targetHost) ?? 0 : 0
  return {
    targetCitations,
    totalCitations: total,
    share: total ? targetCitations / total : null,
    topDomains: [...counts.entries()]
      .filter(([d]) => d !== targetHost)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([domain, count]) => ({ domain, count })),
  }
}

export type CitationGap = {
  query: string
  provider: Provider
  competitorDomain: string
  /** The exact page cited, when the run captured URLs. Null on older runs. */
  competitorUrl: string | null
  competitorTitle: string | null
  targetCited: false
  observedAt: Date
  runId: string
  sourceType: SourceType
}

/**
 * Queries where a domain the user has marked as a competitor was cited and they were not.
 *
 * Gated on the user's own competitor list rather than "every domain that is not ours". An AI
 * answer routinely cites Wikipedia, Reddit and news sites; calling those competitors would
 * be inference printed as observation, and would bury the two rivals that matter under
 * fifteen that do not. An empty competitor list yields no gaps, which is the honest result.
 */
export function citationGaps(
  obs: QueryObservation[],
  targetHost: string | null,
  competitorHosts: string[]
): CitationGap[] {
  const rivals = new Set(competitorHosts.map(toHost).filter((h): h is string => !!h))
  if (!rivals.size) return []

  const gaps: CitationGap[] = []
  for (const o of obs) {
    if (!o.answerPresent) continue
    if (o.cited) continue // not a gap: we were cited here too
    for (const d of o.citedDomains) {
      const host = toHost(d)
      if (!host || !rivals.has(host)) continue
      if (host === targetHost) continue
      const page = o.citedUrls?.find(u => toHost(u.domain) === host) ?? null
      gaps.push({
        query: o.query,
        provider: o.provider,
        competitorDomain: host,
        competitorUrl: page?.url ?? null,
        competitorTitle: page?.title ?? null,
        targetCited: false,
        observedAt: o.observedAt,
        runId: o.runId,
        sourceType: 'OBSERVED',
      })
    }
  }
  return gaps
}

export type TopQuery = {
  query: string
  classification: ClassifiedQuery
  /** Answers that mentioned the brand, over answers that existed. */
  answers: number
  mentions: number
  citations: number
  visibility: number | null
  lastSeen: Date
  sourceType: SourceType
}

/**
 * The queries actually run, ranked by where the brand is weakest but present.
 *
 * Sorted by citations then mentions descending so the list opens on what is working; the
 * gaps section is where the failures live. Queries never run do not appear, because they do
 * not exist — there is no synthetic padding here.
 */
export function topQueries(
  obs: QueryObservation[],
  brand: string,
  aliases: string[]
): TopQuery[] {
  const byQuery = new Map<string, QueryObservation[]>()
  for (const o of obs) {
    const list = byQuery.get(o.query) ?? []
    list.push(o)
    byQuery.set(o.query, list)
  }

  const out: TopQuery[] = []
  for (const [query, list] of byQuery) {
    const answered = list.filter(o => o.answerPresent)
    const mentions = answered.reduce((n, o) => n + o.mentions, 0)
    const citations = answered.filter(o => o.cited).length
    const named = answered.filter(o => o.mentions > 0).length
    out.push({
      query,
      classification: classifyQuery(query, brand, aliases),
      answers: answered.length,
      mentions,
      citations,
      visibility: answered.length ? named / answered.length : null,
      lastSeen: list.reduce((d, o) => (o.observedAt > d ? o.observedAt : d), list[0].observedAt),
      sourceType: 'OBSERVED',
    })
  }
  return out.sort(
    (a, b) => b.citations - a.citations || b.mentions - a.mentions || a.query.localeCompare(b.query)
  )
}

/** Answers that named the brand, over answers that existed. The visibility component. */
export function visibilityRate(obs: QueryObservation[]): { named: number; answers: number; rate: number | null } {
  const answered = obs.filter(o => o.answerPresent)
  const named = answered.filter(o => o.mentions > 0).length
  return { named, answers: answered.length, rate: answered.length ? named / answered.length : null }
}

/**
 * Query coverage: how much of the prompt set produced an AI answer at all.
 *
 * A prompt that triggers no AI answer is a real and reportable result — there is nothing to
 * be visible in — so this measures reach of the answer surface, not our performance within
 * it. Failed lookups are excluded from both halves rather than counted as no-answer, since a
 * DataForSEO error says nothing about Google.
 */
export function queryCoverage(obs: QueryObservation[]): { answered: number; attempted: number; rate: number | null } {
  const attempted = obs.length
  const answered = obs.filter(o => o.answerPresent).length
  return { answered, attempted, rate: attempted ? answered / attempted : null }
}
