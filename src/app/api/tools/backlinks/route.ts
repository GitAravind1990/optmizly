import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
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
  try {
    const user = await getProUser()
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
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
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
          create: (parsed.opportunities ?? []).slice(0, 12).map(op => ({
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
    return apiError(e)
  }
}
