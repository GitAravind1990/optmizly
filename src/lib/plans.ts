import { Plan } from '@prisma/client'

export const PLAN_LIMITS: Record<Plan, number> = {
  FREE: 3,
  STARTER: 15,
  PRO: 50,
  AGENCY: 200,
  AGENCY_PLUS: 500,
}

// Optmizly no longer offers a free trial, so nothing creates a TRIALING
// subscription today. This cap is kept as a backstop: if one ever arrives from
// Dodo's side, it must not carry the full paid-tier monthly quota.
export const TRIAL_LIMITS: Record<Plan, number> = {
  FREE: 3,
  // Deliberately equal to the paid STARTER allowance rather than lower. The backstop
  // exists to stop a stray TRIALING subscription handing out a *large* quota; 15 is
  // already the smallest paid tier, so there is nothing to claw back.
  STARTER: 15,
  PRO: 10,
  AGENCY: 15,
  AGENCY_PLUS: 15,
}

export const PLAN_TOOLS: Record<Plan, string[]> = {
  FREE: ['analyse', 'onpage'],
  // STARTER buys volume, not access: the same two tools as FREE with 15 runs a month
  // instead of 3. Keeping the tool list identical is what stops this plan touching the
  // tool-count copy in /login, /signup, PRO_BENEFITS, the upgrade modal and the welcome
  // banner — none of those numbers change, because no tier's tool count changed.
  // Give it more tools and every one of those places needs updating in the same commit.
  STARTER: ['analyse', 'onpage'],
  PRO: ['analyse', 'onpage', 'eeat', 'citation', 'gap', 'rewrite', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'ranking-engine', 'backlinks', 'keyword-tool'],
  AGENCY: ['analyse', 'onpage', 'client-finder', 'eeat', 'citation', 'gap', 'rewrite', 'serp', 'topical', 'local', 'tracker', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'local-seo', 'seo-audit', 'geogrid', 'review-velocity', 'ranking-engine', 'backlinks', 'performance-fixer', 'search-console', 'client-reports', 'keyword-tool', 'ai-regex'],
  // Filled from AGENCY below rather than retyped. Agency already sees every tool, so this
  // tier cannot add one — it sells volume, unlimited clients and seats. Deriving it means a
  // tool added to Agency reaches Agency Plus automatically, which is the only version of
  // this that stays correct without anyone remembering to.
  AGENCY_PLUS: [],
}

// Assigned after the literal, because a Record cannot reference its own key while being
// built. Kept adjacent so the relationship is impossible to miss.
PLAN_TOOLS.AGENCY_PLUS = [...PLAN_TOOLS.AGENCY]

export function canUseTool(plan: Plan, tool: string): boolean {
  return PLAN_TOOLS[plan]?.includes(tool) ?? false
}

/**
 * How many client records each plan may hold.
 *
 * Zero for every tier below Agency because client management is Agency-gated at the route,
 * so those numbers are unreachable — a 0 says "not entitled" more clearly than a leftover
 * allowance that looks live, the same convention CLIENT_FINDER_DAILY_LIMITS uses.
 *
 * **This limit is not a cost control.** A client is a database row and costs nothing to
 * keep; all the real spend sits in analyses and prospect searches, which are metered
 * separately and stay metered regardless of client count. That is what makes "unlimited
 * clients" a headline a higher tier can honour honestly and indefinitely, and it is why
 * this cap is a product boundary rather than a ceiling that has to hold under race.
 *
 * A future unlimited tier sets `Number.POSITIVE_INFINITY` here. Note that
 * `JSON.stringify(Infinity)` is `null`, so any route returning this value must convert it
 * deliberately — see `serializeClientLimit`. Writing that now means the unlimited tier
 * cannot ship a silent `null` into the UI later.
 */
export const CLIENT_LIMITS: Record<Plan, number> = {
  FREE: 0,
  STARTER: 0,
  PRO: 0,
  AGENCY: 10,
  // The unlimited tier this was written for. Honourable indefinitely because a client is a
  // database row: the cost lives in analyses and searches, which stay metered above.
  AGENCY_PLUS: Number.POSITIVE_INFINITY,
}

