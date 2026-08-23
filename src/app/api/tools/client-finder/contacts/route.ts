import { requireToolAccess, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

/**
 * The four states worth tracking. "Not contacted" is deliberately absent: it is the
 * default for every business on earth, and storing it would mean writing a row for every
 * prospect ever returned rather than only the ones actually worked.
 */
const STATUSES = ['CONTACTED', 'REPLIED', 'WON', 'DEAD'] as const
type Status = typeof STATUSES[number]

/** Every prospect this user has marked, as a map the client can look up by placeId. */
export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const rows = await prisma.prospectContact.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      select: { placeId: true, businessName: true, status: true, updatedAt: true },
    })

    // Keyed by placeId because that is how search results are matched: a business found
    // again next month must arrive already marked.
    const byPlaceId: Record<string, { status: string; businessName: string; updatedAt: Date }> = {}
    for (const r of rows) byPlaceId[r.placeId] = { status: r.status, businessName: r.businessName, updatedAt: r.updatedAt }

    return apiSuccess({ contacts: byPlaceId, count: rows.length })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/contacts' })
    return apiError(e)
  }
}

/**
 * Set or clear one prospect's status.
 *
 * A null status deletes the row rather than storing "not contacted", keeping the table to
 * prospects actually worked - and making an accidental mark genuinely undoable rather than
 * leaving a tombstone behind.
 */
export async function PUT(req: Request) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const { placeId, businessName, status } = await req.json()
    if (typeof placeId !== 'string' || !placeId.trim()) throw new AuthError(400, 'placeId is required')

    if (status === null) {
      await prisma.prospectContact.deleteMany({ where: { userId: user.userId, placeId } })
      return apiSuccess({ placeId, status: null })
    }

    if (typeof status !== 'string' || !STATUSES.includes(status as Status)) {
      throw new AuthError(400, `status must be null or one of: ${STATUSES.join(', ')}`)
    }
    const name = typeof businessName === 'string' && businessName.trim()
      ? businessName.trim().slice(0, 200)
      : 'Unknown business'

    // Scoped by userId in the unique key, so one agency's marks can never touch another's.
    await prisma.prospectContact.upsert({
      where: { userId_placeId: { userId: user.userId, placeId } },
      create: { userId: user.userId, placeId, businessName: name, status },
      update: { status, businessName: name },
    })

    return apiSuccess({ placeId, status })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/contacts' })
    return apiError(e)
  }
}
