import { requireToolAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

/**
 * The saved-search list: metadata only, never the prospects.
 *
 * Each saved search carries 20-30KB of prospect JSON, so returning fifty of them would be
 * more than a megabyte to render a sidebar of one-line summaries. The blob is fetched only
 * when a search is actually opened, by the [id] route.
 */
export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const searches = await prisma.clientFinderSearch.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, industry: true, location: true, service: true,
        found: true, analyzed: true, createdAt: true,
      },
    })

    return apiSuccess({ searches })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/searches' })
    return apiError(e)
  }
}
