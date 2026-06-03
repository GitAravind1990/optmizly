import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

const VALID_STATUSES = ['prospecting', 'contacted', 'replied', 'secured', 'rejected']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; oppId: string }> }
) {
  try {
    const user = await getProUser()
    const { projectId, oppId } = await params
    const { status, notes } = await req.json()

    const project = await prisma.backlinkProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new AuthError(404, 'Project not found')

    const opp = await prisma.backlinkOpportunity.findUnique({ where: { id: oppId } })
    if (!opp || opp.projectId !== projectId) throw new AuthError(404, 'Opportunity not found')

    if (status && !VALID_STATUSES.includes(status)) {
      throw new AuthError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    const updated = await prisma.backlinkOpportunity.update({
      where: { id: oppId },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError(e)
  }
}
