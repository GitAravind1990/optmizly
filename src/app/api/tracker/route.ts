import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('tracker')
    const { content, pageUrl, queries } = await req.json()

    if (!queries?.length) return apiError(new Error('No queries provided'))

    const urlLine = pageUrl ? `Page URL: ${pageUrl}` : 'No specific URL — evaluate content quality alone.'
    const system = `You are an AI citation analyst. Evaluate whether given content would be cited by ChatGPT or Perplexity for each query. ${urlLine}

Return ONLY valid JSON with NO empty values. Every string field must have actual content. Every array must have at least one item.

Example of correct output:
{"domain":"example.com","overall_citation_score":72,"verdict":"Your content has moderate citation potential","results":[{"query":"how to start a coffee shop","simulated_ai_response":"Starting a coffee shop requires $80k-300k in startup costs and a high-traffic location.","citation_likelihood":70,"would_cite":true,"citation_verdict":"possible","reasons_for_citation":["Contains specific cost data","Actionable step-by-step advice"],"reasons_against_citation":["Lacks author credentials","No external citations"],"what_would_increase_citation":"Add expert quotes and cite industry sources","chatgpt_vs_perplexity":"Both would likely reference the cost figures"}]}

Rules:
- citation_verdict: likely(75+), possible(45-74), unlikely(<45)
- would_cite: true if score>=60
- simulated_ai_response: write 2-3 sentences exactly as ChatGPT/Perplexity would answer
- reasons_for_citation: 2-3 specific reasons
- reasons_against_citation: 2-3 specific reasons
- NEVER leave any string empty or any array empty`

    const prompt = `Analyse this content for AI citation potential:

${content.slice(0, 2500)}

Evaluate for these queries (one result per query):
${queries.slice(0, 4).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
    const raw = await callClaude(system, prompt, 4000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
