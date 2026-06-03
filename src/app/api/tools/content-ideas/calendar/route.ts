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

export async function GET(req: NextRequest) {
  try {
    const user = await getProUser()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId') ?? undefined

    const entries = await prisma.contentCalendar.findMany({
      where: {
        project: { userId: user.id },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { publishDate: 'asc' },
    })

    return apiSuccess(entries)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
    const { projectId, ideaId, title, publishDate, status, notes } = await req.json()

    if (!projectId || !title || !publishDate) {
      throw new AuthError(400, 'projectId, title, and publishDate are required')
    }

    const project = await prisma.contentIdeaProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const entry = await prisma.contentCalendar.create({
      data: {
        projectId,
        ideaId: ideaId ?? null,
        title,
        publishDate: new Date(publishDate),
        status: status ?? 'planned',
        notes: notes ?? null,
      },
    })

    return apiSuccess(entry, 201)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getProUser()
    const { entryId, status, publishDate, notes } = await req.json()
    if (!entryId) throw new AuthError(400, 'entryId required')

    const entry = await prisma.contentCalendar.findUnique({
      where: { id: entryId },
      include: { project: true },
    })
    if (!entry || entry.project.userId !== user.id) throw new AuthError(404, 'Entry not found')

    const updated = await prisma.contentCalendar.update({
      where: { id: entryId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(publishDate !== undefined ? { publishDate: new Date(publishDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getProUser()
    const { searchParams } = new URL(req.url)
    const entryId = searchParams.get('entryId')
    if (!entryId) throw new AuthError(400, 'entryId required')

    const entry = await prisma.contentCalendar.findUnique({
      where: { id: entryId },
      include: { project: true },
    })
    if (!entry || entry.project.userId !== user.id) throw new AuthError(404, 'Entry not found')

    await prisma.contentCalendar.delete({ where: { id: entryId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
