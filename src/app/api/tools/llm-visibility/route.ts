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
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

function parseJSON<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T } catch { return fallback }
}

export async function GET() {
  try {
    const user = await getProUser()

    const analyses = await prisma.lLMVisibilityAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { pages: true, queryTests: true } },
      },
    })

    return apiSuccess(analyses.map(a => ({
      id: a.id,
      websiteUrl: a.websiteUrl,
      domain: a.domain,
      llmVisibilityScore: a.llmVisibilityScore,
      semanticRelevance: a.semanticRelevance,
      retrievalLikelihood: a.retrievalLikelihood,
      contentStructure: a.contentStructure,
      answerability: a.answerability,
      technicalAccess: a.technicalAccess,
      pagesAnalyzed: a.pagesAnalyzed,
      totalWords: a.totalWords,
      topicsFound: a.topicsFound,
      entitiesFound: a.entitiesFound,
      faqSections: a.faqSections,
      criticalGaps: parseJSON<string[]>(a.criticalGaps, []),
      opportunities: parseJSON<string[]>(a.opportunities, []),
      queryTestCount: a._count.queryTests,
      createdAt: a.createdAt,
    })))
  } catch (e) {
    return apiError(e)
  }
}
