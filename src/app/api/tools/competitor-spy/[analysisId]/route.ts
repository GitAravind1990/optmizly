import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ analysisId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { analysisId } = await params

    const analysis = await prisma.competitorAnalysis.findUnique({ where: { id: analysisId } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    return apiSuccess({
      ...analysis,
      topKeywords: JSON.parse(analysis.topKeywords),
      topPages: JSON.parse(analysis.topPages),
      topBacklinks: JSON.parse(analysis.topBacklinks),
      gapKeywords: JSON.parse(analysis.gapKeywords),
      missingEntities: JSON.parse(analysis.missingEntities),
      contentOpps: JSON.parse(analysis.contentOpps),
      aiInsights: analysis.aiInsights ? JSON.parse(analysis.aiInsights) : null,
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/competitor-spy/[analysisId]' })
    return apiError(e)
  }
}
