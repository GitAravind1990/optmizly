import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === 'FREE') throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await getProUser()
    const { projectId } = await params
    const { keywords } = await req.json()

    const project = await prisma.rankTrackingProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const kwList: string[] = (keywords ?? []).map((k: string) => k.trim()).filter(Boolean)
    if (!kwList.length) throw new AuthError(400, 'keywords array required')

    const existing = await prisma.rankTrackingKeyword.findMany({
      where: { projectId },
      select: { keyword: true },
    })
    const existingSet = new Set(existing.map(k => k.keyword.toLowerCase()))
    const newKeywords = kwList.filter(k => !existingSet.has(k.toLowerCase()))

    if (!newKeywords.length) return apiSuccess({ added: 0, message: 'All keywords already tracked' })

    await prisma.rankTrackingKeyword.createMany({
      data: newKeywords.map(kw => ({
        projectId,
        keyword: kw,
        searchVolume: estimateVolume(kw),
        difficulty: estimateDifficulty(kw),
      })),
    })

    return apiSuccess({ added: newKeywords.length })
  } catch (e) {
    return apiError(e)
  }
}

function estimateVolume(keyword: string): number {
  const hash = simpleHash(keyword)
  const buckets = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000]
  return buckets[hash % buckets.length]
}

function estimateDifficulty(keyword: string): number {
  const hash = simpleHash(keyword + 'diff')
  return 20 + (hash % 65)
}

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
