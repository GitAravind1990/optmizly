import { requireToolAccess, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

/**
 * Both handlers scope the lookup by userId as well as id.
 *
 * A cuid is not an authorisation check. Filtering on id alone would let anyone holding one
 * read or delete another tenant's saved prospects - the IDOR shape already found twice in
 * this codebase during the July audit.
 */
async function ownedSearch(userId: string, id: string) {
  const row = await prisma.clientFinderSearch.findFirst({
    where: { id, userId },
    select: { id: true, industry: true, location: true, service: true, prospects: true, found: true, analyzed: true, createdAt: true },
  })
  if (!row) throw new AuthError(404, 'Saved search not found')
  return row
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId
    const { id } = await params

    const row = await ownedSearch(user.userId, id)

    // Stored as text and parsed here rather than trusted blindly: a blob written by an
    // older version of this tool could be any shape, and a JSON.parse throwing inside the
    // response would surface as a 500 for what is really "this saved search is unreadable".
    let prospects: unknown = []
    try {
      prospects = JSON.parse(row.prospects)
    } catch {
      console.error(`[client-finder] saved search ${id} holds unparseable JSON`)
      throw new AuthError(422, 'This saved search could not be read. Run the search again.')
    }

    return apiSuccess({
      search: {
        id: row.id, industry: row.industry, location: row.location, service: row.service,
        found: row.found, analyzed: row.analyzed, createdAt: row.createdAt,
      },
      prospects,
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/searches/[id]' })
    return apiError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId
    const { id } = await params

    await ownedSearch(user.userId, id)
    await prisma.clientFinderSearch.delete({ where: { id } })

    return apiSuccess({ deleted: true })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/searches/[id]' })
    return apiError(e)
  }
}
