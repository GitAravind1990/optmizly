import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import type { DiscoveredBusiness } from '@/lib/places-discovery'
import { runBatch, BATCH_SIZE, QUALIFIED_TARGET, type Prospect } from '@/lib/client-finder-scan'

export const runtime = 'nodejs'

/**
 * One more batch of an existing scan.
 *
 * Ten homepages at concurrency 5 with an 8s ceiling is ~16s, plus one model call, so this
 * stays far inside the 60s a signed-in POST can rely on. Reaching ten qualifying leads
 * takes roughly fifty sites at the measured hit rate, which is why the work is split this
 * way rather than given a longer maxDuration - see CLAUDE.md.
 */
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const { searchId } = await req.json()
    if (typeof searchId !== 'string' || !searchId.trim()) throw new AuthError(400, 'searchId is required')

    // Scoped to the caller. Without the userId in the where clause this would read and
    // extend another agency's scan given only an id, which is the shape of every IDOR.
    const search = await prisma.clientFinderSearch.findFirst({
      where: { id: searchId.trim(), userId: user.userId },
      select: { id: true, pool: true, cursor: true, examined: true, prospects: true },
    })
    if (!search) throw new AuthError(404, 'Search not found')

    // No daily usage is consumed here. This is the search the user already paid for
    // finishing its work, not a new one.

    let ordered: DiscoveredBusiness[] = []
    let collected: Prospect[] = []
    try {
      ordered = JSON.parse(search.pool)
      collected = JSON.parse(search.prospects)
    } catch {
      // A row from before deep scan existed, or a truncated blob. There is nothing to
      // resume from, so report the scan finished rather than throwing at the user.
      return apiSuccess({
        prospects: collected,
        scan: {
          examined: search.examined, poolSize: 0, qualified: collected.length,
          target: QUALIFIED_TARGET, done: true,
        },
      })
    }

    const alreadyDone = search.cursor >= ordered.length || collected.length >= QUALIFIED_TARGET
    if (alreadyDone) {
      return apiSuccess({
        prospects: collected,
        scan: {
          examined: search.examined, poolSize: ordered.length, qualified: collected.length,
          target: QUALIFIED_TARGET, done: true,
        },
      })
    }

    const slice = ordered.slice(search.cursor, search.cursor + BATCH_SIZE)
    const { qualified, examined, aiSummaries } = await runBatch(slice)

    // Kept in rank order across batches, so a strong lead found on batch five still sits
    // above a weaker one found on batch one.
    const merged = [...collected, ...qualified].sort((a, b) => b.rank - a.rank)
    // Never hand back more than was asked for: a batch can overshoot the target when
    // several qualify at once, and eleven leads under a promise of ten reads as a bug.
    const trimmed = merged.slice(0, QUALIFIED_TARGET)

    const cursor = Math.min(search.cursor + BATCH_SIZE, ordered.length)
    const totalExamined = search.examined + examined
    const done = trimmed.length >= QUALIFIED_TARGET || cursor >= ordered.length

    await prisma.clientFinderSearch.update({
      where: { id: search.id },
      data: {
        prospects: JSON.stringify(trimmed),
        cursor,
        examined: totalExamined,
        analyzed: trimmed.length,
      },
    })

    return apiSuccess({
      prospects: trimmed,
      scan: {
        examined: totalExamined,
        poolSize: ordered.length,
        qualified: trimmed.length,
        target: QUALIFIED_TARGET,
        done,
      },
      searchMeta: { aiSummaries },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/continue' })
    return apiError(e)
  }
}
