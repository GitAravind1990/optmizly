import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are a content gap analyst. Return ONLY valid JSON:
{"summary":"","gaps":[{"title":"","why":"","opportunity":"high|medium|low","suggested_section":""}]}
Rules: 8 specific content gaps vs what top-ranking competitors cover. All strings concise.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('gap')
    const { content, summary } = await req.json()
    const raw = await callClaude(SYSTEM, `Find content gaps. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
