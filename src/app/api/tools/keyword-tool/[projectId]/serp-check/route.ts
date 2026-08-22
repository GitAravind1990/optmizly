import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth, refundUsage } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getTopSerpResults } from '@/lib/dataforseo'
import { MAGIC_MAX_KD, MAGIC_MIN_VOLUME } from '@/lib/magic-keywords'

export const runtime = 'nodejs'
export const maxDuration = 60

/** How many keywords one click checks. Each costs a live DataForSEO SERP call, so the
 *  batch is capped rather than run across the whole list: it bounds both the spend per
 *  click and the wall time, which has to stay inside maxDuration. Leftovers are picked
 *  up by clicking again, and the button reports how many remain. */
const BATCH_SIZE = 15

/** Live SERP calls are slow enough that firing all 15 at once risks rate limiting, and
 *  slow enough that running them serially would blow maxDuration. */
const CONCURRENCY = 5

/** Fills in the top-3 ranking domains for Magic Keyword candidates that don't have them
 *  yet. Billed as an analysis, since it fires real SERP calls.
 *
 *  This exists because Keyword Difficulty alone is not trustworthy for this decision:
 *  it scores the backlink profile of the ranking *pages*, so a thin page sitting on a
 *  huge domain reads as KD 0. Showing who actually ranks lets the user discount those
 *  rows on sight rather than relying on a metric that can silently invert. */
export async function POST(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    charged = user.userId
    const { projectId } = await params

    const project = await prisma.keywordListProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'List not found')

    // Mirrors isMagicCandidate(), expressed as a Prisma filter so only candidates are
    // ever fetched — the whole point of the cap is not paying for non-candidates.
    const candidateWhere = {
      projectId,
      topDomains: null,
      difficulty: { not: null, lte: MAGIC_MAX_KD },
      searchVolume: { gte: MAGIC_MIN_VOLUME },
    }

    const pending = await prisma.keywordResearchResult.findMany({
      where: candidateWhere,
      orderBy: { searchVolume: 'desc' },
      take: BATCH_SIZE,
    })

    let checked = 0
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const slice = pending.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        slice.map(async kw => {
          const serp = await getTopSerpResults(kw.keyword, project.targetLocation, 'desktop', 3).catch(() => null)
          // A failed call stays null so the next click retries it; a genuine empty SERP
          // is stored as '' so it counts as checked and isn't retried forever.
          if (!serp) return null
          const domains = [...new Set(serp.items.map(r => r.domain))].slice(0, 3)
          return prisma.keywordResearchResult.update({
            where: { id: kw.id },
            data: { topDomains: domains.join(',') },
          })
        })
      )
      checked += results.filter(Boolean).length
    }

    // The checked keywords are already persisted above, so a failure counting what is
    // left must not refund them. A throw *inside* the loop still refunds: the response is
    // an error either way, and a partial check the user cannot see is not a delivered one.
    charged = null

    const remaining = await prisma.keywordResearchResult.count({ where: candidateWhere })

    return apiSuccess({ data: { checked, remaining } })
  } catch (e) {
    // requireAuth charged before any work happened, so a run that ends here
    // never delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'keyword-tool')

    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]/serp-check' })
    return apiError(e)
  }
}
