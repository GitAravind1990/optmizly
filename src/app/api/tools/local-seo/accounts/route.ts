import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { resolveBusinessCoordinates, settledOrNull } from '@/lib/dataforseo'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

const LOCAL_KEYWORDS = [
  'near me', 'best', 'top rated', 'affordable', 'local', '24 hour', 'same day', 'emergency',
]

export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const accounts = await prisma.localSEOAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        locations: {
          select: { id: true, name: true, city: true, state: true, averageRating: true, reviewCount: true, citationScore: true },
        },
        _count: { select: { reviews: true, tasks: true, citations: true } },
      },
    })
    return apiSuccess({ data: accounts })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/accounts' })
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { name, accountType, locations } = await req.json()

    if (!name?.trim()) throw new AuthError(400, 'Account name required')
    if (!locations?.length) throw new AuthError(400, 'At least one location required')

    const account = await prisma.localSEOAccount.create({
      data: {
        userId: user.id,
        name: name.trim(),
        accountType: accountType ?? 'multi-location',
      },
    })

    const validLocations = locations.filter(
      (loc: { name?: string; address?: string; city?: string; state?: string; phone?: string }) =>
        loc.name && loc.address && loc.city && loc.state && loc.phone
    )

    // Real rating/review count from each business's actual Google Business Profile,
    // resolved the same way check-rankings resolves coordinates — run concurrently
    // since each location's lookup is independent. Never blocks account creation;
    // a failed/not-found lookup just leaves that location's rating/reviews null
    // (shown as "—" in the UI).
    const profileResults = await Promise.allSettled(
      validLocations.map((loc: { name: string; city: string; state: string }) =>
        resolveBusinessCoordinates(loc.name, loc.city, loc.state))
    )

    for (let i = 0; i < validLocations.length; i++) {
      const loc = validLocations[i]
      const profile = settledOrNull(profileResults[i])

      const industry = (loc.industry ?? 'business').toLowerCase()

      const kwList = LOCAL_KEYWORDS.slice(0, 4).map(suffix => `${industry} ${suffix}`).concat([
        `${industry} in ${loc.city}`,
        `${industry} ${loc.city} ${loc.state}`,
        `${industry} near ${loc.city}`,
        `best ${industry} ${loc.city}`,
      ])

      const location = await prisma.localSEOLocation.create({
        data: {
          accountId: account.id,
          name: loc.name.trim(),
          address: loc.address.trim(),
          city: loc.city.trim(),
          state: loc.state.trim(),
          zipCode: loc.zipCode?.trim() ?? '',
          phone: loc.phone.trim(),
          website: loc.website?.trim() ?? null,
          localKeywords: JSON.stringify(kwList),
          averageRating: profile?.rating ?? null,
          reviewCount: profile?.reviewCount ?? null,
          gmapsUrl: profile ? `https://www.google.com/maps/place/?q=place_id:${profile.placeId}` : null,
        },
      })

      // Seed keywords with no rank data — a keyword's real rank/volume/difficulty is
      // only known once "Check Rankings" actually runs (real DataForSEO lookup), not
      // invented at creation time.
      await prisma.localKeywordRank.createMany({
        data: kwList.map(kw => ({
          locationId: location.id,
          keyword: kw,
        })),
      })
    }

    // Seed initial tasks
    await prisma.localSEOTask.createMany({
      data: [
        { accountId: account.id, title: 'Verify all Google Business Profile listings', category: 'gbp', priority: 'high', description: 'Ensure all locations are claimed and verified on GBP.' },
        { accountId: account.id, title: 'Audit NAP consistency across all citations', category: 'citations', priority: 'high', description: 'Check that business name, address, and phone match on all directories.' },
        { accountId: account.id, title: 'Respond to all unanswered reviews', category: 'reviews', priority: 'medium', description: 'Reply to recent reviews to show engagement and improve ratings.' },
        { accountId: account.id, title: 'Add local keywords to GBP business descriptions', category: 'keywords', priority: 'medium', description: 'Optimize descriptions with city + service keywords.' },
      ],
    })

    const full = await prisma.localSEOAccount.findUnique({
      where: { id: account.id },
      include: { locations: true, tasks: true },
    })

    return apiSuccess(full)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/local-seo/accounts' })
    return apiError(e)
  }
}
