import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics } from '@/lib/dataforseo'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    // Was getProUser() (tier check only, no quota) — this fires a real DataForSEO
    // keyword-metrics batch call per request.
    const user = await requireAuth('rank-tracker')
    clerkId = user.clerkId
    const { projectId } = await params
    const { keywords } = await req.json()

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'Project not found')

    // Was unbounded — the sibling "create project" endpoint clamps to 100
    // (rank-tracker/route.ts), but this "add more keywords to an existing
    // project" endpoint had no cap, allowing an oversized paid DataForSEO batch
    // call and unbounded bulk insert via a direct API call bypassing the UI.
    const kwList: string[] = (keywords ?? []).map((k: string) => k.trim()).filter(Boolean).slice(0, 100)
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
