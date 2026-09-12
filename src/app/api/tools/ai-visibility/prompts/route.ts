import { NextRequest } from 'next/server'
import { requireToolAccess, assertQuotaAvailable, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { promptsFromSearchConsole } from '@/lib/ai-visibility'
import { getRelatedKeywords } from '@/lib/dataforseo'

export const runtime = 'nodejs'
/**
 * Step 1 of 3: decide what to ask the engines.
 *
 * Cheap and unbilled. The unit is taken by the final store, so a run abandoned here costs the
 * user nothing — but assertQuotaAvailable still refuses someone already at their limit, before
 * any vendor money is spent rather than after.
 */
export const maxDuration = 60

const MAX_PROMPTS = 25

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('ai-visibility')
    clerkId = user.clerkId
    await assertQuotaAvailable(user, 'ai-visibility')

    const { seed } = (await req.json().catch(() => ({}))) as { seed?: unknown }

    /**
     * Search Console first, because it is the honest source: these are queries the site
     * genuinely appears for, ranked by impressions rather than clicks. A query with
     * impressions and no clicks is exactly where an AI answer may be absorbing the traffic,
     * which is the case this tool exists to find — ranking by clicks would surface the
     * queries already working.
     */
    const fromGsc = await promptsFromSearchConsole(user.userId, MAX_PROMPTS)
    if (fromGsc.length >= 5) {
      return apiSuccess({
        data: { prompts: fromGsc, source: 'search-console', promptCount: fromGsc.length },
      })
    }

    /**
     * Fallback for a customer with no Search Console connection, or too thin a corpus to be
     * worth measuring. Reported as a different source rather than silently substituted: a run
     * built from keyword suggestions is a reasonable proxy, not evidence about this site, and
     * the report has to be able to say which it was.
     *
     * Five is the floor because a three-prompt report reads as broken even when it is correct.
     */
    const seedTerm = typeof seed === 'string' ? seed.trim().slice(0, 200) : ''
    if (!seedTerm) {
      throw new AuthError(
        400,
        fromGsc.length === 0
          ? 'No Search Console data to build prompts from. Connect Search Console, or give a topic to start from.'
          : `Only ${fromGsc.length} Search Console queries in the last 90 days — too few to measure. Give a topic to start from instead.`
      )
    }

    const related = await getRelatedKeywords(seedTerm, 'US', MAX_PROMPTS).catch(() => null)
    const prompts = [seedTerm, ...(related ?? []).map(r => r.keyword)]
      .map(p => p.trim())
      .filter((p, i, all) => p.length > 2 && all.indexOf(p) === i)
      .slice(0, MAX_PROMPTS)

    if (prompts.length < 2) {
      throw new AuthError(502, 'Could not expand that topic into prompts right now. Nothing was charged — please try again.')
    }

    return apiSuccess({ data: { prompts, source: 'keywords', promptCount: prompts.length } })
  } catch (e) {
    // Nothing charged here; the unit belongs to the store step.
    await captureServerException(clerkId, e, { route: '/api/tools/ai-visibility/prompts' })
    return apiError(e)
  }
}
