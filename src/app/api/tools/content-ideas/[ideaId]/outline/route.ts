import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude } from '@/lib/anthropic'
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
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  try {
    const user = await getProUser()
    const { ideaId } = await params

    const idea = await prisma.contentIdea.findUnique({
      where: { id: ideaId },
      include: { project: true },
    })
    if (!idea || idea.project.userId !== user.id) throw new AuthError(404, 'Idea not found')

    const sections: string[] = JSON.parse(idea.sections || '[]')
    const sectionsStr = sections.join(', ')

    const [aiOutline, aiIntro] = await Promise.all([
      callClaude(
        'You are an expert SEO content strategist. Create detailed, actionable content outlines.',
        `Create a detailed SEO content outline for:

Title: "${idea.title}"
Primary Keyword: ${idea.primaryKeyword}
Content Type: ${idea.contentType}
Target Length: ${idea.estimatedLength} words
Sections: ${sectionsStr}
E-E-A-T Score target: ${idea.eeatScore}/100

Produce a hierarchical outline with:
- H1 (title variation)
- H2 sections with H3 subsections
- For each section: key points to cover, statistics/data to include, internal link opportunities
- Word count target per section
- CTA suggestions

Format clearly with headers and bullet points.`,
        1500,
        'claude-haiku-4-5-20251001'
      ),

      callClaude(
        'You are an expert SEO copywriter. Write compelling, keyword-optimized introductions.',
        `Write a 120-150 word engaging introduction for:

Title: "${idea.title}"
Primary Keyword: "${idea.primaryKeyword}"
Content Type: ${idea.contentType}
E-E-A-T level: ${idea.eeatScore}/100

Requirements:
- Hook in the first sentence
- Naturally include the primary keyword in the first 100 words
- Address reader pain point or goal
- Preview what they'll learn
- Conversational but authoritative tone
- End with a transition sentence

Write ONLY the intro paragraph, no labels or headers.`,
        400,
        'claude-haiku-4-5-20251001'
      ),
    ])

    const updated = await prisma.contentIdea.update({
      where: { id: ideaId },
      data: { aiOutline, aiIntro },
    })

    return apiSuccess({ success: true, aiOutline: updated.aiOutline, aiIntro: updated.aiIntro })
  } catch (e) {
    return apiError(e)
  }
}
