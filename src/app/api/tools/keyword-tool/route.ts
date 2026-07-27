import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics, getSearchIntent, getRelatedKeywords } from '@/lib/dataforseo'

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

    const [metrics, intent, related] = await Promise.all([
      getKeywordMetrics([seed], resolvedLocation),
      getSearchIntent([seed], resolvedLocation),
      getRelatedKeywords(seed, resolvedLocation, 25).catch(() => null),
    ])

    const seedMetrics = metrics.get(seed)

    const project = await prisma.keywordListProject.create({
      data: {
        userId: user.userId,
        name: name.trim(),
        targetLocation: resolvedLocation,
        keywords: {
          create: [
            {
              keyword: seed,
              isSeed: true,
              searchVolume: seedMetrics?.searchVolume ?? null,
              difficulty: seedMetrics?.difficulty ?? null,
              cpc: seedMetrics?.cpc ?? null,
              trend: seedMetrics?.trend ?? null,
              intent: intent.get(seed) ?? null,
            },
            ...(related ?? []).map(r => ({
              keyword: r.keyword,
              isSeed: false,
              searchVolume: r.volume,
              difficulty: r.difficulty,
            })),
          ],
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
