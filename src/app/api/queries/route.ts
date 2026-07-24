import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

const SYSTEM = `You are an AI search query strategist. Return ONLY valid JSON:
{"summary":"","queries":[{"query":"","intent":"informational|commercial|navigational","coverage":"strong|partial|weak","why":"","fix":""}]}
Rules: 10 specific AI search queries this content should answer. All strings concise.`

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('queries')
    clerkId = user.clerkId
    const { content, summary } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }
    const raw = await callClaude(SYSTEM, `Map AI search queries.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/queries' })
    return apiError(e)
  }
}
