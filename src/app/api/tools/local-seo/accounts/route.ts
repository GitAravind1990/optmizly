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

function mockLocationStats(name: string, city: string) {
  const seed = hash(name + city)
  return {
    averageRating: parseFloat((3.5 + (seed % 14) / 10).toFixed(1)),
    reviewCount: 5 + (seed % 96),
    pageViews: 200 + (seed % 2800),
    calls: 10 + (seed % 90),
    directions: 5 + (seed % 45),
    citationScore: 50 + (seed % 46),
  }
}

const CITATION_SOURCES = [
  'Google Business Profile', 'Yelp', 'Facebook', 'Bing Places', 'Apple Maps',
  'Yellow Pages', 'BBB', 'Foursquare', 'Angi', 'HomeAdvisor',
]

const REVIEW_TEMPLATES = [
  { rating: 5, text: 'Absolutely fantastic service! The team was professional and went above and beyond.' },
  { rating: 5, text: 'Best experience I\'ve had. Highly recommend to anyone looking for quality work.' },
  { rating: 4, text: 'Great service overall. Very happy with the results. Will definitely use again.' },
  { rating: 4, text: 'Really pleased with the work. Team was friendly and professional.' },
  { rating: 3, text: 'Decent service but took longer than expected. Final result was good though.' },
  { rating: 2, text: 'Had some issues with communication but they were eventually resolved.' },
  { rating: 1, text: 'Very disappointed with the service. Did not meet expectations at all.' },
]

const LOCAL_KEYWORDS = [
  'near me', 'best', 'top rated', 'affordable', 'local', '24 hour', 'same day', 'emergency',
]

export async function GET() {
  try {
    const user = await getAgencyUser()
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
    return apiSuccess(accounts)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAgencyUser()
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

    for (const loc of locations) {
      if (!loc.name || !loc.address || !loc.city || !loc.state || !loc.phone) continue

      const stats = mockLocationStats(loc.name, loc.city)
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
          ...stats,
        },
      })

      // Seed keywords
      await prisma.localKeywordRank.createMany({
        data: kwList.map(kw => {
          const kwSeed = hash(loc.name + kw)
          const rank = kwSeed % 5 === 0 ? null : (kwSeed % 49) + 1
          return {
            locationId: location.id,
            keyword: kw,
            currentRank: rank,
            previousRank: rank !== null ? Math.max(1, rank + (kwSeed % 7) - 3) : null,
            rankChange7d: rank !== null ? (kwSeed % 7) - 3 : null,
            rankChange30d: rank !== null ? (kwSeed % 15) - 7 : null,
            searchVolume: [100, 250, 500, 1000, 2500][kwSeed % 5],
            difficulty: 20 + (kwSeed % 60),
          }
        }),
      })

      // Seed citations
      const citSources = CITATION_SOURCES.slice(0, 6 + (hash(loc.name) % 4))
      await prisma.localCitation.createMany({
        data: citSources.map(source => {
          const cSeed = hash(loc.name + source)
          const hasIssue = cSeed % 6 === 0
          return {
            accountId: account.id,
            locationId: location.id,
            source,
            sourceUrl: `https://${source.toLowerCase().replace(/\s/g, '')}.com/biz/${loc.name.toLowerCase().replace(/\s/g, '-')}`,
            businessName: hasIssue && cSeed % 12 === 0 ? loc.name + ' LLC' : loc.name,
            businessPhone: hasIssue && cSeed % 8 === 0 ? loc.phone.replace('1', '2') : loc.phone,
            businessAddress: hasIssue && cSeed % 6 === 0 ? loc.address + ' Suite 100' : loc.address,
            nameMatches: !(hasIssue && cSeed % 12 === 0),
            phoneMatches: !(hasIssue && cSeed % 8 === 0),
            addressMatches: !(hasIssue && cSeed % 6 === 0),
            status: hasIssue ? 'inconsistent' : 'verified',
            issueDescription: hasIssue ? 'NAP data does not match primary business listing' : null,
          }
        }),
        skipDuplicates: true,
      })

      // Seed reviews
      const reviewCount = Math.min(stats.reviewCount, 10)
      const reviewData = []
      for (let i = 0; i < reviewCount; i++) {
        const rSeed = hash(loc.name + String(i))
        const template = REVIEW_TEMPLATES[rSeed % REVIEW_TEMPLATES.length]
        const daysAgo = rSeed % 60
        reviewData.push({
          accountId: account.id,
          locationId: location.id,
          source: ['Google', 'Yelp', 'Facebook'][rSeed % 3],
          reviewText: template.text,
          rating: template.rating,
          author: ['John D.', 'Sarah M.', 'Mike R.', 'Emily L.', 'Chris P.'][rSeed % 5],
          responded: rSeed % 3 === 0,
          flaggedAsNegative: template.rating <= 2,
          reviewedDate: new Date(Date.now() - daysAgo * 86400000),
        })
      }
      await prisma.localReview.createMany({ data: reviewData })
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
    return apiError(e)
  }
}
