import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireToolAccess } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { listSearchConsoleSitesResult, GSC_AUTH_MESSAGES } from '@/lib/search-console'
import { syncGscProperty, getGscCorpusStats } from '@/lib/gsc-corpus'

export const runtime = 'nodejs'
export const maxDuration = 300

/** GET — coverage snapshot. Cheap, and the honest answer to "is there enough data yet". */
export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('search-console')
    clerkId = user.clerkId
    return apiSuccess({ data: await getGscCorpusStats(user.userId) })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/integrations/search-console/sync' })
    return apiError(e)
  }
}

/**
 * POST — pull Search Analytics history into the stored corpus.
 *
 * Not billed as an analysis: this consumes Google's quota against the user's own
 * property, not a paid vendor call, and the data it collects is what makes the
 * product's estimates checkable. Charging for it would discourage the one thing worth
 * encouraging.
 *
 * Syncs one property per call — the one named by `siteUrl`, or the first verified one —
 * and returns the rest in `remaining` for the caller to walk. See the comment on the sync
 * below for why this is deliberately not done in a single request.
 */
export async function POST(req: Request) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('search-console')
    clerkId = user.clerkId

    const body = await req.json().catch(() => ({})) as { siteUrl?: string; months?: number }
    const months = Math.min(Math.max(body.months ?? 16, 1), 16)

    const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId: user.userId } })
    if (!conn) throw new AuthError(400, 'Search Console is not connected')

    const listed = await listSearchConsoleSitesResult(user.userId)
    if (!listed.ok) {
      // 401 for a grant the user must re-establish, 502 for Google being unreachable —
      // the status code alone used to say "upstream problem" for both, which sent people
      // looking at Google's status page when the real fix was a reconnect.
      const status = listed.error === 'expired' || listed.error === 'undecryptable' ? 401 : 502
      throw new AuthError(status, GSC_AUTH_MESSAGES[listed.error])
    }

    // siteUnverifiedUser grants cannot back Search Analytics reads.
    const verified = listed.sites.filter(s => s.permissionLevel !== 'siteUnverifiedUser')
    const targets = body.siteUrl
      ? verified.filter(s => s.siteUrl === body.siteUrl)
      : verified
    if (targets.length === 0) throw new AuthError(400, 'No verified property matched')

    // One property per request; the rest are handed back for the client to ask for.
    //
    // This used to loop over every verified property in a single POST. Serial by
    // necessity — Google's quota is per-user, so running properties concurrently just
    // converts headroom into 429s — which made the request as long as the connection was
    // wide, with no ceiling but the account's property count.
    //
    // That matters beyond patience: an authenticated POST that outlives Clerk's 60s
    // session token is rejected once it expires, after the work is done, and this handler
    // never learns it happened (measured 2026-08-19 on Content Optimizer). Bounding the
    // request to one property is what keeps it near that line. It does not guarantee it —
    // a single busy property is 16 month-windows of row-at-a-time upserts — so treat a
    // property that reliably fails as a signal to chunk this further, not as a Google
    // problem.
    const [target, ...remaining] = targets
    const results = [await syncGscProperty(user.userId, target.siteUrl, months)]

    return apiSuccess({
      data: {
        results,
        remaining: remaining.map(s => s.siteUrl),
        corpus: await getGscCorpusStats(user.userId),
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/integrations/search-console/sync' })
    return apiError(e)
  }
}
