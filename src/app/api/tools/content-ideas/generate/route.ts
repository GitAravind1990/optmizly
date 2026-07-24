import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON, setTrackingUser } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getKeywordMetrics } from '@/lib/dataforseo'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  setTrackingUser(user.id)
  return user
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

interface RawIdea {
  title?: string
  primaryKeyword?: string
  relatedKeywords?: string[]
  searchVolume?: number
  difficulty?: number
  cpc?: number
  contentType?: string
  estimatedLength?: number
  sections?: string[]
  entitiesNeeded?: string[]
  lsiKeywords?: string[]
  semanticGaps?: string[]
  eeatScore?: number
  competitorCount?: number
  opportunityScore?: number
  description?: string
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { seedKeywords, industry, targetAudience, numberOfIdeas = 10, projectId } = await req.json()

    if (!seedKeywords?.length || !industry || !targetAudience) {
      throw new AuthError(400, 'seedKeywords, industry, and targetAudience are required')
    }

    const count = Math.min(Math.max(Number(numberOfIdeas), 1), 20)
    const keywordsStr = Array.isArray(seedKeywords) ? seedKeywords.join(', ') : seedKeywords

    const raw = await callClaude(
      'You are an expert SEO content strategist. Return ONLY a valid JSON array. No markdown, no backticks, no explanation.',
      `Generate ${count} high-opportunity content ideas for a ${industry} business targeting: ${targetAudience}

Seed keywords: ${keywordsStr}

Return a JSON array of ${count} objects. Each object must have ALL these fields:
{
  "title": "engaging article title",
  "primaryKeyword": "main target keyword",
  "relatedKeywords": ["kw1", "kw2", "kw3"],
  "searchVolume": 2400,
  "difficulty": 35,
  "cpc": 1.50,
  "contentType": "how-to|listicle|comparison|guide|case-study|tutorial",
  "estimatedLength": 2500,
  "sections": ["Introduction", "Section 1", "Section 2", "Conclusion"],
  "entitiesNeeded": ["Brand1", "Person1", "Tool1"],
  "lsiKeywords": ["related phrase 1", "related phrase 2"],
  "semanticGaps": ["topic gap 1", "topic gap 2"],
  "eeatScore": 72,
  "competitorCount": 45,
  "opportunityScore": 68,
  "description": "One sentence on why this topic is valuable"
}

Make searchVolume realistic (100-50000), difficulty 10-90, opportunityScore 30-95. Prioritize low competition + high volume topics.`,
      3000,
      'claude-haiku-4-5-20251001'
    )

    const parsed = extractJSON<RawIdea[]>(raw)
    const ideas = Array.isArray(parsed) ? parsed : []

    // Real search volume/difficulty/CPC always wins over Claude's own invented
    // "realistic" numbers (the prompt above literally instructs it to make up a
    // plausible-looking figure) — one batched DataForSEO call covers every idea's
    // primary keyword. Ideas whose keyword has no real data keep Claude's estimate,
    // flagged via metricsReal so the UI can show which numbers are real.
    const primaryKeywords = [...new Set(
      ideas.map(i => i.primaryKeyword?.trim()).filter((k): k is string => !!k)
    )]
    const realMetrics = primaryKeywords.length > 0
      ? await getKeywordMetrics(primaryKeywords, 'US').catch(() => new Map())
      : new Map()

    // Resolve or create project
    let resolvedProjectId = projectId
    if (!resolvedProjectId) {
      const project = await prisma.contentIdeaProject.create({
        data: {
          userId: user.id,
          name: `${industry} (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
          industry,
          targetAudience,
          seedKeywords: JSON.stringify(Array.isArray(seedKeywords) ? seedKeywords : [seedKeywords]),
          competitors: '[]',
        },
      })
      resolvedProjectId = project.id
    }

    const saved = await Promise.all(
      ideas.map((idea: RawIdea) => {
        const primaryKeyword = idea.primaryKeyword ?? keywordsStr.split(',')[0].trim()
        const real = realMetrics.get(primaryKeyword)
        return prisma.contentIdea.create({
          data: {
            projectId: resolvedProjectId,
            title: idea.title ?? 'Untitled',
            slug: toSlug(idea.title ?? 'untitled'),
            description: idea.description ?? null,
            primaryKeyword,
            relatedKeywords: JSON.stringify(idea.relatedKeywords ?? []),
            searchVolume: real?.searchVolume ?? idea.searchVolume ?? 0,
            difficulty: real?.difficulty ?? idea.difficulty ?? 50,
            cpc: real?.cpc ?? idea.cpc ?? null,
            metricsReal: real?.searchVolume != null,
            contentType: idea.contentType ?? 'article',
            estimatedLength: idea.estimatedLength ?? 1500,
            sections: JSON.stringify(idea.sections ?? []),
            entitiesNeeded: JSON.stringify(idea.entitiesNeeded ?? []),
            lsiKeywords: JSON.stringify(idea.lsiKeywords ?? []),
            semanticGaps: JSON.stringify(idea.semanticGaps ?? []),
            eeatScore: idea.eeatScore ?? 60,
            competitorCount: idea.competitorCount ?? 20,
            opportunityScore: idea.opportunityScore ?? 50,
          },
        })
      })
    )

    return apiSuccess({ success: true, count: saved.length, projectId: resolvedProjectId, ideas: saved }, 201)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/content-ideas/generate' })
    return apiError(e)
  }
}
