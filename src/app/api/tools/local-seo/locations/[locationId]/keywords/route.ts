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

export async function POST(req: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { locationId } = await params
    const { keywords } = await req.json()

    const location = await prisma.localSEOLocation.findUnique({
      where: { id: locationId },
      include: { account: true },
    })
    if (!location || location.account.userId !== user.id) throw new AuthError(404, 'Location not found')

    const kwList: string[] = (keywords ?? []).map((k: string) => k.trim()).filter(Boolean)
    if (!kwList.length) throw new AuthError(400, 'keywords required')

    const existing = await prisma.localKeywordRank.findMany({
      where: { locationId },
      select: { keyword: true, searchType: true },
    })
    const existingSet = new Set(existing.map(k => k.keyword.toLowerCase()))
    const newKws = kwList.filter(k => !existingSet.has(k.toLowerCase()))

    if (!newKws.length) return apiSuccess({ added: 0 })

    // No rank/volume/difficulty here — those are only known once a real "Check
    // Rankings" run populates them (see check-rankings/route.ts), same as a
    // brand-new location's keywords seeded at account creation.
    await prisma.localKeywordRank.createMany({
      data: newKws.map(kw => ({ locationId, keyword: kw })),
      skipDuplicates: true,
    })

    return apiSuccess({ added: newKws.length })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/locations/[locationId]/keywords' })
    return apiError(e)
  }
}
