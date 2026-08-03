import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireToolAccess } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { listSearchConsoleSites } from '@/lib/search-console'
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
 * Syncs every verified property on the connection unless `siteUrl` is given.
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

    const sites = await listSearchConsoleSites(user.userId)
    if (!sites) throw new AuthError(502, 'Could not list Search Console properties')

    // siteUnverifiedUser grants cannot back Search Analytics reads.
    const verified = sites.filter(s => s.permissionLevel !== 'siteUnverifiedUser')
    const targets = body.siteUrl
      ? verified.filter(s => s.siteUrl === body.siteUrl)
      : verified
    if (targets.length === 0) throw new AuthError(400, 'No verified property matched')

    // Serial, not parallel: Google's Search Console quota is per-user, and running
    // properties concurrently just converts headroom into 429s.
    const results = []
    for (const site of targets) {
      results.push(await syncGscProperty(user.userId, site.siteUrl, months))
    }

    return apiSuccess({ data: { results, corpus: await getGscCorpusStats(user.userId) } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/integrations/search-console/sync' })
    return apiError(e)
  }
}
