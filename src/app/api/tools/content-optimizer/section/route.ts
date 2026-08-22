import { NextRequest } from 'next/server'
import { requireToolAccess, assertQuotaAvailable, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { GroqCapacityError } from '@/lib/llm'
import {
  SECTION_ORDER, SECTION_RUNNERS, isSectionKey, SectionError,
} from '@/lib/content-optimizer'

export const runtime = 'nodejs'

/**
 * One section, one request — deliberately inside Clerk's 61-second session token.
 *
 * The previous version of this tool ran all seven sections in a single request. Seven
 * sections through an 8,000 tokens/min Groq bucket need ~160s of capacity, and a signed-in
 * POST that outlives its session token is rejected *after* the handler returns, so the run
 * completed, the user was charged, and the response said "Not authenticated" with no way
 * for the route to know. A single section is ~2,700 tokens, which clears the bucket in
 * seconds rather than minutes.
 */
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // Not requireAuth: the run is billed once, by the finalising request that actually
    // stores a result. A run abandoned after three sections should cost nothing, and this
    // endpoint has no way to tell the fourth request of one run from the first of another.
    const user = await requireToolAccess('content-optimizer')
    clerkId = user.clerkId

    const { section, content, targetKeyword } = await req.json()

    if (!isSectionKey(section)) throw new AuthError(400, 'Unknown section')
    if (!content || !targetKeyword) {
      throw new AuthError(400, 'Content and target keyword are required')
    }

    // Billing lands at the end, so without this someone already at their limit would spend
    // seven model calls before being refused. Advisory only — see assertQuotaAvailable.
    if (section === SECTION_ORDER[0]) await assertQuotaAvailable(user, 'content-optimizer')

    return apiSuccess({ section, result: await SECTION_RUNNERS[section](content, targetKeyword) })
  } catch (e) {
    // Running out of per-minute capacity is not a broken section: the content was never
    // sent, nothing was charged, and retrying shortly genuinely works. Reported as its own
    // status so the client does not tell the user to rewrite content that was fine.
    if (e instanceof GroqCapacityError) {
      console.error('[ContentOptimizer] section starved of Groq capacity:', e.message)
      return apiError(new AuthError(503, 'The AI provider’s per-minute limit is saturated right now. Nothing was charged — please try again in a minute.'))
    }
    // A section the model could not produce is a 502 naming the section, not a generic
    // failure: the client is walking a list and needs to say which step broke. Left
    // unmapped it would fall through apiError's branches into a bare 500.
    if (e instanceof SectionError) {
      console.error('[ContentOptimizer] section failed:', e.message)
      return apiError(new AuthError(502, `${e.message}. Nothing was saved or charged — please try again.`))
    }
    await captureServerException(clerkId, e, { route: '/api/tools/content-optimizer/section' })
    return apiError(e)
  }
}
