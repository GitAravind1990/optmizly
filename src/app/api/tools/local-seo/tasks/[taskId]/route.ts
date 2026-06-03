import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { taskId } = await params
    const { status } = await req.json()

    const task = await prisma.localSEOTask.findUnique({
      where: { id: taskId },
      include: { account: true },
    })
    if (!task || task.account.userId !== user.id) throw new AuthError(404, 'Task not found')

    const updated = await prisma.localSEOTask.update({
      where: { id: taskId },
      data: { status: status ?? 'done' },
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { taskId } = await params

    const task = await prisma.localSEOTask.findUnique({
      where: { id: taskId },
      include: { account: true },
    })
    if (!task || task.account.userId !== user.id) throw new AuthError(404, 'Task not found')

    await prisma.localSEOTask.delete({ where: { id: taskId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
