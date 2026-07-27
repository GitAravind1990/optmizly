import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireToolAccess } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('keyword-tool')
    clerkId = user.clerkId
    const { projectId } = await params

    const project = await prisma.keywordListProject.findUnique({
      where: { id: projectId },
      include: { keywords: { orderBy: [{ isSeed: 'desc' }, { searchVolume: 'desc' }] } },
    })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'List not found')

    return apiSuccess({ data: project })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]' })
    return apiError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('keyword-tool')
    clerkId = user.clerkId
    const { projectId } = await params

    const project = await prisma.keywordListProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'List not found')

    await prisma.keywordListProject.delete({ where: { id: projectId } })

    return apiSuccess({ data: { deleted: true } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]' })
    return apiError(e)
  }
}
