import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an AI citation strategy expert. Analyse the content and return ONLY valid JSON:
{"summary":"","plan":[{"title":"","action":"","why":"","impact":"high|medium|low","effort":"low|medium|high"}]}
Rules: 8 specific citation-building actions. All strings concise.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('citation')
    const { content, summary } = await req.json()
    const raw = await callClaude(SYSTEM, `Build AI citation plan. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
