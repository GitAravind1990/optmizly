import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, getRelatedKeywords, getAllInTitleCount } from '@/lib/dataforseo'

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

/** Opportunity Ratio (allintitle: result count / search volume) is only worth the
 *  extra DataForSEO call for lower-volume keywords, where it's actually meaningful —
 *  above this it gets noisy and isn't really the technique anymore. Fired in parallel
 *  across just that subset, not every row, to keep the added cost bounded. */
async function computeOpportunityRatios(rows: CandidateRow[], targetLocation: string): Promise<Map<string, number>> {
  const lowVolume = rows.filter((r): r is CandidateRow & { searchVolume: number } =>
    r.searchVolume !== null && r.searchVolume > 0 && r.searchVolume < 1000
  )
  const entries = await Promise.all(
    lowVolume.map(async r => {
      const count = await getAllInTitleCount(r.keyword, targetLocation).catch(() => null)
      const ratio = count !== null ? Math.round((count / r.searchVolume) * 100) / 100 : null
      return [r.keyword, ratio] as const
    })
  )
  return new Map(entries.filter((e): e is [string, number] => e[1] !== null))
}

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

    // Related keywords must be discovered before metrics/intent can be batched, since
    // that batch call needs the full keyword list up front. Still exactly 3 DataForSEO
    // calls total (related, then metrics+intent in parallel) -- same cost as calling
    // metrics/intent for the seed alone, just restructured so every row gets real
    // CPC/trend/intent instead of only the seed.
    const related = await getRelatedKeywords(seed, project.targetLocation, 25).catch(() => null)
    const relatedFallback = new Map((related ?? []).map(r => [r.keyword, r]))
    const allKeywords = [seed, ...(related ?? []).map(r => r.keyword)]

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
      const ratios = await computeOpportunityRatios(rows, project.targetLocation)
      await prisma.keywordResearchResult.createMany({
        data: rows.map(r => ({ ...r, projectId, opportunityRatio: ratios.get(r.keyword) ?? null })),
      })
      await prisma.keywordListProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    }

    return apiSuccess({ data: { added: rows.length } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]/keywords' })
    return apiError(e)
  }
}
