import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { generateGrid, getGridStats, type RankedGridPoint } from '@/lib/geogrid'
import { getLocalRank } from '@/lib/dataforseo'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
// No maxDuration was ever set here, so this fell back to the platform's short
// default even though it does the opposite of a quick request: up to 9 sequential
// batches of 10 concurrent DataForSEO Maps live calls for a 9x9 grid, each batch
// gated on its slowest call. Measured live against a real, busy 9x9 grid
// (2026-07-21): individual calls ranged 8-22s under normal load, batches summed to
// 115.7s total — comfortably past any short default, which is why this was likely
// failing silently before getting an explicit budget.
export const maxDuration = 180

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const authedUser = await requireAuth('geogrid')
    clerkId = authedUser.clerkId

    const body = await req.json()
    const { businessName, keyword, centerLat, centerLng, gridSize, spacing, unit } = body

    if (!businessName || !keyword || centerLat == null || centerLng == null) {
      return apiError({ status: 400, message: 'businessName, keyword, centerLat and centerLng are required', name: 'ValidationError' })
    }

    const size = ([5, 7, 9] as const).includes(gridSize) ? (gridSize as 5 | 7 | 9) : 7
    const gridPoints = generateGrid(
      { lat: Number(centerLat), lng: Number(centerLng) },
      size,
      Math.max(0.1, Math.min(5, Number(spacing) || 0.5)),
      unit === 'km' ? 'km' : 'miles'
    )

    // Batch requests: 10 in parallel, 200 ms between batches
    const ranked: RankedGridPoint[] = gridPoints.map(p => ({ ...p, rank: null }))
    const BATCH = 10

    for (let i = 0; i < gridPoints.length; i += BATCH) {
      const batch = gridPoints.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(point => getLocalRank(keyword, point, businessName))
      )
      results.forEach((r, j) => {
        ranked[i + j].rank = r.status === 'fulfilled' ? r.value : null
      })
      if (i + BATCH < gridPoints.length) await sleep(200)
    }

    return apiSuccess({
      grid: ranked,
      stats: getGridStats(ranked),
      keyword,
      businessName,
      center: { lat: Number(centerLat), lng: Number(centerLng) },
      gridSize: size,
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/geogrid' })
    return apiError(e)
  }
}
