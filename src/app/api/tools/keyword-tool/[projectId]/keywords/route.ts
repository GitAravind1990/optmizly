import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, getRelatedKeywords } from '@/lib/dataforseo'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    // Researching another seed keyword into an existing list fires the same
    // metrics/intent/related calls as creating a list — billed the same way.
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    const { projectId } = await params
    const { seedKeyword } = await req.json()

    const project = await prisma.keywordListProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'List not found')

    const seed = seedKeyword?.trim()
    if (!seed) throw new AuthError(400, 'seedKeyword required')

    const existing = await prisma.keywordResearchResult.findMany({
      where: { projectId },
      select: { keyword: true },
    })
    const existingSet = new Set(existing.map(k => k.keyword.toLowerCase()))

    const [metrics, intent, related] = await Promise.all([
      getKeywordMetrics([seed], project.targetLocation),
      getSearchIntent([seed], project.targetLocation),
      getRelatedKeywords(seed, project.targetLocation, 25).catch(() => null),
    ])

    const seedMetrics = metrics.get(seed)
    const rows: Array<{ keyword: string; isSeed: boolean; searchVolume: number | null; difficulty: number | null; cpc: number | null; trend: string | null; intent: string | null }> = []

    if (!existingSet.has(seed.toLowerCase())) {
      rows.push({
        keyword: seed,
        isSeed: true,
        searchVolume: seedMetrics?.searchVolume ?? null,
        difficulty: seedMetrics?.difficulty ?? null,
        cpc: seedMetrics?.cpc ?? null,
        trend: seedMetrics?.trend ?? null,
        intent: intent.get(seed) ?? null,
      })
    }

    for (const r of related ?? []) {
      if (!existingSet.has(r.keyword.toLowerCase())) {
        rows.push({ keyword: r.keyword, isSeed: false, searchVolume: r.volume, difficulty: r.difficulty, cpc: null, trend: null, intent: null })
      }
    }

    if (rows.length > 0) {
      await prisma.keywordResearchResult.createMany({
        data: rows.map(r => ({ ...r, projectId })),
      })
      await prisma.keywordListProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    }

    return apiSuccess({ data: { added: rows.length } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]/keywords' })
    return apiError(e)
  }
}
