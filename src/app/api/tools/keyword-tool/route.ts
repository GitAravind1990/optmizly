import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, getRelatedKeywords, getAllInTitleCount } from '@/lib/dataforseo'

type CandidateRow = {
  keyword: string
  isSeed: boolean
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  trend: string | null
  intent: string | null
}

/** Opportunity Ratio (allintitle: result count / search volume) is only meaningful —
 *  and only worth the extra DataForSEO call — for keywords under ~250 monthly
 *  searches, matching the technique's own applicability window. Fired in parallel
 *  across just that low-volume subset, not every row. */
async function computeOpportunityRatios(rows: CandidateRow[], targetLocation: string): Promise<Map<string, number>> {
  const lowVolume = rows.filter((r): r is CandidateRow & { searchVolume: number } =>
    r.searchVolume !== null && r.searchVolume > 0 && r.searchVolume < 250
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

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan === 'FREE') throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const projects = await prisma.keywordListProject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { keywords: true } } },
    })

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      targetLocation: p.targetLocation,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      keywordCount: p._count.keywords,
    }))

    return apiSuccess({ data: result })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool' })
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // Fires a real DataForSEO keyword-metrics call, a search-intent call, and a
    // related-keywords call per request — billable, same convention as
    // content-ideas/generate and rank-tracker's project-create route.
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    const { name, targetLocation, seedKeyword } = await req.json()

    if (!name?.trim()) throw new AuthError(400, 'List name required')
    if (!seedKeyword?.trim()) throw new AuthError(400, 'Seed keyword required')

    const resolvedLocation = targetLocation ?? 'US'
    const seed = seedKeyword.trim()

    // Related keywords must be discovered before metrics/intent can be batched, since
    // that batch call needs the full keyword list up front. Still exactly 3 DataForSEO
    // calls total (related, then metrics+intent in parallel) -- same cost as calling
    // metrics/intent for the seed alone, just restructured so every row gets real
    // CPC/trend/intent instead of only the seed.
    const related = await getRelatedKeywords(seed, resolvedLocation, 25).catch(() => null)
    const relatedFallback = new Map((related ?? []).map(r => [r.keyword, r]))
    const allKeywords = [seed, ...(related ?? []).map(r => r.keyword)]

    const [metrics, intent] = await Promise.all([
      getKeywordMetrics(allKeywords, resolvedLocation),
      getSearchIntent(allKeywords, resolvedLocation),
    ])

    const candidates: CandidateRow[] = allKeywords.map(keyword => {
      const m = metrics.get(keyword)
      const fallback = relatedFallback.get(keyword)
      return {
        keyword,
        isSeed: keyword === seed,
        searchVolume: m?.searchVolume ?? fallback?.volume ?? null,
        difficulty: m?.difficulty ?? fallback?.difficulty ?? null,
        cpc: m?.cpc ?? null,
        trend: m?.trend ?? null,
        intent: intent.get(keyword) ?? null,
      }
    })

    const ratios = await computeOpportunityRatios(candidates, resolvedLocation)

    const project = await prisma.keywordListProject.create({
      data: {
        userId: user.userId,
        name: name.trim(),
        targetLocation: resolvedLocation,
        keywords: {
          create: candidates.map(c => ({ ...c, opportunityRatio: ratios.get(c.keyword) ?? null })),
        },
      },
      include: { keywords: true },
    })

    return apiSuccess({ data: project }, 201)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool' })
    return apiError(e)
  }
}
