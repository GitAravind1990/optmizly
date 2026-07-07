import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

async function getUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  return user
}

export async function GET(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const { searchParams } = new URL(req.url)
    const analysisId = searchParams.get('id')

    if (analysisId) {
      const analysis = await prisma.onPageAnalysis.findUnique({ where: { id: analysisId } })
      if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')
      return apiSuccess({
        data: {
          ...analysis,
          keywordData: JSON.parse(analysis.keywordData),
          headers: JSON.parse(analysis.headers),
          metaTags: JSON.parse(analysis.metaTags),
          images: JSON.parse(analysis.images),
          links: JSON.parse(analysis.links),
          readabilityData: JSON.parse(analysis.readabilityData),
          fixes: JSON.parse(analysis.fixes),
          appliedFixes: JSON.parse(analysis.appliedFixes),
        },
      })
    }

    const analyses = await prisma.onPageAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, targetKeyword: true, pageUrl: true, pageTitle: true,
        overallScore: true, previousScore: true, wordCount: true,
        keywordScore: true, headerScore: true, metaScore: true,
        imageScore: true, linkScore: true, readabilityScore: true,
        version: true, analyzedAt: true, createdAt: true,
      },
    })

    return apiSuccess({ data: analyses })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/onpage' })
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const { analysisId, fixIndex } = await req.json()
    if (!analysisId || fixIndex === undefined) throw new AuthError(400, 'analysisId and fixIndex required')

    const analysis = await prisma.onPageAnalysis.findUnique({ where: { id: analysisId } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    const applied = JSON.parse(analysis.appliedFixes)

    if (!applied.includes(fixIndex)) applied.push(fixIndex)

    await prisma.onPageAnalysis.update({
      where: { id: analysisId },
      data: { appliedFixes: JSON.stringify(applied) },
    })

    return apiSuccess({ data: { success: true, appliedFixes: applied } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/onpage' })
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) throw new AuthError(400, 'id required')

    const analysis = await prisma.onPageAnalysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    await prisma.onPageAnalysis.delete({ where: { id } })
    return apiSuccess({ success: true })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/onpage' })
    return apiError(e)
  }
}
