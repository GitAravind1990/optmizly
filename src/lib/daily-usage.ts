// Daily, per-tool usage caps.
//
// Separate from requireAuth's monthly quota on purpose. That quota meters billable
// analyses against the plan allowance and drives the limit-warning emails; this meters
// a lead-magnet tool that free users get every day. Mixing the two would either charge
// a free user's monthly allowance for a tool meant to be free, or corrupt the counts the
// billing emails read.

import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

/** UTC day key, matching the 'YYYY-MM' shape Usage uses for months. A string key means
 *  the unique constraint does the resetting — there is no midnight job to run or miss. */
export function getDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Daily generation caps for AI Regex, which is Agency-only. The FREE and PRO entries
 *  are unreachable — PLAN_TOOLS refuses those tiers before a cap is ever consulted — but
 *  the Record needs every key, and leaving them low means a future tier change cannot
 *  silently hand out an uncapped tool. AGENCY is set high enough to be invisible in
 *  normal use while still bounding a runaway script. */
export const AI_REGEX_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 5,
  STARTER: 5,
  PRO: 200,
  AGENCY: 1000,
  AGENCY_PLUS: 1000,
}

export interface DailyUsageState {
  used: number
  limit: number
  remaining: number
  exceeded: boolean
}

/**
 * Increments first, then reports — the same order requireAuth uses, and for the same
 * reason: two concurrent requests that both read before either writes would each see
 * room and both proceed. The upsert is atomic, so the count is authoritative even under
 * concurrency, and a caller that exceeds simply refuses to do the work.
 *
 * Note the consequence: a rejected request still consumed a count. That is the correct
 * trade for a cap whose only job is bounding cost, and it cannot be gamed by racing.
 */
export async function consumeDailyUsage(userId: string, tool: string, limit: number): Promise<DailyUsageState> {
  const day = getDayKey()
  const row = await prisma.dailyToolUsage.upsert({
    where: { userId_tool_day: { userId, tool, day } },
    create: { userId, tool, day, count: 1 },
    update: { count: { increment: 1 } },
  })

  return {
    used: row.count,
    limit,
    remaining: Math.max(0, limit - row.count),
    exceeded: row.count > limit,
  }
}

/**
 * Hands back one consumed daily use.
 *
 * The mirror of the trade documented above: consuming before the work is what makes the
 * cap race-proof, but it also means a run that never happened has already been counted.
 * That is the right default for a failure we caused by spending — the count reflects real
 * cost. It is the wrong answer when we refused to do the work at all, which is what a
 * vendor budget stop is: the user asked, we declined, nothing was spent on their behalf.
 *
 * Floors at zero rather than trusting the caller. A double refund would otherwise hand out
 * allowance that was never consumed, and this runs on the error path where retries are
 * most likely.
 */
export async function refundDailyUsage(userId: string, tool: string): Promise<void> {
  const day = getDayKey()
  await prisma.dailyToolUsage.updateMany({
    where: { userId, tool, day, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  })
}

/** Read-only view of today's usage, for showing "X of 5 left" before the user acts.
 *  Never increments. */
export async function peekDailyUsage(userId: string, tool: string, limit: number): Promise<DailyUsageState> {
  const row = await prisma.dailyToolUsage.findUnique({
    where: { userId_tool_day: { userId, tool, day: getDayKey() } },
    select: { count: true },
  })
  const used = row?.count ?? 0
  return { used, limit, remaining: Math.max(0, limit - used), exceeded: used >= limit }
}
