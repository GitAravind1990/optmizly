import type { CitationGap, QueryObservation } from './derive'
import { classifyQuery } from './classify'
import type { Confidence, SourceType } from './config'

/**
 * Content opportunities, from evidence only.
 *
 * Every field here is either copied from an observation or counted from one. Nothing is
 * written by a model, and that is the MVP boundary rather than a limitation to apologise
 * for: the instruction says keep recommendations conservative, and an LLM asked to turn
 * "competitor cited, you were not" into advice will confidently produce a content strategy
 * it has no evidence for. The recommendation text below is therefore deliberately a
 * *prompt to the user*, not a plan.
 *
 * Post-MVP extension point: a briefing step could fetch the competitor's cited page and
 * compare it with the customer's nearest page. That needs a fetch budget and a comparison
 * that can fail honestly, so it is not free and is not in scope here.
 */

export type ContentOpportunity = {
  query: string
  queryType: string
  /** Every gap backing this opportunity — the evidence, not a summary of it. */
  evidence: CitationGap[]
  /** Distinct rival domains cited for this query while the target was not. */
  competitors: string[]
  /** The rival pages cited, where the run captured URLs. */
  competitorUrls: Array<{ domain: string; url: string; title: string }>
  /** Times a rival was cited for this query across the period. */
  competitorCitationCount: number
  /** Answers for this query that cited the target. Zero, by definition of a gap. */
  targetCitationCount: number
  recommendation: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: Confidence
  sourceType: SourceType
}

/**
 * Priority from measurable factors only.
 *
 * Frequency first: a rival cited for the same query across several answers is a repeatable
 * result, while a single citation may be one answer's quirk. Query type breaks the tie,
 * because a non-branded or category query is one where the customer can realistically win a
 * citation by publishing something, whereas a branded query losing to a rival is a different
 * and usually harder problem.
 */
function priorityFor(citationCount: number, queryType: string): ContentOpportunity['priority'] {
  const winnable = queryType === 'NON_BRANDED' || queryType === 'CATEGORY' || queryType === 'LOCAL'
  if (citationCount >= 3 && winnable) return 'HIGH'
  if (citationCount >= 3 || winnable) return 'MEDIUM'
  return 'LOW'
}

/** More observations behind a gap means more confidence it is real, not a one-off answer. */
function confidenceFor(observations: number): Confidence {
  if (observations >= 4) return 'HIGH'
  if (observations >= 2) return 'MEDIUM'
  return 'LOW'
}

/**
 * One opportunity per query where rivals were cited and the customer was not.
 *
 * Grouped by query rather than emitted per gap, because three gaps on the same query are one
 * thing to act on, not three. An empty input returns an empty array — there is no floor of
 * "always show at least N suggestions", which is how generic filler gets in.
 */
export function contentOpportunities(
  gaps: CitationGap[],
  observations: QueryObservation[],
  brand: string,
  aliases: string[]
): ContentOpportunity[] {
  if (!gaps.length) return []

  const byQuery = new Map<string, CitationGap[]>()
  for (const g of gaps) {
    const list = byQuery.get(g.query) ?? []
    list.push(g)
    byQuery.set(g.query, list)
  }

  const out: ContentOpportunity[] = []
  for (const [query, queryGaps] of byQuery) {
    const classification = classifyQuery(query, brand, aliases)
    const competitors = [...new Set(queryGaps.map(g => g.competitorDomain))]
    const urls = queryGaps
      .filter(g => g.competitorUrl)
      .map(g => ({ domain: g.competitorDomain, url: g.competitorUrl as string, title: g.competitorTitle ?? g.competitorUrl as string }))

    // Counted from the observations rather than assumed zero: if the customer was cited for
    // this query on some other surface, this is a weaker opportunity and the number should
    // say so rather than the label implying a total absence.
    const targetCitationCount = observations.filter(o => o.query === query && o.answerPresent && o.cited).length

    out.push({
      query,
      queryType: classification.type,
      evidence: queryGaps,
      competitors,
      competitorUrls: urls,
      competitorCitationCount: queryGaps.length,
      targetCitationCount,
      recommendation:
        `AI answers for this query cited ${competitors.join(', ')} and did not cite your domain. ` +
        `Review whether your site covers what this query asks, and whether the page that does is `
        + `substantial enough to be cited.`,
      priority: priorityFor(queryGaps.length, classification.type),
      confidence: confidenceFor(queryGaps.length),
      sourceType: 'OBSERVED',
    })
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  return out.sort(
    (a, b) => rank[a.priority] - rank[b.priority] || b.competitorCitationCount - a.competitorCitationCount
  )
}
