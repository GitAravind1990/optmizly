import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fetchOPRScore } from '@/lib/openpagerank'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

function cleanDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase().split('/')[0]
}

export async function GET() {
  try {
    const user = await getProUser()
    const analyses = await prisma.backlinkDomainAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, domain: true, backlinksTotal: true, dofollowLinks: true,
        nofollowLinks: true, referringDomains: true, referringIPs: true,
        spamScore: true, domainRank: true, oprScore: true, newBacklinks14d: true,
        lostBacklinks14d: true, newReferringDomains14d: true,
        lostReferringDomains14d: true, brokenBacklinks: true, createdAt: true,
      },
    })
    return apiSuccess(analyses)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
    const { domain: rawDomain } = await req.json()
    if (!rawDomain?.trim()) throw new AuthError(400, 'Domain required')

    const domain = cleanDomain(rawDomain.trim())

    const opr = await fetchOPRScore(domain)

    const analysis = await prisma.backlinkDomainAnalysis.create({
      data: {
        userId: user.id,
        domain,
        oprScore:    opr.page_rank_decimal ?? 0,
        domainRank:  parseInt(opr.rank ?? '0', 10) || 0,
        topBacklinks:        '[]',
        topReferringDomains: '[]',
      },
    })

    return apiSuccess({ success: true, analysisId: analysis.id })
  } catch (e) {
    return apiError(e)
  }
}
