import { NextRequest } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { analyseEeat } from '@/lib/eeat'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('eeat')
    clerkId = user.clerkId
    const { content, summary } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AuthError(400, 'Content is required')
    }
    // Prompt and parsing live in @/lib/eeat, shared with the public no-signup route so
    // the two cannot drift into scoring the same content differently.
    return apiSuccess({ ...(await analyseEeat(content, summary)), userPlan: user.plan })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/eeat' })
    return apiError(e)
  }
}
