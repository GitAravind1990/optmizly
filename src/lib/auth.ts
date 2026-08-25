import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { PLAN_LIMITS, TRIAL_LIMITS, PLAN_TOOLS, getMonthKey, toolCost } from './plans'
import { Plan, Prisma } from '@prisma/client'
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

/**
 * Drops a cancelled subscriber to FREE once the period they paid for has actually
 * elapsed — never before it.
 *
 * Cancelling is not the moment access ends. The Terms, the Refund Policy and the
 * cancellation email all promise access until the end of the current billing period,
 * and the webhook used to contradict all three by setting FREE the instant DoDo
 * delivered subscription.cancelled. Someone who cancelled on day 2 of a paid month
 * lost what they had already paid for.
 *
 * Done lazily at read time rather than by a scheduled job: there is no cron to drift
 * or fail, the check runs on the user's next request, and the subscription row is
 * already being loaded here so it costs no extra query. A cancelled user who never
 * returns stays nominally PRO in the database, which is harmless — nothing is granted
 * without a request passing through this function first.
 */
/**
 * Accounts that always hold Agency, whatever the subscription table says.
 *
 * Deliberately a constant and not an env var: an unset variable fails silently and the
 * only symptom would be the founder account quietly dropping to FREE, which is the exact
 * failure this exists to prevent. ADMIN_EMAIL is not reused for the same reason - it is
 * read from the environment and can be missing.
 *
 * Compared lowercased because Clerk preserves whatever case the user typed at sign-up.
 */
const ALWAYS_AGENCY = new Set(['gkm.aravind@gmail.com'])

export function isAlwaysAgency(email?: string | null): boolean {
  return !!email && ALWAYS_AGENCY.has(email.trim().toLowerCase())
}

function hasLapsed(sub: { status: string; currentPeriodEnd: Date | null } | null): boolean {
  if (!sub || sub.status !== 'CANCELLED') return false
  // A cancellation with no period end recorded has nothing left to honour.
  return !sub.currentPeriodEnd || sub.currentPeriodEnd <= new Date()
}

export async function getOrCreateUser(clerkId: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
  })

  if (user && user.plan !== Plan.FREE && hasLapsed(user.subscription)) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.FREE },
      include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
    })
  }

  if (!user) {
    // New user — create with FREE plan
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }).then(r => r.json())
    const email = clerkUser.email_addresses?.[0]?.email_address ?? ''

    const withSub = { subscription: { select: { status: true, currentPeriodEnd: true } } }
    try {
      user = await prisma.user.create({ data: { clerkId, email, plan: Plan.FREE }, include: withSub })
    } catch (e) {
      // A row with this email already exists under a different clerkId — this happens
      // when the same person authenticates through a different Clerk instance (e.g.
      // local dev's separate test instance vs production, both sharing one database).
      // Treat it as the same user rather than crashing; never overwrite the existing
      // row's clerkId, or the real account under the original instance would break.
      const isEmailCollision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
      user = isEmailCollision ? await prisma.user.findUnique({ where: { email }, include: withSub }) : null
      if (!user) throw e
    }
  }

  // Applied last, after the lapse downgrade and after account creation, so there is no
  // path out of this function that returns a pinned account on anything but Agency.
  // Persisted rather than patched in memory, so admin views and exports agree with it.
  if (user && isAlwaysAgency(user.email) && user.plan !== Plan.AGENCY) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.AGENCY },
      include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
    })
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

  // Tools cost different amounts of the allowance — see TOOL_COST_UNITS for why.
  const cost = toolCost(tool)

  const updated = await prisma.usage.upsert({
    where: { userId_month: { userId: user.id, month } },
    create: { userId: user.id, month, count: cost },
    update: { count: { increment: cost } },
  })
  const before = updated.count - cost

  // Warn when they cross into their last analysis. Written as a threshold crossing
  // rather than an equality: a 3-unit tool can jump 47 -> 50 without ever landing on
  // 49, and the old `count === limit - 1` check would silently never fire for those
  // users. Comparing before/after fires exactly once per month either way.
  // Awaited (not fire-and-forget): on Vercel's serverless runtime, an un-awaited
  // promise has no guarantee of completing once the surrounding request finishes —
  // see the identical bug found and fixed in the DoDo webhook (session_jul15).
  if (limit - 1 > 0 && before < limit - 1 && updated.count >= limit - 1 && updated.count <= limit) {
    const firstName = await getClerkFirstName(clerkId, user.email.split('@')[0])
    await sendLimitWarningEmail(user.email, updated.count, limit, firstName, user.plan).catch(() => {})
  }

  if (updated.count > limit) {
    // Roll back by what was actually taken, not by 1 — otherwise a rejected 3-unit run
    // would permanently consume 2 units of a user's allowance for work never done.
    await prisma.usage.update({
      where: { userId_month: { userId: user.id, month } },
      data: { count: { decrement: cost } },
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
      await sendLimitReachedEmail(user.email, limit, firstName, user.plan).catch(() => {})
    }
    await captureServerEvent(clerkId, 'free_limit_hit', {
      tool,
      plan: user.plan,
      limit,
    }).catch(() => {})
    const remaining = Math.max(0, limit - before)
    throw new AuthError(
      429,
      cost > 1 && remaining > 0
        ? `This tool uses ${cost} of your monthly allowance and you have ${remaining} left of ${limit}. Upgrade to continue.`
        : `Monthly limit of ${limit} analyses reached. Upgrade to continue.`
    )
  }

  // No setTrackingUser() here. It used to be, and it silently did nothing: enterWith()
  // sets the AsyncLocalStorage store for this frame and its descendants, and the route
  // that awaits this function is neither. Token attribution is resolved inside callLLM
  // instead — see resolveTrackingUser() in llm.ts for the full account.

  return {
    userId: user.id,
    clerkId,
    email: user.email,
    plan: user.plan,
  }
}

