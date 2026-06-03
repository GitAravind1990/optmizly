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

export async function GET() {
  try {
    const user = await getAgencyUser()
    const clients = await prisma.client.findMany({
      where: { agencyId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { reports: true } } },
    })
    return apiSuccess(clients)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAgencyUser()
    const { name, email, website, industry, keywords, competitors } = await req.json()

    if (!name || !email || !website) {
      throw new AuthError(400, 'name, email, and website are required')
    }
    if (!/^https?:\/\/.+/.test(website)) {
      throw new AuthError(400, 'website must be a valid URL (include http:// or https://)')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AuthError(400, 'Invalid email address')
    }

    const keywordsArr = (keywords ?? '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean)

    const competitorsArr = (competitors ?? '')
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean)

    const client = await prisma.client.create({
      data: {
        agencyId: user.id,
        name,
        email,
        website,
        industry: industry ?? null,
        trackKeywords: JSON.stringify(keywordsArr),
        competitors: JSON.stringify(competitorsArr),
      },
    })

    return apiSuccess(client, 201)
  } catch (e) {
    return apiError(e)
  }
}
