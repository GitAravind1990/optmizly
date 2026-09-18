import type { SourceType } from './config'

/**
 * Query classification, by rule rather than by model.
 *
 * Deterministic on purpose, and not only to save Groq tokens. A classifier that returns a
 * different answer for the same query on two runs makes a *trend* meaningless: "non-branded
 * visibility fell" would be indistinguishable from "the model changed its mind". Rules are
 * reproducible, instant, free, and testable, which is what a metric feeding a score needs.
 *
 * Deliberately conservative. Where a rule cannot decide, the answer is NON_BRANDED rather
 * than a guess — that is the larger and less flattering bucket, so an error here understates
 * branded performance rather than inventing it.
 */
export type QueryType =
  | 'BRANDED'
  | 'NON_BRANDED'
  | 'CATEGORY'
  | 'LOCAL'
  | 'COMPARISON'

export type ClassifiedQuery = {
  query: string
  type: QueryType
  /** Always INFERRED: this is Optmizly's reading of the text, not something observed. */
  sourceType: SourceType
  /** Which rule fired, so the UI can explain a surprising classification. */
  reason: string
}

/** Words that make a query a comparison regardless of anything else. */
const COMPARISON = /\b(vs\.?|versus|compared? to|comparison|alternatives? to|alternative)\b/i

/**
 * Words that mark a query as shopping for a category rather than naming one supplier.
 *
 * "best", "top" and "cheapest" are the superlatives; the rest are the shapes a category
 * search takes when someone has not decided who to buy from yet.
 */
const CATEGORY = /\b(best|top|cheapest|affordable|leading|recommended|which|list of|types? of|examples? of)\b/i

/**
 * Locality markers that do not depend on knowing place names.
 *
 * A gazetteer is the obvious approach and the wrong one here: it would need maintaining, it
 * would miss everywhere it had not heard of, and it would silently mark any query containing
 * a word that happens to be a place. These patterns catch the *grammar* of a local search
 * instead, which generalises to any country without a list.
 */
const LOCAL = /\b(near me|nearby|in my area|local|close to me|around me)\b/i
const LOCAL_PREPOSITION = /\b(in|near|around|within)\s+[A-Z][\w'-]+/

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Does the query name the brand?
 *
 * Reuses the matching rules the mention counter already uses — word boundaries, and an
 * optional space or hyphen between the parts of a multi-word name — so "AgencyAnalytics",
 * "Agency Analytics" and "agency-analytics" all count as the brand. Without that a two-word
 * brand scores zero on exactly the queries most likely to name it, and every branded query
 * would land in the non-branded bucket.
 */
export function mentionsBrand(query: string, brand: string, aliases: string[] = []): boolean {
  const names = [brand, ...aliases].map(n => n.trim()).filter(Boolean)
  for (const name of names) {
    const parts = name.split(/[\s-]+/).filter(Boolean).map(escapeRe)
    if (!parts.length) continue
    if (new RegExp(`\\b${parts.join('[\\s-]?')}\\b`, 'i').test(query)) return true
  }
  return false
}

/**
 * Classify one query.
 *
 * Order matters and encodes precedence. Branded wins outright: "Optmizly vs Ahrefs" is a
 * query about the brand, and counting it as a comparison would remove the brand's own name
 * from branded coverage. After that the more specific shapes beat the general ones.
 */
export function classifyQuery(query: string, brand: string, aliases: string[] = []): ClassifiedQuery {
  const q = query.trim()
  const base = { query: q, sourceType: 'INFERRED' as const }

  if (mentionsBrand(q, brand, aliases)) {
    return { ...base, type: 'BRANDED', reason: 'Names the brand' }
  }
  if (COMPARISON.test(q)) {
    return { ...base, type: 'COMPARISON', reason: 'Comparison wording' }
  }
  if (LOCAL.test(q) || LOCAL_PREPOSITION.test(q)) {
    return { ...base, type: 'LOCAL', reason: 'Location wording' }
  }
  if (CATEGORY.test(q)) {
    return { ...base, type: 'CATEGORY', reason: 'Category or superlative wording' }
  }
  return { ...base, type: 'NON_BRANDED', reason: 'No brand, comparison, location or category signal' }
}

/** Counts per type, with every type present so a chart cannot omit an empty bucket. */
export function tallyTypes(classified: ClassifiedQuery[]): Record<QueryType, number> {
  const out: Record<QueryType, number> = {
    BRANDED: 0, NON_BRANDED: 0, CATEGORY: 0, LOCAL: 0, COMPARISON: 0,
  }
  for (const c of classified) out[c.type]++
  return out
}
