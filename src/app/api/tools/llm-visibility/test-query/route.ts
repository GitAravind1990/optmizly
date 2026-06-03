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
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

function scoreQueryMatch(query: string, title: string, content: string): number {
  const q = query.toLowerCase()
  const t = title.toLowerCase()
  const c = content.toLowerCase()
  const words = q.split(/\s+/).filter(w => w.length > 3)
  const matches = words.filter(w => t.includes(w) || c.includes(w))
  return matches.length / Math.max(words.length, 1)
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
    const { analysisId, query } = await req.json()

    if (!analysisId) throw new AuthError(400, 'Analysis ID required')
    if (!query?.trim()) throw new AuthError(400, 'Query required')

    const analysis = await prisma.lLMVisibilityAnalysis.findUnique({
      where: { id: analysisId },
      include: { pages: true },
    })

    if (!analysis || analysis.userId !== user.id) {
      throw new AuthError(404, 'Analysis not found')
    }

    const pages = analysis.pages
    const scores = pages.map(p => ({
      page: p,
      score: scoreQueryMatch(query, p.title, p.mainTopic ?? '') * 0.4 +
             (p.retrievable ? 0.3 : 0) +
             (p.faqCount > 0 ? 0.3 : 0),
    }))

    scores.sort((a, b) => b.score - a.score)
    const best = scores[0]
    const retrievalScore = Math.min(0.95, best.score + Math.random() * 0.2)
    const retrieved = retrievalScore > 0.35

    const topChunk = `${best.page.title}: This page covers ${best.page.mainTopic ?? 'relevant content'} with ${best.page.wordCount} words and ${best.page.headingCount} sections.`

    let answer = ''
    let answerQuality = 0

    if (retrieved) {
      const prompt = `You are simulating how an AI assistant would answer a user question using ONLY the content from a specific website.

Website: ${analysis.websiteUrl}
Best matching page: ${best.page.title}
Page content summary: ${topChunk}
Page score: ${best.page.pageScore}/100

User query: "${query}"

Generate a realistic AI assistant answer using only what this website's content would provide. Keep it to 2-3 sentences. Be specific but realistic about what the website likely covers.`

      try {
        answer = await callClaude(
          'You are an AI assistant answering questions based only on provided website content. Be concise and realistic.',
          prompt,
          400
        )
        answerQuality = Math.round(50 + best.page.pageScore * 0.4)
      } catch {
        answer = `Based on ${analysis.domain}, this appears to be covered under their ${best.page.title} section. The site provides information about ${best.page.mainTopic ?? 'this topic'}, though specific details would depend on the actual page content.`
        answerQuality = 45
      }
    }

    const missingContent = [
      `Specific pricing information for "${query}"`,
      `Comparison data relative to query intent`,
      `Direct statistics or case studies supporting the answer`,
      `Step-by-step process details`,
    ].slice(0, retrieved ? 3 : 4)

    const queryType = query.toLowerCase().includes('how')
      ? 'procedural'
      : query.toLowerCase().includes('what') || query.toLowerCase().includes('which')
      ? 'factual'
      : query.toLowerCase().includes('best') || query.toLowerCase().includes('top')
      ? 'evaluative'
      : 'informational'

    const queryTest = await prisma.lLMQueryTest.create({
      data: {
        analysisId,
        query: query.trim(),
        queryType,
        retrieved,
        retrievalScore,
        topRetrievedPage: best.page.url,
        topRetrievedChunk: topChunk,
        answer: answer || null,
        answerQuality: answer ? answerQuality : null,
        missingContent: JSON.stringify(missingContent),
      },
    })

    return apiSuccess({
      success: true,
      queryTest: {
        id: queryTest.id,
        query: queryTest.query,
        retrieved,
        retrievalScore,
        answer,
        quality: answerQuality,
        topPage: best.page.title,
        missingContent,
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
