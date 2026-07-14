import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics } from '@/lib/dataforseo'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan === 'FREE') throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { projectId } = await params
    const { keywords } = await req.json()

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const kwList: string[] = (keywords ?? []).map((k: string) => k.trim()).filter(Boolean)
    if (!kwList.length) throw new AuthError(400, 'keywords array required')

    const existing = await prisma.rankTrackingKeyword.findMany({
      where: { projectId },
      select: { keyword: true },
    })
    const existingSet = new Set(existing.map(k => k.keyword.toLowerCase()))
    const newKeywords = kwList.filter(k => !existingSet.has(k.toLowerCase()))

    if (!newKeywords.length) return apiSuccess({ data: { added: 0, message: 'All keywords already tracked' } })

    const metrics = await getKeywordMetrics(newKeywords, project.targetLocation)

    await prisma.rankTrackingKeyword.createMany({
      data: newKeywords.map(kw => ({
        projectId,
        keyword: kw,
        searchVolume: metrics.get(kw)?.searchVolume ?? null,
        difficulty: metrics.get(kw)?.difficulty ?? null,
      })),
    })

    return apiSuccess({ data: { added: newKeywords.length } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/rank-tracker/[projectId]/keywords' })
    return apiError(e)
  }
}
