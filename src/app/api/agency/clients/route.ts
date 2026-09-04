import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { CLIENT_LIMITS, serializeClientLimit } from '@/lib/plans'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
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
    // Returns the allowance alongside the list rather than the bare array it used to.
    // A cap the user cannot see is not an upgrade trigger, it is a surprise at the moment
    // they are trying to add an eleventh client.
    return apiSuccess({
      clients,
      used: clients.length,
      limit: serializeClientLimit(CLIENT_LIMITS[user.plan]),
    })
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

    // Checked after validation so a malformed submission is reported as malformed rather
    // than as a limit problem the user cannot act on.
    //
    // A count-then-create is not atomic, and deliberately so: two simultaneous submissions
    // could both pass and leave eleven clients. That matters for a cost ceiling and does
    // not matter here — clients are free to store, this is a product boundary, and the
    // races available to a human filling in one form are not worth a transaction.
    const limit = CLIENT_LIMITS[user.plan]
    if (Number.isFinite(limit)) {
      const existing = await prisma.client.count({ where: { agencyId: user.id } })
      if (existing >= limit) {
        throw new AuthError(
          403,
          `Your plan includes ${limit} client${limit === 1 ? '' : 's'} and you have ${existing}. Remove a client to add another, or upgrade for more.`,
        )
      }
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
