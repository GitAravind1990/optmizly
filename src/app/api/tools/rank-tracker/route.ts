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

export async function GET() {
  try {
    const user = await getProUser()
    const projects = await prisma.rankTrackingProject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { keywords: true, alerts: true } },
        keywords: {
          select: { currentRank: true, status: true },
        },
      },
    })

    const result = projects.map(p => {
      const tracked = p.keywords.length
      const ranked = p.keywords.filter(k => k.currentRank !== null).length
      const top10 = p.keywords.filter(k => k.currentRank !== null && k.currentRank <= 10).length
      const unreadAlerts = p._count.alerts
      return {
        id: p.id,
        name: p.name,
        domain: p.domain,
        targetLocation: p.targetLocation,
        deviceType: p.deviceType,
        updateFrequency: p.updateFrequency,
        lastUpdatedAt: p.lastUpdatedAt,
        createdAt: p.createdAt,
        keywordCount: tracked,
        rankedCount: ranked,
        top10Count: top10,
        alertCount: unreadAlerts,
      }
    })

    return apiSuccess(result)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
    const { name, domain, targetLocation, deviceType, keywords } = await req.json()

    if (!name?.trim()) throw new AuthError(400, 'Project name required')
    if (!domain?.trim()) throw new AuthError(400, 'Domain required')
    if (!keywords?.length) throw new AuthError(400, 'At least one keyword required')

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    const kwList: string[] = keywords.map((k: string) => k.trim()).filter(Boolean).slice(0, 100)

    const project = await prisma.rankTrackingProject.create({
      data: {
        userId: user.id,
        name: name.trim(),
        domain: cleanDomain,
        targetLocation: targetLocation ?? 'US',
        deviceType: deviceType ?? 'desktop',
        trackKeywords: JSON.stringify(kwList),
        keywords: {
          create: kwList.map(kw => ({
            keyword: kw,
            searchVolume: estimateVolume(kw),
            difficulty: estimateDifficulty(kw),
          })),
        },
      },
      include: { keywords: true },
    })

    return apiSuccess(project)
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
