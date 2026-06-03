import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an E-E-A-T specialist. Analyse the content and return ONLY valid JSON:
{"overall":0,"summary":"","dimensions":{"experience":{"score":0,"finding":""},"expertise":{"score":0,"finding":""},"authoritativeness":{"score":0,"finding":""},"trustworthiness":{"score":0,"finding":""}},"recommendations":[""]}
Rules: all scores 0-100. recommendations: 5 specific E-E-A-T improvements. All strings concise.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('eeat')
    const { content, summary } = await req.json()
    const raw = await callClaude(SYSTEM, `Analyse for E-E-A-T. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`, 1200)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
