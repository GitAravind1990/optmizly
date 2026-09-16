import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { normaliseGrantEmail, pinnedAccountFor, pinnedAccounts } from '@/lib/auth'
import { ALL_PLANS, PLAN_LIMITS } from '@/lib/plans'
import { Plan } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * Granted plans: read, create and revoke.
 *
 * A grant hands someone a paid tier for nothing, so this is the one admin endpoint that
 * changes what an account may spend. Three rules it enforces, none of them optional:
 *
 *  - **It will not touch an address pinned in the constant.** `PINNED_ACCOUNTS` is the
 *    backstop that keeps the founder account on Agency whatever else breaks; letting a row
 *    in this table shadow it, or letting a DELETE here appear to revoke it, would turn the
 *    backstop into something a click can defeat.
 *  - **The plan must be a real plan and the limit a sane number.** Both arrive from a form.
 *    A bad plan string reaches Prisma as an invalid enum; a negative or absurd limit is a
 *    quota bug that only shows up as a user unable to run anything.
 *  - **Revoking deletes the row and lets getOrCreateUser undo it.** The downgrade is not
 *    done here, because doing it in two places is how the two disagree.
 */

/** Grants, newest first, each with the effective allowance spelled out. */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const grants = await prisma.pinnedGrant.findMany({ orderBy: { createdAt: 'desc' } })

  // Whether the grantee has actually signed in yet. A grant applies on first sign-in, so a
  // row with no user behind it is normal for a day and worth distinguishing from one that
  // took effect -- otherwise "I sent the invite and nothing happened" has no answer here.
  const users = await prisma.user.findMany({
    where: { email: { in: grants.map(g => g.email) } },
    select: { email: true, plan: true, monthlyLimit: true, grantedAt: true },
  })
  const byEmail = new Map(users.map(u => [u.email.toLowerCase(), u]))

  return NextResponse.json({
    grants: grants.map(g => {
      const user = byEmail.get(g.email)
      return {
        ...g,
        effectiveLimit: g.monthlyLimit ?? PLAN_LIMITS[g.plan],
        applied: !!user?.grantedAt,
        // Surfaced rather than hidden: if these disagree the row was changed after the user
        // last signed in, and it will correct itself on their next request.
        userPlan: user?.plan ?? null,
        userLimit: user?.monthlyLimit ?? null,
      }
    }),
    // The constant pins, read-only, so the one place that reports on granted accounts is
    // complete. Leaving them out would make the founder account look ungranted here, and an
    // admin who cannot see a pin has no way to understand why adding a grant for it is
    // refused.
    constants: pinnedAccounts().map(a => ({
      email: a.email,
      plan: a.plan,
      monthlyLimit: a.monthlyLimit ?? null,
      effectiveLimit: a.monthlyLimit ?? PLAN_LIMITS[a.plan],
    })),
  })
}

/** Create or update a grant. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const rawEmail = typeof body.email === 'string' ? body.email : ''
  const email = normaliseGrantEmail(rawEmail)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  // The constant outranks this table, so a row here would be written and then silently
  // ignored -- the worst kind of no-op, one that reports success.
  if (pinnedAccountFor(email)) {
    return NextResponse.json(
      { error: `${email} is pinned in PINNED_ACCOUNTS, which already outranks a grant. Edit src/lib/auth.ts instead.` },
      { status: 409 },
    )
  }

  const plan = ALL_PLANS.find(p => p === body.plan) as Plan | undefined
  if (!plan) {
    return NextResponse.json(
      { error: `plan must be one of ${ALL_PLANS.join(', ')}.` },
      { status: 400 },
    )
  }

  // Null is meaningful and different from absent: it means "the plan's own allowance".
  let monthlyLimit: number | null = null
  if (body.monthlyLimit !== null && body.monthlyLimit !== undefined && body.monthlyLimit !== '') {
    const n = Number(body.monthlyLimit)
    if (!Number.isInteger(n) || n < 1 || n > 100_000) {
      return NextResponse.json(
        { error: 'monthlyLimit must be a whole number between 1 and 100000, or blank for the plan default.' },
        { status: 400 },
      )
    }
    monthlyLimit = n
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null

  const grant = await prisma.pinnedGrant.upsert({
    where: { email },
    create: { email, plan, monthlyLimit, note, createdBy: admin.email ?? 'unknown' },
    update: { plan, monthlyLimit, note },
  })

  return NextResponse.json({
    grant: { ...grant, effectiveLimit: grant.monthlyLimit ?? PLAN_LIMITS[grant.plan] },
    // Said plainly because it is the question the admin is about to ask. The grant is
    // applied by getOrCreateUser, which runs on the grantee's next authenticated request --
    // immediately if they are signed in, on first sign-in if they have no account yet.
    note: 'Takes effect on their next request; no account needed first.',
  })
}

/** Revoke a grant. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const email = normaliseGrantEmail(new URL(req.url).searchParams.get('email') ?? '')
  if (!email) return NextResponse.json({ error: 'email is required.' }, { status: 400 })

  if (pinnedAccountFor(email)) {
    return NextResponse.json(
      { error: `${email} is pinned in PINNED_ACCOUNTS and cannot be revoked from here. Edit src/lib/auth.ts.` },
      { status: 409 },
    )
  }

  const existing = await prisma.pinnedGrant.findUnique({ where: { email } })
  if (!existing) return NextResponse.json({ error: 'No grant for that address.' }, { status: 404 })

  await prisma.pinnedGrant.delete({ where: { email } })

  // Deliberately not downgrading the user here. getOrCreateUser owns that: it sees an
  // account marked grantedAt with no grant behind it and puts the plan back -- to the
  // subscription's plan if they have since started paying, and FREE otherwise. Doing it in
  // both places is how the two come to disagree, and this one has no view of the
  // subscription.
  return NextResponse.json({
    revoked: email,
    note: 'Access ends on their next request, when the account is put back to what it pays for.',
  })
}
