import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an AI search query strategist. Return ONLY valid JSON:
{"summary":"","queries":[{"query":"","intent":"informational|commercial|navigational","coverage":"strong|partial|weak","why":"","fix":""}]}
Rules: 10 specific AI search queries this content should answer. All strings concise.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('queries')
    const { content, summary } = await req.json()
    const raw = await callClaude(SYSTEM, `Map AI search queries. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
