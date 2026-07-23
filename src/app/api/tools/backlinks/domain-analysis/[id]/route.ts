import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { canUseTool } from '@/lib/plans'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (!canUseTool(user.plan, 'backlinks')) throw new AuthError(403, 'PRO or AGENCY plan required')
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { id } = await params

    const analysis = await prisma.backlinkDomainAnalysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    return apiSuccess({
      ...analysis,
      // backlinksTotal/dofollowLinks/nofollowLinks are BigInt columns (real backlink
      // counts can exceed Postgres INT4) — JSON.stringify can't serialize BigInt
      // directly, so convert to Number (safe at these magnitudes) before returning.
      backlinksTotal: Number(analysis.backlinksTotal),
      dofollowLinks: Number(analysis.dofollowLinks),
      nofollowLinks: Number(analysis.nofollowLinks),
      topBacklinks: (() => { try { return JSON.parse(analysis.topBacklinks) } catch { return [] } })(),
      topReferringDomains: (() => { try { return JSON.parse(analysis.topReferringDomains) } catch { return [] } })(),
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks/domain-analysis/[id]' })
    return apiError(e)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { id } = await params

    const analysis = await prisma.backlinkDomainAnalysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== user.id) throw new AuthError(404, 'Analysis not found')

    await prisma.backlinkDomainAnalysis.delete({ where: { id } })
    return apiSuccess({ success: true })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/backlinks/domain-analysis/[id]' })
    return apiError(e)
  }
}
