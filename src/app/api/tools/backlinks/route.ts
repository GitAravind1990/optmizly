import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON, setTrackingUser } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { canUseTool } from '@/lib/plans'
import { captureServerException } from '@/lib/posthog-server'
import { fetchOPRScores } from '@/lib/openpagerank'

function extractDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase().split('/')[0]
}

function daFromOPR(pageRankDecimal: number): string {
  return pageRankDecimal >= 6 ? 'high' : pageRankDecimal >= 3 ? 'medium' : 'low'
}

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (!canUseTool(user.plan, 'backlinks')) throw new AuthError(403, 'PRO or AGENCY plan required')
  setTrackingUser(user.id)
  return user
}

const SYSTEM = `You are an expert link-building strategist with deep knowledge of real websites and publications across all industries. Generate highly specific, actionable backlink opportunities.

Return ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of the link building strategy for this niche",
  "opportunities": [
    {
      "site_name": "Exact publication name (e.g. Search Engine Journal, Healthline, Forbes)",
      "site_url": "actual-domain.com",
      "domain_authority": "high|medium|low",
      "link_type": "guest_post|resource_page|journalist_pitch|directory|podcast|broken_link|partnership|interview|roundup",
      "angle": "Specific pitch angle tailored to this site and the target domain",
      "why_relevant": "Why this site's audience would care about this content",
      "contact_approach": "Specific outreach strategy (editor name format, section to target, etc.)",
      "difficulty": "easy|medium|hard",
      "impact": "high|medium|low",
      "estimated_da": 45
    }
  ]
}

Rules:
- Generate exactly 12 opportunities
- Use REAL, specific websites (not made-up ones)
- Mix DA levels: 3 high-DA (50+), 5 medium-DA (30-50), 4 niche-relevant blogs
- Mix link types across the 12 opportunities
- Be hyper-specific to the niche — no generic opportunities
- estimated_da should be a realistic number 10-95`

export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const projects = await prisma.backlinkProject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { opportunities: true } },
        opportunities: { select: { status: true } },
      },
    })

    return apiSuccess(projects.map(p => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      niche: p.niche,
      totalOpportunities: p._count.opportunities,
      contactedCount: p.opportunities.filter(o => ['contacted', 'replied', 'secured'].includes(o.status)).length,
      securedCount: p.opportunities.filter(o => o.status === 'secured').length,
      aiSummary: p.aiSummary,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })))
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks' })
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { name, domain, niche, targetKeywords, contentBrief } = await req.json()

    if (!name?.trim()) throw new AuthError(400, 'Project name required')
    if (!domain?.trim()) throw new AuthError(400, 'Domain required')
    if (!niche?.trim()) throw new AuthError(400, 'Niche required')

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    const kwList = Array.isArray(targetKeywords) ? targetKeywords : [targetKeywords]

    const prompt = `Find 12 backlink opportunities for this website:

Domain: ${cleanDomain}
Niche/Industry: ${niche}
Target Keywords: ${kwList.join(', ')}
Content Brief: ${contentBrief ?? 'General content about ' + niche}

Generate highly specific opportunities. Research real publications in the ${niche} space.`

    const raw = await callClaude(SYSTEM, prompt, 3000)
    const parsed = extractJSON<{
      summary: string
      opportunities: Array<{
        site_name: string
        site_url: string
        domain_authority: string
        link_type: string
        angle: string
        why_relevant: string
        contact_approach: string
        difficulty: string
        impact: string
        estimated_da: number
      }>
    }>(raw)

    let opportunities = (parsed.opportunities ?? []).slice(0, 12)

    // Claude names real-sounding publications from training data with no guarantee
    // they exist — cross-check each against OpenPageRank and drop any that don't
    // resolve to a real, indexed domain, rather than let a hallucinated site reach
    // a user's outreach list. If the OPR call itself fails (outage/misconfigured),
    // fail open and keep the AI's own opportunities unverified rather than discard
    // real suggestions over an infrastructure hiccup.
    try {
      const oprDomains = opportunities.map(op => extractDomain(op.site_url ?? ''))
      const oprResults = await fetchOPRScores(oprDomains)
      opportunities = opportunities
        .filter((op, i) => {
          const opr = oprResults.get(oprDomains[i])
          return !!opr && opr.status_code === 200
        })
        .map(op => {
          const opr = oprResults.get(extractDomain(op.site_url ?? ''))!
          return { ...op, domain_authority: daFromOPR(opr.page_rank_decimal) }
        })
    } catch (oprErr) {
      console.error('OpenPageRank verification failed, keeping unverified opportunities:', oprErr)
    }

    if (!opportunities.length) {
      throw new AuthError(422, 'Could not find verifiable backlink opportunities for this niche. Try a broader or different niche.')
    }

    const project = await prisma.backlinkProject.create({
      data: {
        userId: user.id,
        name: name.trim(),
        domain: cleanDomain,
        niche: niche.trim(),
        targetKeywords: JSON.stringify(kwList),
        contentBrief: contentBrief?.trim() ?? '',
        aiSummary: parsed.summary ?? '',
        opportunities: {
          create: opportunities.map(op => ({
            siteName: op.site_name ?? '',
            siteUrl: op.site_url ?? '',
            domainAuthority: op.domain_authority ?? 'medium',
            linkType: op.link_type ?? 'guest_post',
            angle: op.angle ?? '',
            whyRelevant: op.why_relevant ?? '',
            contactApproach: op.contact_approach ?? '',
            difficulty: op.difficulty ?? 'medium',
            impact: op.impact ?? 'medium',
            status: 'prospecting',
          })),
        },
      },
      include: { opportunities: true },
    })

    return apiSuccess({ success: true, projectId: project.id, opportunityCount: project.opportunities.length })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks' })
    return apiError(e)
  }
}
