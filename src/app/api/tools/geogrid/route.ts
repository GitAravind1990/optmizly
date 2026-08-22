import { NextRequest } from 'next/server'
import { requireAuth, requireToolAccess, assertQuotaAvailable, refundUsage, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { generateGrid, type RankedGridPoint } from '@/lib/geogrid'
import { getLocalRank } from '@/lib/dataforseo'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

/**
 * One batch of grid points per request.
 *
 * This used to walk the whole grid in a single request — up to 9 sequential batches of 10
 * concurrent DataForSEO Maps calls, each batch gated on its slowest call. Measured on a
 * real 9x9 grid 2026-07-21: calls ranged 8-22s and the batches summed to **115.7s**. The
 * 7x7 default was re-measured 2026-08-22 at 44.9s, with individual batches swinging
 * between 2.1s and 13.1s.
 *
 * Both are fatal for a signed-in POST, and the 180s maxDuration this used to carry did not
 * help: Clerk's session token expires 61s after it is minted and cannot be refreshed on a
 * POST, so the request is rejected *after* the work finishes, the route never sees the 401,
 * and the user is charged 3 units and shown "Not authenticated". The 7x7 case is the worse
 * one in practice — at 44.9s it usually works and intermittently does not. See CLAUDE.md,
 * "Giving a signed-in route a maxDuration over 60".
 *
 * One batch is ten concurrent calls gated on the slowest: ~13s at the observed worst.
 */
export const maxDuration = 60

/** Ten concurrent Maps calls per request. The batch size is unchanged; what changed is how
 *  many batches one request is allowed to do. */
const BATCH = 10

export async function POST(req: NextRequest) {
  // Set once requireAuth has taken the units, so the catch can hand them back.
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const body = await req.json()
    const { businessName, keyword, centerLat, centerLng, gridSize, spacing, unit, batchIndex } = body

    if (!businessName || !keyword || centerLat == null || centerLng == null) {
      throw new AuthError(400, 'businessName, keyword, centerLat and centerLng are required')
    }

    // The grid is regenerated server-side from the same inputs on every request rather than
    // trusting a client-supplied point list, so which batch is the last one — and therefore
    // which request bills — stays a server decision.
    const size = ([5, 7, 9] as const).includes(gridSize) ? (gridSize as 5 | 7 | 9) : 7
    const gridPoints = generateGrid(
      { lat: Number(centerLat), lng: Number(centerLng) },
      size,
      Math.max(0.1, Math.min(5, Number(spacing) || 0.5)),
      unit === 'km' ? 'km' : 'miles'
    )

    const batches = Math.ceil(gridPoints.length / BATCH)
    const index = Number(batchIndex ?? 0)
    if (!Number.isInteger(index) || index < 0 || index >= batches) {
      throw new AuthError(400, `batchIndex must be between 0 and ${batches - 1}`)
    }

    // Billed on the request that completes the grid, so a run abandoned partway costs
    // nothing. Geogrid is 3 units, which is what made charging up front and then failing on
    // the seventh batch expensive. The first batch checks the allowance without spending it,
    // so someone already out is refused before any paid Maps calls are made.
    const isLast = index === batches - 1
    const user = isLast ? await requireAuth('geogrid') : await requireToolAccess('geogrid')
    clerkId = user.clerkId
    if (isLast) charged = user.userId
    if (index === 0 && !isLast) await assertQuotaAvailable(user, 'geogrid')

    const slice = gridPoints.slice(index * BATCH, index * BATCH + BATCH)
    const results = await Promise.allSettled(
      slice.map(point => getLocalRank(keyword, point, businessName))
    )

    // A failed lookup stays null rather than dropping the point: the map needs every cell to
    // keep its position, and a missing cell reads as "not ranking" rather than "not known".
    const ranks: RankedGridPoint[] = slice.map((p, j) => {
      const r = results[j]
      return { ...p, rank: r.status === 'fulfilled' ? r.value : null }
    })

    return apiSuccess({
      batchIndex: index,
      batches,
      totalPoints: gridPoints.length,
      ranks,
      keyword,
      businessName,
      center: { lat: Number(centerLat), lng: Number(centerLng) },
      gridSize: size,
    })
  } catch (e) {
    // Only the final batch charges, so this only ever refunds that one — the earlier
    // batches never had anything taken from them. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'geogrid')

    await captureServerException(clerkId, e, { route: '/api/tools/geogrid' })
    return apiError(e)
  }
}
