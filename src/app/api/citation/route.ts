import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

const SYSTEM = `You are an AI citation strategy expert. Analyse the content and return ONLY valid JSON:
{"summary":"","plan":[{"title":"","action":"","why":"","impact":"high|medium|low","effort":"low|medium|high"}]}
Rules: 8 specific citation-building actions. All strings concise.`

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('citation')
    clerkId = user.clerkId
    const { content, summary } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }
    const raw = await callClaude(SYSTEM, `Build AI citation plan.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, 3000)}\n</content>`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/citation' })
    return apiError(e)
  }
}
