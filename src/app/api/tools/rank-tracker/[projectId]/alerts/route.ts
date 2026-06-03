import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === 'FREE') throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

// Mark all alerts as read
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    await prisma.rankAlert.updateMany({
      where: { projectId, read: false },
      data: { read: true },
    })

    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
