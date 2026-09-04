import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { consumeDailyIpQuota } from '@/lib/public-rate-limit'

export const runtime = 'nodejs'

/**
 * Joins the prospect-search waitlist after the daily Places ceiling has been spent.
 *
 * Deliberately not gated on a plan or a session. The whole point of the ceiling is that it
 * trips hardest on a launch day, when most of the people hitting it have no account yet —
 * refusing them here would keep the outage and throw away the only thing worth salvaging
 * from it.
 *
 * Rate limited per IP anyway, because an open endpoint that writes a row and stores an
 * email address is exactly the shape that gets abused. 5/day matches the other public tools.
 */
export async function POST(req: NextRequest) {
  try {
    const verdict = await consumeDailyIpQuota(req, 'prospect-waitlist', 5)
    if (verdict.unavailable) {
      throw new AuthError(503, 'This is temporarily unavailable. Please try again shortly.')
    }
    if (!verdict.allowed) {
      throw new AuthError(429, 'Too many requests from this network today. Please try again tomorrow.')
    }

    const { email, industry, location } = await req.json()

    // Recorded when present, but never required. A signed-in user gets the same row with a
    // userId attached, which is what lets the public tool's capture rate be told apart from
    // a paying customer's outage later.
    const { userId: clerkId } = await auth()
    const user = clerkId
      ? await prisma.user.findUnique({ where: { clerkId }, select: { id: true, email: true } })
      : null

    // A signed-in user is never asked to type an address we already hold — the session
    // supplies it. An anonymous visitor must provide one, because there is nothing else to
    // send to. A supplied address still wins, so a user can route the notice elsewhere.
    const resolvedEmail = (typeof email === 'string' && email.trim()) || user?.email || ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      throw new AuthError(400, 'A valid email address is required.')
    }
    if (typeof industry !== 'string' || !industry.trim()) {
      throw new AuthError(400, 'Tell us which industry you were searching for.')
    }
    if (typeof location !== 'string' || !location.trim()) {
      throw new AuthError(400, 'Tell us which location you were searching in.')
    }

    await prisma.prospectWaitlist.create({
      data: {
        email: resolvedEmail.trim().toLowerCase(),
        industry: industry.trim().slice(0, 120),
        location: location.trim().slice(0, 120),
        userId: user?.id ?? null,
        source: user ? 'dashboard' : 'public',
      },
    })

    return apiSuccess({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
