import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== Plan.AGENCY) throw new AuthError(403, 'Agency plan required')
  return user
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { clientId } = await params

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client || client.agencyId !== user.id) throw new AuthError(404, 'Client not found')

    const reports = await prisma.clientReport.findMany({
      where: { clientId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        month: true,
        year: true,
        trafficChange: true,
        backlinksAdded: true,
        emailSent: true,
        emailSentAt: true,
        clientViewed: true,
        clientViewedAt: true,
        generatedAt: true,
      },
    })
    return apiSuccess({ client, reports })
  } catch (e) {
    return apiError(e)
  }
}
