import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { PLAN_LIMITS, PLAN_TOOLS, getMonthKey } from './plans'
import { Plan } from '@prisma/client'
import { setTrackingUser } from './anthropic'
import { captureServerEvent } from './posthog-server'
import { sendLimitWarningEmail } from './email'

export type AuthedUser = {
  userId: string
  clerkId: string
  email: string
  plan: Plan
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/**
 * Validate auth, check tool access, enforce quota.
 * Call this at the top of every API route.
 */
export async function requireAuth(tool: string): Promise<AuthedUser> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new AuthError(401, 'Not authenticated')
  }

  // Get or create user in DB
  let user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) {
    // New user — create with FREE plan
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }).then(r => r.json())

    user = await prisma.user.create({
      data: {
        clerkId,
        email: clerkUser.email_addresses?.[0]?.email_address ?? '',
        plan: Plan.FREE,
      },
    })
  }

  // Check tool access
  if (!PLAN_TOOLS[user.plan]?.includes(tool)) {
    throw new AuthError(403, `This tool requires a higher plan. Your plan: ${user.plan}`)
  }

  // Atomically increment first, then check — prevents concurrent requests bypassing quota
  const month = getMonthKey()
  const limit = PLAN_LIMITS[user.plan]

  const updated = await prisma.usage.upsert({
    where: { userId_month: { userId: user.id, month } },
    create: { userId: user.id, month, count: 1 },
    update: { count: { increment: 1 } },
  })

  // Warn when they've just used their second-to-last analysis (fires exactly once per month)
  if (updated.count === limit - 1 && limit - 1 > 0) {
    sendLimitWarningEmail(user.email, updated.count, limit).catch(() => {})
  }

  if (updated.count > limit) {
    // Roll back the increment — we were already at the limit
    await prisma.usage.update({
      where: { userId_month: { userId: user.id, month } },
      data: { count: { decrement: 1 } },
    })
    captureServerEvent(clerkId, 'free_limit_hit', {
      tool,
      plan: user.plan,
      limit,
    }).catch(() => {})
    throw new AuthError(429, `Monthly limit of ${limit} analyses reached. Upgrade to continue.`)
  }

  setTrackingUser(user.id)

  return {
    userId: user.id,
    clerkId,
    email: user.email,
    plan: user.plan,
  }
}

/**
 * Get current user's usage stats (for dashboard)
 */
export async function getUserUsage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')

  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      usage: {
        where: { month: getMonthKey() },
      },
      subscription: true,
    },
  })

  if (!user) {
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }).then(r => r.json())

    user = await prisma.user.create({
      data: {
        clerkId,
        email: clerkUser.email_addresses?.[0]?.email_address ?? '',
        plan: Plan.FREE,
      },
      include: { usage: { where: { month: getMonthKey() } }, subscription: true },
    })
  }

  const month = getMonthKey()
  const count = user.usage.find(u => u.month === month)?.count ?? 0
  const limit = PLAN_LIMITS[user.plan]

  return {
    plan: user.plan,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    subscription: user.subscription,
  }
}