import { NextRequest } from 'next/server'
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const user = await getProUser()
    const { analysisId } = await params

    const analysis = await prisma.lLMVisibilityAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        pages: { orderBy: { pageScore: 'desc' } },
        queryTests: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!analysis || analysis.userId !== user.id) {
      throw new AuthError(404, 'Analysis not found')
    }

    return apiSuccess({
      ...analysis,
      criticalGaps: parseJSON<string[]>(analysis.criticalGaps, []),
      warnings: parseJSON<string[]>(analysis.warnings, []),
      opportunities: parseJSON<string[]>(analysis.opportunities, []),
      recommendations: parseJSON<string[]>(analysis.recommendations, []),
      pages: analysis.pages.map(p => ({
        ...p,
        subtopics: parseJSON<string[]>(p.subtopics, []),
        entities: parseJSON<string[]>(p.entities, []),
        issues: parseJSON<string[]>(p.issues, []),
      })),
      queryTests: analysis.queryTests.map(q => ({
        ...q,
        missingContent: parseJSON<string[]>(q.missingContent, []),
      })),
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const user = await getProUser()
    const { analysisId } = await params

    const analysis = await prisma.lLMVisibilityAnalysis.findUnique({
      where: { id: analysisId },
    })

    if (!analysis || analysis.userId !== user.id) {
      throw new AuthError(404, 'Analysis not found')
    }

    await prisma.lLMVisibilityAnalysis.delete({ where: { id: analysisId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
