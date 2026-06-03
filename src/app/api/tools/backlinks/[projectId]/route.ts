import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.backlinkProject.findUnique({
      where: { id: projectId },
      include: { opportunities: { orderBy: { createdAt: 'asc' } } },
    })

    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    return apiSuccess({
      ...project,
      targetKeywords: (() => { try { return JSON.parse(project.targetKeywords) } catch { return [] } })(),
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getProUser()
    const { projectId } = await params

    const project = await prisma.backlinkProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    await prisma.backlinkProject.delete({ where: { id: projectId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
