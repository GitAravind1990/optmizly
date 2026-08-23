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
    select: { id: true, industry: true, location: true, service: true, prospects: true, drafts: true, found: true, analyzed: true, createdAt: true },
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

    // Drafts degrade separately from prospects on purpose: unreadable drafts should cost
    // the emails, not the whole saved search.
    let drafts: unknown = {}
    try {
      drafts = JSON.parse(row.drafts)
    } catch {
      console.error(`[client-finder] saved search ${id} holds unparseable drafts`)
    }

    return apiSuccess({
      search: {
        id: row.id, industry: row.industry, location: row.location, service: row.service,
        found: row.found, analyzed: row.analyzed, createdAt: row.createdAt,
      },
      prospects,
      drafts,
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

/**
 * Stores one outreach draft against one prospect of one saved search.
 *
 * Called both when a draft is generated and when the user finishes editing it, so what is
 * kept is what they actually intend to send rather than the model's first attempt. A
 * read-modify-write on a JSON column, which is safe here because a single user editing
 * their own search is not a concurrent workload - two browser tabs racing would lose one
 * draft, and that is an acceptable trade against a table nothing else needs.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId
    const { id } = await params

    const { prospectId, subject, body } = await req.json()
    if (typeof prospectId !== 'string' || !prospectId.trim()) {
      throw new AuthError(400, 'prospectId is required')
    }
    if (typeof subject !== 'string' || typeof body !== 'string') {
      throw new AuthError(400, 'subject and body are required')
    }

    const row = await ownedSearch(user.userId, id)

    let drafts: Record<string, { subject: string; body: string }> = {}
    try {
      const parsed = JSON.parse(row.drafts)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) drafts = parsed
    } catch {
      // Start clean rather than refusing the write - losing older drafts is better than
      // being permanently unable to save a new one because of one bad blob.
      console.error(`[client-finder] search ${id} had unparseable drafts; replacing`)
    }

    // Bounded on every axis: a search holds ten prospects, so twenty drafts is already
    // generous, and the lengths match what the outreach route itself returns.
    if (!(prospectId in drafts) && Object.keys(drafts).length >= 20) {
      throw new AuthError(400, 'Too many drafts saved against this search')
    }
    drafts[prospectId] = { subject: subject.slice(0, 120), body: body.slice(0, 2_000) }

    await prisma.clientFinderSearch.update({ where: { id }, data: { drafts: JSON.stringify(drafts) } })

    return apiSuccess({ saved: true })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/searches/[id]' })
    return apiError(e)
  }
}
