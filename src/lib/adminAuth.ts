import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

/**
 * Returns the admin's email on success as well as the verdict.
 *
 * The row is already loaded to check it, and anything that records *who* performed an admin
 * action needs it -- a granted plan with no attributed author is a row nobody can explain
 * later. Callers that only branch on `ok` are unaffected.
 */
export async function requireAdmin(): Promise<
  { ok: true; email: string } | { ok: false; status: number; error: string }
> {
  const { userId } = await auth()
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user || user.email !== ADMIN_EMAIL) return { ok: false, status: 403, error: 'Admin only' }
  return { ok: true, email: user.email }
}
