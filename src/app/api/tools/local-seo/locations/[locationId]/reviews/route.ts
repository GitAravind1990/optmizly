import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== 'AGENCY') throw new AuthError(403, 'AGENCY plan required')
  return user
}

// Generate AI response for a review
export async function POST(req: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const user = await getAgencyUser()
    const { locationId } = await params
    const { reviewId, action } = await req.json()

    const location = await prisma.localSEOLocation.findUnique({
      where: { id: locationId },
      include: { account: true },
    })
    if (!location || location.account.userId !== user.id) throw new AuthError(404, 'Location not found')

    if (action === 'generate-response') {
      const review = await prisma.localReview.findUnique({ where: { id: reviewId } })
      if (!review || review.locationId !== locationId) throw new AuthError(404, 'Review not found')

      const system = `You are a professional business owner responding to customer reviews for ${location.name} in ${location.city}, ${location.state}. Write professional, empathetic responses. Return ONLY the response text, no quotes, no explanation.`

      const prompt = `Review (${review.rating}/5 stars) from ${review.author ?? 'a customer'}:
"${review.reviewText}"

Write a 2-3 sentence response:
- 4-5 stars: thank them warmly and invite them back
- 3 stars: acknowledge feedback and show commitment to improvement
- 1-2 stars: apologize sincerely, take responsibility, offer to resolve offline`

      const responseText = await callClaude(system, prompt, 300)

      await prisma.localReview.update({
        where: { id: reviewId },
        data: { responded: true, responseText: responseText.trim() },
      })

      return apiSuccess({ responseText: responseText.trim() })
    }

    if (action === 'flag') {
      await prisma.localReview.update({
        where: { id: reviewId },
        data: { flaggedAsNegative: true },
      })
      return apiSuccess({ success: true })
    }

    throw new AuthError(400, 'Unknown action')
  } catch (e) {
    return apiError(e)
  }
}
