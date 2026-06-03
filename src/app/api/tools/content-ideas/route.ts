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
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

const VALID_SORT = ['opportunityScore', 'searchVolume', 'difficulty', 'createdAt'] as const
type SortField = typeof VALID_SORT[number]

export async function GET(req: NextRequest) {
  try {
    const user = await getProUser()
    const { searchParams } = new URL(req.url)

    const sortBy = (VALID_SORT.includes(searchParams.get('sortBy') as SortField)
      ? searchParams.get('sortBy')
      : 'opportunityScore') as SortField

    const status = searchParams.get('status') ?? undefined
    const projectId = searchParams.get('projectId') ?? undefined

    // Verify project belongs to user if projectId provided
    if (projectId) {
      const project = await prisma.contentIdeaProject.findUnique({ where: { id: projectId } })
      if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')
    }

    const ideas = await prisma.contentIdea.findMany({
      where: {
        project: { userId: user.id },
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: sortBy === 'difficulty' ? { difficulty: 'asc' } : { [sortBy]: 'desc' },
      include: { project: { select: { name: true, industry: true } } },
    })

    const projects = await prisma.contentIdeaProject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { ideas: true } } },
    })

    return apiSuccess({ ideas, projects })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getProUser()
    const { ideaId, status, pinned, notes, assignedTo, dueDate } = await req.json()

    if (!ideaId) throw new AuthError(400, 'ideaId is required')

    const idea = await prisma.contentIdea.findUnique({
      where: { id: ideaId },
      include: { project: true },
    })
    if (!idea || idea.project.userId !== user.id) throw new AuthError(404, 'Idea not found')

    const updated = await prisma.contentIdea.update({
      where: { id: ideaId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(assignedTo !== undefined ? { assignedTo } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    })

    return apiSuccess({ success: true, idea: updated })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getProUser()
    const { searchParams } = new URL(req.url)
    const ideaId = searchParams.get('ideaId')
    const projectId = searchParams.get('projectId')

    if (ideaId) {
      const idea = await prisma.contentIdea.findUnique({ where: { id: ideaId }, include: { project: true } })
      if (!idea || idea.project.userId !== user.id) throw new AuthError(404, 'Idea not found')
      await prisma.contentIdea.delete({ where: { id: ideaId } })
    } else if (projectId) {
      const project = await prisma.contentIdeaProject.findUnique({ where: { id: projectId } })
      if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')
      await prisma.contentIdeaProject.delete({ where: { id: projectId } })
    } else {
      throw new AuthError(400, 'ideaId or projectId required')
    }

    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
