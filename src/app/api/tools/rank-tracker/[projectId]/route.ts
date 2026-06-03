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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.rankTrackingProject.findUnique({
      where: { id: projectId },
      include: {
        keywords: {
          orderBy: [{ currentRank: 'asc' }, { keyword: 'asc' }],
          include: {
            history: {
              orderBy: { checkedDate: 'desc' },
              take: 30,
            },
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')
    return apiSuccess(project)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params
    const body = await req.json()

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const updated = await prisma.rankTrackingProject.update({
      where: { id: projectId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.targetLocation && { targetLocation: body.targetLocation }),
        ...(body.deviceType && { deviceType: body.deviceType }),
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    await prisma.rankTrackingProject.delete({ where: { id: projectId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
