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
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function GET() {
  try {
    const user = await getProUser()
    const analyses = await prisma.competitorAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return apiSuccess(analyses)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getProUser()
    const { analysisId } = await req.json()
    if (!analysisId) throw new AuthError(400, 'analysisId required')

    const analysis = await prisma.competitorAnalysis.findUnique({ where: { id: analysisId } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    await prisma.competitorAnalysis.delete({ where: { id: analysisId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