/**
 * Give back the units requireAuth() took, for a run that provably did no work.
 *
 * requireAuth charges up front — deliberately, so concurrent requests cannot race past the
 * quota — which means a run that dies before reaching the vendor still costs the user an
 * analysis. Use this only where nothing was sent and no third party was billed, such as a
 * request refused locally for want of Groq per-minute capacity. A run that failed *after*
 * spending vendor calls is not eligible: the money is gone and the charge is honest.
 *
 * Never throws. A failed refund must not turn a recoverable error into a 500 on top of it.
 */
export async function refundUsage(userId: string, tool: string): Promise<void> {
  try {
    await prisma.usage.update({
      where: { userId_month: { userId, month: getMonthKey() } },
      data: { count: { decrement: toolCost(tool) } },
    })
  } catch {
    // Nothing to do — the user keeps the charge rather than the request keeping the error.
  }
}

/**
 * Throw 429 if `tool` would not fit in what is left of the month, WITHOUT spending it.
 *
 * For a run split across several requests, the charge belongs on the request that produces
 * the result — otherwise a run abandoned halfway has taken a unit for nothing. But that
 * puts the quota check at the *end*, which would let someone who is already out do all the
 * work and be refused afterwards. This is the up-front half: advisory only, no increment.
 *
 * Deliberately not authoritative. Two runs started at once can both pass this and only one
 * of them fit; that is fine, because `requireAuth` on the finalising request still does the
 * atomic increment-then-check. This exists to avoid wasted work, not to enforce anything.
 */
export async function assertQuotaAvailable(user: AuthedUser, tool: string): Promise<void> {
  const month = getMonthKey()
  const [usage, sub] = await Promise.all([
    prisma.usage.findUnique({
      where: { userId_month: { userId: user.userId, month } },
      select: { count: true },
    }),
    prisma.subscription.findUnique({ where: { userId: user.userId }, select: { status: true } }),
  ])

  const limit = sub?.status === 'TRIALING' ? TRIAL_LIMITS[user.plan] : PLAN_LIMITS[user.plan]
  const cost = toolCost(tool)
  const used = usage?.count ?? 0

  if (used + cost > limit) {
    const remaining = Math.max(0, limit - used)
    throw new AuthError(
      429,
      cost > 1 && remaining > 0
        ? `This tool uses ${cost} of your monthly allowance and you have ${remaining} left of ${limit}. Upgrade to continue.`
        : `Monthly limit of ${limit} analyses reached. Upgrade to continue.`
    )
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