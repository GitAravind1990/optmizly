import { getAiOverviewAnswer, getAiModeAnswer, type AiAnswer } from '@/lib/dataforseo'
import { prisma } from '@/lib/prisma'

/**
 * Per-customer AI visibility: does a brand get named in the AI answers for the queries its own
 * site already appears for, and who gets named instead.
 *
 * Deliberately not an index. Ahrefs answers for any brand instantly from a pre-run corpus of
 * ~460M prompts; reproducing the AI Overviews half alone would cost over $1M a month. This
 * answers the same question for one customer on demand, from their own Search Console queries,
 * at roughly $0.0075 per prompt across both Google surfaces.
 *
 * Scope is Google's AI Overviews and AI Mode. In the reference data those carried ~89% of raw
 * brand mentions, and AI Mode had by far the highest mention rate per prompt. The chat
 * assistants cost 3-5x more per prompt for a small fraction of the mentions, so they are a
 * later phase rather than part of this one.
 */

/** How a brand can appear. Being cited is stronger than being named. */
export type PromptOutcome = {
  prompt: string
  /** Null when the lookup itself failed — distinct from an AI answer that exists without you. */
  aiOverview: SurfaceOutcome | null
  aiMode: SurfaceOutcome | null
}

export type SurfaceOutcome = {
  /** False when the engine returned no AI answer for this prompt at all. */
  answerPresent: boolean
  /** Times the brand is named in the answer's prose. Link targets are excluded. */
  mentions: number
  /** True when the brand's own domain is among the answer's cited sources. */
  cited: boolean
  /** Domains the answer cited, so "who got picked instead" is answerable. */
  citedDomains: string[]
}

/**
 * Strips markdown link targets before counting.
 *
 * The measured AI Overview text is markdown and embeds its sources inline as
 * `[](https://onelittleweb.com/...)`. A brand whose name appears in a cited URL would otherwise
 * be counted as having been named in the answer, which is a different and much weaker claim —
 * `semrush.com` appearing as a source is a citation, not a mention. Citations are reported
 * separately, from the references array, where they can be counted exactly.
 */
function proseOnly(markdown: string): string {
  return markdown
    .replace(/\]\([^)]*\)/g, ']')       // link targets, keeping any anchor text
    .replace(/https?:\/\/\S+/g, ' ')    // bare URLs
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Counts how often a brand is named, tolerating the ways a name really appears.
 *
 * Matching is word-boundary and case-insensitive, and accepts an optional space or hyphen
 * between words so "AgencyAnalytics", "Agency Analytics" and "agency-analytics" all count as
 * the same brand. Without that, a two-word brand scores zero on the exact text most likely to
 * name it.
 */
export function countBrandMentions(text: string, brand: string, aliases: string[] = []): number {
  const prose = proseOnly(text)
  const names = [brand, ...aliases].map(n => n.trim()).filter(Boolean)
  let total = 0
  for (const name of names) {
    // Collapse the brand to its word parts, then allow optional separators between them.
    const parts = name.split(/[\s-]+/).filter(Boolean).map(escapeRe)
    if (!parts.length) continue
    const pattern = new RegExp(`\\b${parts.join('[\\s-]?')}\\b`, 'gi')
    total += (prose.match(pattern) ?? []).length
  }
  return total
}

function summarise(answer: AiAnswer | null, brand: string, domain: string | null, aliases: string[]): SurfaceOutcome | null {
  if (answer === null) return null
  if (!answer.present) {
    return { answerPresent: false, mentions: 0, cited: false, citedDomains: [] }
  }
  const host = domain ? domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase() : null
  return {
    answerPresent: true,
    mentions: countBrandMentions(answer.text, brand, aliases),
    cited: host ? answer.citedDomains.includes(host) : false,
    citedDomains: answer.citedDomains,
  }
}

/**
 * One prompt across both surfaces.
 *
 * The two calls run concurrently: they are independent paid lookups against different
 * endpoints, and serialising them would double the wall time of a batch for nothing.
 */
export async function runPrompt(
  prompt: string,
  brand: string,
  domain: string | null,
  aliases: string[] = [],
  location = 'US'
): Promise<PromptOutcome> {
  const [overview, mode] = await Promise.all([
    getAiOverviewAnswer(prompt, location).catch(() => null),
    getAiModeAnswer(prompt, location).catch(() => null),
  ])
  return {
    prompt,
    aiOverview: summarise(overview, brand, domain, aliases),
    aiMode: summarise(mode, brand, domain, aliases),
  }
}

/**
 * The prompt shortlist, from the customer's own Search Console queries.
 *
 * Ranked by impressions rather than clicks on purpose: a query with impressions and no clicks
 * is exactly where an AI answer may be absorbing the traffic, which is the case this tool
 * exists to detect. Clicks would rank the queries already working.
 *
 * Returns [] when there is no corpus, which the caller turns into the keyword-based fallback
 * rather than an error — a customer without GSC connected should still get a report.
 */
export async function promptsFromSearchConsole(userId: string, limit = 25): Promise<string[]> {
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000)
  const rows = await prisma.gscQueryRow.groupBy({
    by: ['query'],
    where: { userId, date: { gte: since } },
    _sum: { impressions: true },
    orderBy: { _sum: { impressions: 'desc' } },
    take: limit,
  })
  return rows
    .map(r => r.query.trim())
    .filter(q => q.length > 2 && q.length <= 200)
}

/** Totals for a finished run, computed once so the UI and the export cannot disagree. */
export function summariseRun(outcomes: PromptOutcome[]) {
  const surfaces = ['aiOverview', 'aiMode'] as const
  const totals = {
    aiOverview: { mentions: 0, cited: 0, answers: 0, failed: 0 },
    aiMode: { mentions: 0, cited: 0, answers: 0, failed: 0 },
  }
  const competitorHits = new Map<string, number>()

  for (const o of outcomes) {
    for (const s of surfaces) {
      const r = o[s]
      if (r === null) { totals[s].failed++; continue }
      if (!r.answerPresent) continue
      totals[s].answers++
      totals[s].mentions += r.mentions
      if (r.cited) totals[s].cited++
      for (const d of r.citedDomains) competitorHits.set(d, (competitorHits.get(d) ?? 0) + 1)
    }
  }

  return {
    totals,
    promptsRun: outcomes.length,
    totalMentions: totals.aiOverview.mentions + totals.aiMode.mentions,
    totalCitations: totals.aiOverview.cited + totals.aiMode.cited,
    /** Who the engines cite for these prompts, most often first. The actionable half. */
    topCitedDomains: [...competitorHits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([domain, count]) => ({ domain, count })),
  }
}
