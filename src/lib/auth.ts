import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { PLAN_LIMITS, TRIAL_LIMITS, PLAN_TOOLS, getMonthKey } from './plans'
import { Plan, Prisma } from '@prisma/client'
import { setTrackingUser } from './anthropic'
import { captureServerEvent } from './posthog-server'
import { sendLimitWarningEmail, sendLimitReachedEmail } from './email'

export async function getClerkFirstName(clerkId: string | null, fallback = 'there'): Promise<string> {
  if (!clerkId || !process.env.CLERK_SECRET_KEY) return fallback
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    const data = await res.json()
    return data.first_name || fallback
  } catch {
    return fallback
  }
}

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

export async function getOrCreateUser(clerkId: string) {
  let user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) {
    // New user — create with FREE plan
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }).then(r => r.json())
    const email = clerkUser.email_addresses?.[0]?.email_address ?? ''

    try {
      user = await prisma.user.create({ data: { clerkId, email, plan: Plan.FREE } })
    } catch (e) {
      // A row with this email already exists under a different clerkId — this happens
      // when the same person authenticates through a different Clerk instance (e.g.
      // local dev's separate test instance vs production, both sharing one database).
      // Treat it as the same user rather than crashing; never overwrite the existing
      // row's clerkId, or the real account under the original instance would break.
      const isEmailCollision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
      user = isEmailCollision ? await prisma.user.findUnique({ where: { email } }) : null
      if (!user) throw e
    }
  }
  return user
}

/**
 * Validate auth, check tool access, enforce quota.
 * Call this at the top of every API route that performs a billable analysis.
 */
export async function requireAuth(tool: string): Promise<AuthedUser> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new AuthError(401, 'Not authenticated')
  }

  const user = await getOrCreateUser(clerkId)

  // Check tool access
  if (!PLAN_TOOLS[user.plan]?.includes(tool)) {
    throw new AuthError(403, `This tool requires a higher plan. Your plan: ${user.plan}`)
  }

  // Atomically increment first, then check — prevents concurrent requests bypassing quota
  const month = getMonthKey()
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id }, select: { status: true } })
  const limit = sub?.status === 'TRIALING' ? TRIAL_LIMITS[user.plan] : PLAN_LIMITS[user.plan]

  const updated = await prisma.usage.upsert({
    where: { userId_month: { userId: user.id, month } },
    create: { userId: user.id, month, count: 1 },
    update: { count: { increment: 1 } },
  })

  // Warn when they've just used their second-to-last analysis (fires exactly once per month)
  // Awaited (not fire-and-forget): on Vercel's serverless runtime, an un-awaited
  // promise has no guarantee of completing once the surrounding request finishes —
  // see the identical bug found and fixed in the DoDo webhook (session_jul15).
  if (updated.count === limit - 1 && limit - 1 > 0) {
    const firstName = await getClerkFirstName(clerkId, user.email.split('@')[0])
    await sendLimitWarningEmail(user.email, updated.count, limit, firstName).catch(() => {})
  }

  if (updated.count > limit) {
    // Roll back the increment — we were already at the limit
    await prisma.usage.update({
      where: { userId_month: { userId: user.id, month } },
      data: { count: { decrement: 1 } },
    })
    // Send exactly once per month — atomically flip limitEmailSent false→true.
    // Awaited before the throw below, for the same reason as above: this used
    // to be a fire-and-forget chain immediately followed by a synchronous
    // throw, giving it almost no chance to complete before the response
    // returned and the function could be frozen.
    const { count: flagged } = await prisma.usage.updateMany({
      where: { userId: user.id, month, limitEmailSent: false },
      data: { limitEmailSent: true },
    }).catch(() => ({ count: 0 }))
    if (flagged > 0) {
      const firstName = await getClerkFirstName(clerkId, user.email.split('@')[0])
      await sendLimitReachedEmail(user.email, limit, firstName).catch(() => {})
    }
    await captureServerEvent(clerkId, 'free_limit_hit', {
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
 * Validate auth and check tool access WITHOUT touching the monthly analysis quota.
 * Use this for actions that aren't a billable "analysis" — e.g. connecting/checking/
 * disconnecting a third-party integration.
 */
export async function requireToolAccess(tool: string): Promise<AuthedUser> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new AuthError(401, 'Not authenticated')
  }

  const user = await getOrCreateUser(clerkId)

  if (!PLAN_TOOLS[user.plan]?.includes(tool)) {
    throw new AuthError(403, `This requires a higher plan. Your plan: ${user.plan}`)
  }

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

  const baseUser = await getOrCreateUser(clerkId)
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: baseUser.id },
    include: { usage: { where: { month: getMonthKey() } }, subscription: true },
  })

  const month = getMonthKey()
  const count = user.usage.find(u => u.month === month)?.count ?? 0
  const limit = user.subscription?.status === 'TRIALING' ? TRIAL_LIMITS[user.plan] : PLAN_LIMITS[user.plan]

  return {
    plan: user.plan,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    subscription: user.subscription,
  }
}