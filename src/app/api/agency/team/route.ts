import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { SEAT_LIMITS } from '@/lib/plans'

export const runtime = 'nodejs'

/**
 * Resolves the signed-in person to the account they are acting on, and refuses anyone who
 * is not its owner.
 *
 * Seats are account-level, so a member managing seats could invite people into an account
 * that is not theirs, or revoke the owner. `isOwner` is derived from the session's clerkId
 * differing from the account's — see AuthedUser.
 */
async function requireOwner() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')

  const user = await getOrCreateUser(clerkId)
  if (!user) throw new AuthError(401, 'Not authenticated')

  if (user.clerkId !== clerkId) {
    throw new AuthError(403, 'Only the account owner can manage team access.')
  }
  return user
}

/** Current seats: the owner, plus every invited or active member. */
export async function GET() {
  try {
    const user = await requireOwner()
    const members = await prisma.teamMember.findMany({
      where: { ownerId: user.id },
      orderBy: { invitedAt: 'asc' },
      select: { id: true, email: true, status: true, invitedAt: true, acceptedAt: true },
    })

    const limit = SEAT_LIMITS[user.plan]
    return apiSuccess({
      owner: { email: user.email },
      members,
      // The owner occupies a seat. Counting them is the honest reading of "2 seats" and
      // the one the pricing page states.
      used: members.length + 1,
      limit,
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner()
    const { email } = await req.json()

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AuthError(400, 'A valid email address is required.')
    }
    const invite = email.trim().toLowerCase()

    if (invite === user.email.trim().toLowerCase()) {
      throw new AuthError(400, 'You already have access — this is your own account.')
    }

    const limit = SEAT_LIMITS[user.plan]
    const used = (await prisma.teamMember.count({ where: { ownerId: user.id } })) + 1
    if (used >= limit + 1) {
      throw new AuthError(
        403,
        limit <= 1
          ? 'Your plan is single-user. Upgrade to Agency to invite your team.'
          : `Your plan includes ${limit} seats and all of them are in use. Remove a member to invite someone else.`,
      )
    }

    // Refused rather than silently reassigned. A person may hold one seat anywhere - the
    // unique index on clerkId enforces it - and an owner discovering that their colleague
    // vanished from another agency's account is not a surprise worth having.
    const heldElsewhere = await prisma.teamMember.findFirst({
      where: { email: invite, NOT: { ownerId: user.id } },
      select: { id: true },
    })
    if (heldElsewhere) {
      throw new AuthError(409, 'That person already has a seat on another Optmizly account.')
    }

    // An existing paid account of their own would be shadowed by the seat, so this refuses
    // rather than quietly taking over. A free account is fine: nothing is lost, and the
    // seat gives them more than they had.
    const ownAccount = await prisma.user.findUnique({
      where: { email: invite },
      select: { plan: true },
    })
    if (ownAccount && ownAccount.plan !== 'FREE') {
      throw new AuthError(
        409,
        'That address already has its own paid Optmizly account. They would need to cancel it before joining a team.',
      )
    }

    try {
      const member = await prisma.teamMember.create({
        data: { ownerId: user.id, email: invite },
        select: { id: true, email: true, status: true, invitedAt: true, acceptedAt: true },
      })
      return apiSuccess({ member }, 201)
    } catch {
      // Unique on (ownerId, email).
      throw new AuthError(409, 'That address has already been invited to this account.')
    }
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireOwner()
    const id = new URL(req.url).searchParams.get('id')
    if (!id) throw new AuthError(400, 'Which member? An id is required.')

    // Scoped to this owner, so an id from another account deletes nothing.
    const removed = await prisma.teamMember.deleteMany({ where: { id, ownerId: user.id } })
    if (removed.count === 0) throw new AuthError(404, 'That team member was not found.')

    // Nothing else to clean up: the member's next request stops resolving to this account
    // and lands on their own, which was never touched.
    return apiSuccess({ removed: true })
  } catch (e) {
    return apiError(e)
  }
}
