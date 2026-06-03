import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAIL = 'gkm.aravind@gmail.com'

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (user?.email !== ADMIN_EMAIL) return { ok: false, status: 403, error: 'Admin only' }
  return { ok: true }
}
