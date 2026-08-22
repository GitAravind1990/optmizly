import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser, requireAuth, refundUsage } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, discoverKeywords, KEYWORDS_PER_SEED } from '@/lib/dataforseo'

type CandidateRow = {
  keyword: string
  isSeed: boolean
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  trend: string | null
  intent: string | null
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
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    // Fires a real DataForSEO keyword-metrics call, a search-intent call, and a
    // related-keywords call per request — billable, same convention as
    // content-ideas/generate and rank-tracker's project-create route.
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    charged = user.userId
    const { name, targetLocation, seedKeyword } = await req.json()

    if (!name?.trim()) throw new AuthError(400, 'List name required')
    if (!seedKeyword?.trim()) throw new AuthError(400, 'Seed keyword required')

    const resolvedLocation = targetLocation ?? 'US'
    const seed = seedKeyword.trim()

    // Discovery must finish before metrics/intent can be batched, since those calls
    // need the full keyword list up front. metrics/intent are then batched across the
    // whole set rather than called per keyword, so the row count barely affects cost.
    const discovered = await discoverKeywords(seed, resolvedLocation, KEYWORDS_PER_SEED)
    const relatedFallback = new Map(discovered.map(r => [r.keyword, r]))
    const allKeywords = [seed, ...discovered.map(r => r.keyword)]

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

    const project = await prisma.keywordListProject.create({
      data: {
        userId: user.userId,
        name: name.trim(),
        targetLocation: resolvedLocation,
        keywords: { create: candidates },
      },
      include: { keywords: true },
    })

    return apiSuccess({ data: project }, 201)
  } catch (e) {
    // requireAuth charged before any work happened, so a run that ends here
    // never delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'keyword-tool')

    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool' })
    return apiError(e)
  }
}
