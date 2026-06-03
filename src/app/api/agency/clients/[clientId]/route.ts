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

async function getOwnedClient(agencyId: string, clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client || client.agencyId !== agencyId) throw new AuthError(404, 'Client not found')
  return client
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { clientId } = await params
    const client = await getOwnedClient(user.id, clientId)
    return apiSuccess(client)
  } catch (e) {
    return apiError(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { clientId } = await params
    await getOwnedClient(user.id, clientId)
    const body = await req.json()

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: body.name,
        email: body.email,
        website: body.website,
        industry: body.industry,
        brandColor: body.brandColor,
        trackKeywords: body.keywords
          ? JSON.stringify(body.keywords.split(',').map((k: string) => k.trim()).filter(Boolean))
          : undefined,
      },
    })
    return apiSuccess(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { clientId } = await params
    await getOwnedClient(user.id, clientId)
    await prisma.client.delete({ where: { id: clientId } })
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
