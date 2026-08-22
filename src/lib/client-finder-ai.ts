/**
 * One batched model call per search, turning deterministic findings into a sales angle.
 *
 * Three constraints shape this file, and all three are load-bearing:
 *
 * 1. **The model never sees page HTML.** Only the structured findings computed in
 *    homepage-seo-check.ts travel here. A prospect's website is content we fetched from a
 *    stranger; if its text reached a prompt, any business could put instructions on their
 *    homepage and have them followed. Findings are ours - fixed titles, fixed severities -
 *    so there is nothing for a site to inject through.
 *
 * 2. **One call for the whole search, not one per business.** Ten calls would be ten times
 *    the cost and, on the current provider's per-minute token bucket, would starve each
 *    other exactly as Content Optimizer's seven parallel sections used to.
 *
 * 3. **The model never computes the score.** It receives the score and writes prose about
 *    it. scoreOpportunity() is the only thing that decides a number.
 *
 * If any of it fails, the caller shows deterministic findings alone. The tool is designed to
 * be useful with the AI switched off.
 */
import { callLLM, extractJSON } from './llm'
import type { SEOFinding } from './homepage-seo-check'

/** Cap on how many prospects go to the model. Sending all ten costs tokens for prospects an
 *  agency will not call today, and the per-minute bucket is shared with every other tool. */
const MAX_SUMMARIZED = 5

/** Findings per prospect in the prompt. The top three are what the pitch is built on. */
const FINDINGS_PER_PROSPECT = 3

export interface ProspectForSummary {
  id: string
  name: string
  opportunityScore: number
  findings: SEOFinding[]
}

export interface ProspectSummary {
  salesAngle: string
  topThreeIssues: string[]
}

const SYSTEM = `You write short, factual prospecting notes for an SEO agency.

For each business you are given: a name, an SEO Opportunity Score (0-100, higher means more
fixable problems), and a list of problems already found on their homepage by a deterministic
checker.

For each business return:
- salesAngle: one or two sentences an agency could open a conversation with, naming the most
  commercially relevant problem and why it costs the business something. Concrete and calm.
  No hype, no invented statistics, no promises about rankings or traffic numbers.
- topThreeIssues: the three most important problems, each as a short phrase.

Rules:
- Use ONLY the problems given. Never invent a problem, a metric, or a competitor.
- Never promise a ranking position or a traffic increase.
- The score measures sales opportunity, not search ranking. Do not describe it as a ranking.
- Return ONLY valid JSON matching: {"summaries":[{"id":"...","salesAngle":"...","topThreeIssues":["...","...","..."]}]}`

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

/**
 * Returns a map of prospect id to summary. Missing entries are normal and expected - the
 * caller falls back to deterministic findings for anything absent, so a partial or malformed
 * response degrades one card rather than the search.
 */
export async function summarizeProspects(
  prospects: ProspectForSummary[],
): Promise<Map<string, ProspectSummary>> {
  const out = new Map<string, ProspectSummary>()
  const batch = prospects.slice(0, MAX_SUMMARIZED)
  if (batch.length === 0) return out

  // Only these fields cross into the prompt. Note what is absent: no URL, no page text, no
  // meta content, nothing the site itself authored.
  const payload = batch.map(p => ({
    id: p.id,
    name: p.name,
    opportunityScore: p.opportunityScore,
    problems: p.findings.slice(0, FINDINGS_PER_PROSPECT).map(f => ({
      severity: f.severity,
      issue: f.title,
      detail: f.description,
    })),
  }))

  let raw: string
  try {
    raw = await callLLM(SYSTEM, `Businesses:\n${JSON.stringify(payload, null, 2)}`, 1_200)
  } catch (e) {
    console.warn('[client-finder-ai] model call failed, falling back to findings only:',
      e instanceof Error ? e.message : e)
    return out
  }

  let parsed: unknown
  try {
    parsed = extractJSON(raw)
  } catch {
    console.warn('[client-finder-ai] response was not parseable JSON, falling back to findings only')
    return out
  }

  const summaries = (parsed as { summaries?: unknown })?.summaries
  if (!Array.isArray(summaries)) {
    console.warn('[client-finder-ai] response had no summaries array, falling back to findings only')
    return out
  }

  const known = new Set(batch.map(p => p.id))
  for (const entry of summaries) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>

    // Every field validated before it can reach a page. An id the model invented is
    // dropped rather than displayed against the wrong business.
    if (typeof e.id !== 'string' || !known.has(e.id)) continue
    if (typeof e.salesAngle !== 'string' || !e.salesAngle.trim()) continue
    if (!isStringArray(e.topThreeIssues)) continue

    out.set(e.id, {
      salesAngle: e.salesAngle.trim().slice(0, 400),
      topThreeIssues: e.topThreeIssues.filter(s => s.trim()).slice(0, 3).map(s => s.trim().slice(0, 120)),
    })
  }

  return out
}
