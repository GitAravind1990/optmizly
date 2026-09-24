import { NextRequest } from 'next/server'
import { requireToolAccess, assertQuotaAvailable, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { promptsFromSearchConsole, isConnectedProperty } from '@/lib/ai-visibility'
import { getRelatedKeywords, getRankedKeywords } from '@/lib/dataforseo'

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

    const body = (await req.json().catch(() => ({}))) as { seed?: unknown; domain?: unknown }
    const seedTerm = typeof body.seed === 'string' ? body.seed.trim().slice(0, 200) : ''
    const domain = typeof body.domain === 'string' ? body.domain.trim().slice(0, 253) : ''

    /**
     * Prompts describe the business being measured, and nothing else decides them.
     *
     * This used to call `promptsFromSearchConsole(user.userId)` unconditionally and return the
     * moment it found five queries, so the brand and domain in the request were never read.
     * Every scan got the signed-in account's own Search Console queries. On an SEO tool's own
     * account that looks plausible for an SEO brand and is nonsense for anything else: Sudha
     * Fertility Centre was measured against "backlink audit" and scored a clean zero, while
     * Semrush and Ahrefs scored well on the same prompt list and made the bug invisible.
     *
     * It matters most for the customers who have this tool: it is Agency-only, agencies scan
     * their clients' brands, and an agency's own Search Console is its own site. The broken
     * path was the entire intended use case.
     *
     * Three sources, strongest first, each reported honestly because they are not equally good
     * evidence about the target.
     */

    /**
     * 1. Search Console — only when the domain being scanned is a property this account has
     *    actually connected. Real impressions for that exact site, ranked by impressions rather
     *    than clicks: a query with impressions and no clicks is where an AI answer may be
     *    absorbing the traffic, which is the case this tool exists to find.
     */
    if (domain && await isConnectedProperty(user.userId, domain)) {
      const fromGsc = await promptsFromSearchConsole(user.userId, MAX_PROMPTS)
      if (fromGsc.length >= 5) {
        return apiSuccess({
          data: { prompts: fromGsc, source: 'search-console', promptCount: fromGsc.length },
        })
      }
    }

    /**
     * 2. The keywords the target domain actually ranks for. Works for any domain, connected or
     *    not, which is what makes this tool usable on a client. Weaker than Search Console —
     *    it is a vendor's view of the SERP rather than the site's own measured impressions —
     *    so it is reported as its own source.
     */
    if (domain) {
      // Top-10 positions only. Raw volume returns what a big domain incidentally ranks for
      // rather than what it is about; see the note on getRankedKeywords.
      const ranked = await getRankedKeywords(domain, MAX_PROMPTS, { maxPosition: 10 }).catch(() => null)
      const prompts = (ranked?.items ?? [])
        .map(r => r.keyword.trim())
        .filter((q, i, all) => q.length > 2 && q.length <= 200 && all.indexOf(q) === i)
        .slice(0, MAX_PROMPTS)
      if (prompts.length >= 5) {
        return apiSuccess({ data: { prompts, source: 'ranked-keywords', promptCount: prompts.length } })
      }
    }

    /**
     * 3. A topic the user supplied, expanded. The weakest source: a reasonable proxy, not
     *    evidence about this site. Five is the floor because a three-prompt report reads as
     *    broken even when it is correct.
     */
    if (!seedTerm) {
      throw new AuthError(
        400,
        domain
          ? `Not enough ranking data for ${domain} to build a prompt list. Give a topic to start from instead.`
          : 'Give a domain, or a topic to start from, so the prompts describe this business.'
      )
    }

    const related = await getRelatedKeywords(seedTerm, 'US', MAX_PROMPTS).catch(() => null)
    const prompts = [seedTerm, ...(related ?? []).map(r => r.keyword)]
      .map(q => q.trim())
      .filter((q, i, all) => q.length > 2 && all.indexOf(q) === i)
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
