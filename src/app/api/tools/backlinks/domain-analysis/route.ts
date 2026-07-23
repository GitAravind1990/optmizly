import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fetchOPRScore } from '@/lib/openpagerank'
import { getBacklinksSummary } from '@/lib/dataforseo'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { canUseTool } from '@/lib/plans'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
export const maxDuration = 30

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (!canUseTool(user.plan, 'backlinks')) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

function cleanDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase().split('/')[0]
}

export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
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
    // backlinksTotal/dofollowLinks/nofollowLinks come back as BigInt (see POST) —
    // JSON.stringify (which apiSuccess/NextResponse.json ultimately calls) throws on
    // a raw BigInt, so convert to Number here. Safe: real backlink counts are nowhere
    // near Number.MAX_SAFE_INTEGER (9 quadrillion+).
    const serialized = analyses.map(a => ({
      ...a,
      backlinksTotal: Number(a.backlinksTotal),
      dofollowLinks: Number(a.dofollowLinks),
      nofollowLinks: Number(a.nofollowLinks),
    }))
    return apiSuccess(serialized)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks/domain-analysis' })
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { domain: rawDomain } = await req.json()
    if (!rawDomain?.trim()) throw new AuthError(400, 'Domain required')

    const domain = cleanDomain(rawDomain.trim())

    let opr
    try {
      opr = await fetchOPRScore(domain)
    } catch (oprErr) {
      console.error('OpenPageRank lookup failed:', oprErr)
      return apiError({
        message: 'Could not retrieve domain authority data right now. Please try again in a few minutes.',
        status: 422,
        name: 'FetchError',
      })
    }

    // Real backlink profile — independent of OPR, never blocks the analysis if it fails.
    const backlinks = await getBacklinksSummary(domain).catch(() => null)

    // backlinksTotal/dofollowLinks/nofollowLinks are BigInt columns — a real domain's
    // raw backlink count can exceed Postgres INT4's ~2.1B ceiling (github.com was
    // observed at 3.43B), which threw an unhandled overflow error on every real
    // analysis of a sufficiently large site. The rest stay Int; DataForSEO's TS
    // response types claim `number` but that's not a runtime guarantee (spam score is
    // a computed value, not a raw count, and could in principle be non-integer), so
    // Math.round defensively rather than trusting the upstream type annotation.
    const analysis = await prisma.backlinkDomainAnalysis.create({
      data: {
        userId: user.id,
        domain,
        oprScore:    opr.page_rank_decimal ?? 0,
        domainRank:  parseInt(opr.rank ?? '0', 10) || 0,
        backlinksTotal:   BigInt(Math.round(backlinks?.totalBacklinks ?? 0)),
        dofollowLinks:    BigInt(Math.round(backlinks?.dofollowLinks ?? 0)),
        nofollowLinks:    BigInt(Math.round(backlinks?.nofollowLinks ?? 0)),
        referringDomains: Math.round(backlinks?.referringDomains ?? 0),
        referringIPs:     Math.round(backlinks?.referringIPs ?? 0),
        spamScore:        Math.round(backlinks?.spamScore ?? 0),
        brokenBacklinks:  Math.round(backlinks?.brokenBacklinks ?? 0),
        topBacklinks:        '[]',
        topReferringDomains: '[]',
      },
    })

    return apiSuccess({ success: true, analysisId: analysis.id })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks/domain-analysis' })
    return apiError(e)
  }
}
