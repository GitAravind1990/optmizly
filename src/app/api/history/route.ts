import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return apiError({ message: 'Unauthorized', status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    if (!user) return apiSuccess([])

    const items = await prisma.analysisHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        contentSnippet: true,
        contentUrl: true,
        overallScore: true,
        grade: true,
        result: true,
        createdAt: true,
      },
    })

    return apiSuccess(items)
  } catch (e) {
    return apiError(e)
  }
}
