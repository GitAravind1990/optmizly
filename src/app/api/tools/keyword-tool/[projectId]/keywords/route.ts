import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth, refundUsage } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, discoverKeywords, KEYWORDS_PER_SEED } from '@/lib/dataforseo'

export const runtime = 'nodejs'
export const maxDuration = 60

type CandidateRow = {
  keyword: string
  isSeed: boolean
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  trend: string | null
  intent: string | null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    // Researching another seed keyword into an existing list fires the same
    // metrics/intent/related calls as creating a list — billed the same way.
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    charged = user.userId
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

    // Discovery must finish before metrics/intent can be batched, since those calls
    // need the full keyword list up front. metrics/intent are then batched across the
    // whole set rather than called per keyword, so the row count barely affects cost.
    const discovered = await discoverKeywords(seed, project.targetLocation, KEYWORDS_PER_SEED)
    const relatedFallback = new Map(discovered.map(r => [r.keyword, r]))
    const allKeywords = [seed, ...discovered.map(r => r.keyword)]

    const [metrics, intent] = await Promise.all([
      getKeywordMetrics(allKeywords, project.targetLocation),
      getSearchIntent(allKeywords, project.targetLocation),
    ])

    const rows: CandidateRow[] = []
    for (const keyword of allKeywords) {
      if (existingSet.has(keyword.toLowerCase())) continue
      const m = metrics.get(keyword)
      const fallback = relatedFallback.get(keyword)
      rows.push({
        keyword,
        isSeed: keyword === seed,
        searchVolume: m?.searchVolume ?? fallback?.volume ?? null,
        difficulty: m?.difficulty ?? fallback?.difficulty ?? null,
        cpc: m?.cpc ?? null,
        trend: m?.trend ?? null,
        intent: intent.get(keyword) ?? null,
      })
    }

    if (rows.length > 0) {
      await prisma.keywordResearchResult.createMany({
        data: rows.map(r => ({ ...r, projectId })),
      })
      await prisma.keywordListProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    }

    return apiSuccess({ data: { added: rows.length } })
  } catch (e) {
    // requireAuth charged before any work happened, so a run that ends here
    // never delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'keyword-tool')

    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]/keywords' })
    return apiError(e)
  }
}
