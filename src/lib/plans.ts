import { Plan } from '@prisma/client'

export const PLAN_LIMITS: Record<Plan, number> = {
  FREE: 3,
  PRO: 50,
  AGENCY: 200,
}

// Lower usage cap while a subscription is TRIALING, so a trial-and-cancel
// can't run up the full paid-tier monthly quota's worth of AI/SEO-API cost
// for free. Reverts to PLAN_LIMITS the moment the trial converts to paid.
export const TRIAL_LIMITS: Record<Plan, number> = {
  FREE: 3,
  PRO: 10,
  AGENCY: 15,
}

export const PLAN_TOOLS: Record<Plan, string[]> = {
  FREE: ['analyse', 'onpage'],
  PRO: ['analyse', 'onpage', 'eeat', 'citation', 'gap', 'rewrite', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'ranking-engine', 'backlinks', 'keyword-tool'],
  AGENCY: ['analyse', 'onpage', 'client-finder', 'eeat', 'citation', 'gap', 'rewrite', 'serp', 'topical', 'local', 'tracker', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'local-seo', 'seo-audit', 'geogrid', 'review-velocity', 'ranking-engine', 'backlinks', 'performance-fixer', 'search-console', 'client-reports', 'keyword-tool', 'ai-regex'],
}

export function canUseTool(plan: Plan, tool: string): boolean {
  return PLAN_TOOLS[plan]?.includes(tool) ?? false
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

// One trial per account, ever -- gated in the checkout route by whether a
// Subscription row already exists for the user (never deleted except via
// cascade-on-account-deletion, so this can't be gamed by re-triggering it).
export const TRIAL_PERIOD_DAYS = 7
export const TRIAL_REMINDER_DAYS_BEFORE = 3
