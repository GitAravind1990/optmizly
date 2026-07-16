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
  PRO: ['analyse', 'onpage', 'eeat', 'citation', 'gap', 'queries', 'rewrite', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'ranking-engine', 'backlinks'],
  AGENCY: ['analyse', 'onpage', 'eeat', 'citation', 'gap', 'queries', 'rewrite', 'serp', 'topical', 'local', 'tracker', 'content-ideas', 'content-optimizer', 'competitor-spy', 'rank-tracker', 'local-seo', 'seo-audit', 'geogrid', 'review-velocity', 'ranking-engine', 'backlinks', 'performance-fixer', 'search-console'],
}

export function canUseTool(plan: Plan, tool: string): boolean {
  return PLAN_TOOLS[plan]?.includes(tool) ?? false
}

export function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

// One trial per account, ever -- gated in the checkout route by whether a
// Subscription row already exists for the user (never deleted except via
// cascade-on-account-deletion, so this can't be gamed by re-triggering it).
export const TRIAL_PERIOD_DAYS = 7
export const TRIAL_REMINDER_DAYS_BEFORE = 3