/** `null` means unlimited, because Infinity is not representable in JSON. */
export function serializeClientLimit(limit: number): number | null {
  return Number.isFinite(limit) ? limit : null
}

/**
 * How many people may work inside one account, **including the owner**.
 *
 * Counting the owner is the honest reading of "2 seats" and the one a buyer assumes; a
 * limit that quietly meant "2 people plus you" would be a pleasant surprise exactly once
 * and a support question every time after.
 *
 * 1 everywhere below Agency, which makes those tiers single-user without needing a separate
 * "teams enabled" flag — the seat check and the plan check are the same check.
 *
 * Seats are the feature a bigger number cannot fake, which is why they are worth building
 * before a higher tier is sold on them: more than one person logging in is a real constraint
 * for an agency today, and no amount of extra analyses solves it.
 */
export const SEAT_LIMITS: Record<Plan, number> = {
  FREE: 1,
  STARTER: 1,
  PRO: 1,
  AGENCY: 2,
  AGENCY_PLUS: 5,
}

/**
 * How much of the monthly allowance a single run of each tool consumes.
 *
 * Every tool used to cost exactly 1, which meant a content analysis costing nothing and
 * a keyword research costing ~$0.20 in DataForSEO calls drew down the same allowance.
 * Measured against a real invoice (14.07–05.08.2026, $14.00 over ~140 analyses), that
 * left Agency exposed: 200 keyword researches is roughly $40 of cost against $49 of
 * revenue, an 18% gross margin before hosting. Weighting the meter caps that at ~$13
 * without touching headline pricing.
 *
 * The tiers reflect measured cost per run, not effort or perceived value:
 *   3 — heavy DataForSEO: keyword discovery + metrics + intent, bulk backlink lookups,
 *       or a grid of local SERPs. ~$0.15–0.30 a run.
 *   2 — a handful of real API calls. ~$0.05–0.10 a run.
 *   1 — LLM-only, or one or two SERP calls at $0.002 each. Effectively free, since
 *       production runs Groq (see src/lib/llm-pricing.ts).
 *
 * Free-plan tools are all weight 1 on purpose: "3 analyses" must keep meaning three
 * runs, or the plan's public promise changes.
 */
export const TOOL_COST_UNITS: Record<string, number> = {
  'keyword-tool': 3,
  'competitor-spy': 3,
  'geogrid': 3,
  'local-seo': 3,
  'ranking-engine': 3,
  'backlinks': 2,
  'rank-tracker': 2,
  'serp': 2,
  'review-velocity': 2,
  'client-reports': 2,

  // These four were missing, and the reason is worth recording: they read as LLM-only
  // at the call site. Their DataForSEO usage arrives indirectly — Citation, Gap and
  // Queries each call fetchKeywordGrounding(), which fires getTopSerpResults,
  // getRelatedKeywords and getSearchIntent in parallel; Content Planner calls
  // getKeywordMetrics on every generated idea. The cost model written in August still
  // lists all of them as "LLM-only, ~$0.00", which was already stale: the grounding
  // landed in July.
  //
  // 2 rather than 3 because it is one SERP call plus two Labs calls — more than SERP
  // Audit (weight 2, one SERP call), well short of Ranking Engine (weight 3, five calls
  // plus a crawl). The competitor crawl Citation adds runs on our own crawler, so it
  // costs time rather than vendor spend.
  //
  // Known imprecision, stated rather than hidden: grounding only runs when the user
  // supplies a keyword, so a run without one now over-charges by 1. Pricing the
  // possibility is the safe direction to be wrong, and charging by actual API use would
  // mean metering after the fact instead of before.
  'citation': 2,
  'gap': 2,
  'content-ideas': 2,
  // Same tool as 'content-ideas', under the id the sidebar knows it by. requireAuth
  // charges against 'content-ideas' while the nav badge reads 'ideas' from TOOL_GROUPS,
  // so listing only one of them would either bill without showing the cost or show a
  // cost it never bills. Keep the two in step.
  'ideas': 2,
}

/** Units consumed by one run. Anything unlisted costs 1, so a new tool is cheap by
 *  default and has to be deliberately marked expensive — the safe direction to fail. */
export function toolCost(tool: string): number {
  return TOOL_COST_UNITS[tool] ?? 1
}

export function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

