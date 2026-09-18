import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { authorise } from '@/lib/ai-presence/service'
import { toHost } from '@/lib/ai-presence/derive'

export const runtime = 'nodejs'

/**
 * Marking and unmarking competitors.
 *
 * The one place AI Presence stores a judgement rather than an observation, which is why it
 * is the only write endpoint in the feature. Everything else is derived from scans.
 *
 * Validation exits throw `AuthError` rather than returning early, per the repository rule:
 * a bare `return apiError(new Error(...))` matches none of apiError's branches and becomes a
 * 500 with the message thrown away, which previously had routes reporting "City is required"
 * as an internal server error.
 */

export async function POST(req: NextRequest) {
  try {
    const user = await authorise()
    const body = await req.json().catch(() => ({}))

    const brand = typeof body.brand === 'string' ? body.brand.trim() : ''
    if (!brand) throw new AuthError(400, 'brand is required.')

    const host = toHost(typeof body.competitorDomain === 'string' ? body.competitorDomain : null)
    if (!host || !host.includes('.')) {
      throw new AuthError(400, 'A valid competitor domain is required.')
    }

    // Scoped to this user's own runs: you may only mark a competitor against a brand you
    // have actually scanned, so a crafted brand string cannot create rows against someone
    // else's data or accumulate junk against brands that do not exist.
    const owns = await prisma.aiVisibilityRun.findFirst({
      where: { userId: user.userId, brand },
      select: { id: true },
    })
    if (!owns) throw new AuthError(404, 'No AI visibility scans for that brand.')

    const record = await prisma.aiPresenceCompetitor.upsert({
      where: { userId_brand_competitorDomain: { userId: user.userId, brand, competitorDomain: host } },
      create: { userId: user.userId, brand, competitorDomain: host },
      update: {},
    })

    return apiSuccess({
      competitor: { brand: record.brand, domain: record.competitorDomain },
      note: 'Citation gaps and opportunities for this brand now include this domain.',
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authorise()
    const { searchParams } = new URL(req.url)
    const brand = (searchParams.get('brand') ?? '').trim()
    const host = toHost(searchParams.get('domain'))
    if (!brand || !host) throw new AuthError(400, 'brand and domain are required.')

    // deleteMany rather than delete: scoped by userId so it cannot touch another account's
    // row, and a no-op when the mark is already gone rather than a 500.
    const { count } = await prisma.aiPresenceCompetitor.deleteMany({
      where: { userId: user.userId, brand, competitorDomain: host },
    })

    return apiSuccess({ removed: count, domain: host })
  } catch (e) {
    return apiError(e)
  }
}
