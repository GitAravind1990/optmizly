import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const user = await getAgencyUser()
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

    await prisma.localKeywordRank.createMany({
      data: newKws.map(kw => {
        const seed = hash(kw + locationId)
        return {
          locationId,
          keyword: kw,
          currentRank: seed % 4 === 0 ? null : (seed % 49) + 1,
          searchVolume: [100, 250, 500, 1000][seed % 4],
          difficulty: 20 + (seed % 60),
        }
      }),
      skipDuplicates: true,
    })

    return apiSuccess({ added: newKws.length })
  } catch (e) {
    return apiError(e)
  }
}
