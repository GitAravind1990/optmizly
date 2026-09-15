import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { pinnedAccountFor, pinnedAccounts } from '@/lib/auth'
import { sendBetaAccessEmail } from '@/lib/email'
import { PLAN_LIMITS } from '@/lib/plans'

export const runtime = 'nodejs'

/**
 * Sends the beta-access email to accounts pinned in PINNED_ACCOUNTS.
 *
 * Admin-only, and narrower than that: **it will only mail an address that is already
 * pinned**. That is the point of the restriction rather than a side effect of it — an admin
 * endpoint that takes an arbitrary address and sends branded mail to it is a spam relay one
 * leaked session away, and this endpoint has no legitimate use for one. The list of who can
 * be mailed is the list of who already has access, which is a constant in the repository.
 *
 * POST with no body mails every pinned account that carries a monthlyLimit — the beta
 * testers, and deliberately not the founder account, which is pinned without a cap and does
 * not need telling. POST { "emails": [...] } mails a subset, still subject to the same check.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  let requested: string[] | null = null
  try {
    const body = await req.json()
    if (Array.isArray(body?.emails)) requested = body.emails.filter((e: unknown) => typeof e === 'string')
  } catch {
    // No body is the normal case: mail every capped account.
  }

  const targets = (requested ?? betaEmails()).map(e => e.trim().toLowerCase())
  if (targets.length === 0) {
    return NextResponse.json({ error: 'No pinned accounts with a credit cap to mail.' }, { status: 400 })
  }

  const results = []
  for (const email of targets) {
    const pin = pinnedAccountFor(email)
    if (!pin) {
      results.push({ email, sent: false, reason: 'Not a pinned account — refused.' })
      continue
    }
    const credits = pin.monthlyLimit ?? PLAN_LIMITS[pin.plan]
    // Sequential rather than Promise.all: two or three recipients, and a per-address
    // result is more useful than a fast one when the whole point is knowing what landed.
    const outcome = await sendBetaAccessEmail(email, credits)
    results.push({ email, credits, ...outcome })
  }

  return NextResponse.json({
    sent: results.filter(r => r.sent).length,
    failed: results.filter(r => !r.sent).length,
    results,
  })
}

/**
 * The capped pinned accounts, which is what "the beta testers" means.
 *
 * Read out of PINNED_ACCOUNTS rather than retyped here, so adding a tester to that constant
 * is the only edit needed and this cannot fall behind it. The founder account is excluded by
 * the same rule that defines the set: it is pinned without a cap.
 */
function betaEmails(): string[] {
  return pinnedAccounts()
    .filter(a => a.monthlyLimit !== undefined)
    .map(a => a.email)
}
