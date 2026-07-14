import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { accountId } = await params

    const account = await prisma.localSEOAccount.findUnique({
      where: { id: accountId },
      include: {
        locations: {
          include: {
            keywords: { orderBy: { currentRank: 'asc' }, take: 20 },
            reviews: { orderBy: { reviewedDate: 'desc' }, take: 10 },
            citations: { orderBy: { status: 'asc' } },
          },
        },
        reviews: { orderBy: { reviewedDate: 'desc' }, take: 20 },
        citations: { orderBy: { status: 'asc' } },
        tasks: { orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] },
      },
    })

    if (!account || account.userId !== user.id) throw new AuthError(404, 'Account not found')
    return apiSuccess({ data: account })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/accounts/[accountId]' })
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { accountId } = await params

    const account = await prisma.localSEOAccount.findUnique({ where: { id: accountId } })
    if (!account || account.userId !== user.id) throw new AuthError(404, 'Account not found')

    await prisma.localSEOAccount.delete({ where: { id: accountId } })
    return apiSuccess({ success: true })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/accounts/[accountId]' })
    return apiError(e)
  }
}
