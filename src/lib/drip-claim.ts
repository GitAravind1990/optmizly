import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// Atomically claims a one-time email send by creating its DrippedEmail row FIRST
// (unique on [userId, emailType]) — returns true if this call won the race and
// should send, false if another concurrent run already claimed it. This inverts
// the previous send-then-record order used across all cron email routes, which
// let two concurrent invocations of the same cron GET (a manual re-trigger while
// a prior run is still working through a large user batch, or any accidental
// double-fire) independently see the same eligible-user set before either had
// written its dedup row, and both send — the @@unique constraint only prevented
// a duplicate *row*, not a duplicate *send*, since the row was written after the
// email already went out. Same claim-before-send tradeoff the DoDo webhook
// already uses for its own email dedup: if the send itself fails after a
// successful claim, this treats it as a one-time miss rather than retrying,
// consistent with how every email call site in this codebase already swallows
// send failures via .catch(() => {}) for these non-critical lifecycle emails.
export async function claimDripEmail(userId: string, emailType: string): Promise<boolean> {
  try {
    await prisma.drippedEmail.create({ data: { userId, emailType } })
    return true
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false
    throw e
  }
}
