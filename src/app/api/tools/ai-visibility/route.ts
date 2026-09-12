import { NextRequest } from 'next/server'
import { requireAuth, requireToolAccess, refundUsage, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { prisma } from '@/lib/prisma'
import { summariseRun, type PromptOutcome, type SurfaceOutcome } from '@/lib/ai-visibility'

export const runtime = 'nodejs'
/**
 * Step 3 of 3: score the collected batches, store the run, and charge for it.
 *
 * This is the request that produces something the user keeps, so it is the one that takes the
 * unit — a run abandoned during the batches costs nothing. No vendor calls happen here, so it
 * is fast regardless of how many prompts were run.
 */
export const maxDuration = 60

const MAX_PROMPTS = 25

/**
 * The outcomes arrive back through the client, so every field is rebuilt rather than trusted.
 *
 * This matters more than the usual input-validation reason: these numbers become a stored
 * report and the baseline for every future trend. A client that inflated its own mention count
 * would not be cheating a limit, it would be corrupting the customer's own history — so the
 * shape is narrowed, the counts are clamped, and anything unrecognised becomes a failed lookup
 * rather than a zero, because those mean different things.
 */
function capSurface(v: unknown): SurfaceOutcome | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Record<string, unknown>
  if (typeof s.answerPresent !== 'boolean') return null
  return {
    answerPresent: s.answerPresent,
    mentions: typeof s.mentions === 'number' && Number.isFinite(s.mentions)
      ? Math.max(0, Math.min(500, Math.round(s.mentions)))
      : 0,
    cited: s.cited === true,
    citedDomains: Array.isArray(s.citedDomains)
      ? (s.citedDomains.filter(d => typeof d === 'string') as string[])
          .map(d => d.slice(0, 253))
          .slice(0, 30)
      : [],
  }
}

export async function POST(req: NextRequest) {
  let charged: string | null = null
  let clerkId: string | null = null
  try {
    const body = (await req.json().catch(() => ({}))) as {
      brand?: unknown
      domain?: unknown
      aliases?: unknown
      promptSource?: unknown
      outcomes?: unknown
    }

    const brand = typeof body.brand === 'string' ? body.brand.trim().slice(0, 120) : ''
    if (!brand) throw new AuthError(400, 'A brand name is required')

    const rawOutcomes = Array.isArray(body.outcomes) ? body.outcomes : []
    if (!rawOutcomes.length) throw new AuthError(400, 'No results to store')
    if (rawOutcomes.length > MAX_PROMPTS) {
      throw new AuthError(400, `A run holds at most ${MAX_PROMPTS} prompts`)
    }

    const outcomes: PromptOutcome[] = rawOutcomes
      .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
      .map(o => ({
        prompt: typeof o.prompt === 'string' ? o.prompt.trim().slice(0, 200) : '',
        aiOverview: capSurface(o.aiOverview),
        aiMode: capSurface(o.aiMode),
      }))
      .filter(o => o.prompt.length > 0)

    if (!outcomes.length) throw new AuthError(400, 'No usable results to store')

    // Charged here, after validation and before the write, so a malformed payload is refused
    // without taking a unit.
    const user = await requireAuth('ai-visibility')
    clerkId = user.clerkId
    charged = user.userId

    const summary = summariseRun(outcomes)
    const domain = typeof body.domain === 'string' ? body.domain.trim().slice(0, 253) : null
    const aliases = Array.isArray(body.aliases)
      ? (body.aliases.filter(a => typeof a === 'string') as string[]).map(a => a.slice(0, 120)).slice(0, 5)
      : []
    const promptSource = body.promptSource === 'search-console' ? 'search-console' : 'keywords'

    const run = await prisma.aiVisibilityRun.create({
      data: {
        userId: user.userId,
        brand,
        domain,
        aliases: JSON.stringify(aliases),
        promptSource,
        promptCount: outcomes.length,
        totalMentions: summary.totalMentions,
        totalCitations: summary.totalCitations,
        answersFound: summary.totals.aiOverview.answers + summary.totals.aiMode.answers,
        lookupsFailed: summary.totals.aiOverview.failed + summary.totals.aiMode.failed,
        detail: JSON.stringify({ outcomes, topCitedDomains: summary.topCitedDomains }),
      },
      select: { id: true, createdAt: true },
    })

    // The run is saved and openable from here, so a later failure keeps the charge: the user
    // got what they paid for.
    charged = null

    return apiSuccess({
      data: {
        id: run.id,
        createdAt: run.createdAt,
        brand,
        domain,
        promptSource,
        userPlan: user.plan,
        ...summary,
        outcomes,
      },
    })
  } catch (e) {
    if (charged) await refundUsage(charged, 'ai-visibility')

    await captureServerException(clerkId, e, { route: '/api/tools/ai-visibility' })
    return apiError(e)
  }
}

/** Past runs, newest first — the list, and the baseline for a trend. */
export async function GET(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('ai-visibility')
    clerkId = user.clerkId

    const id = new URL(req.url).searchParams.get('id')

    if (id) {
      // Scoped to the caller, so another account's run id is a 404 rather than a read.
      const run = await prisma.aiVisibilityRun.findFirst({ where: { id, userId: user.userId } })
      if (!run) throw new AuthError(404, 'Run not found')
      const detail = JSON.parse(run.detail) as {
        outcomes: PromptOutcome[]
        topCitedDomains: Array<{ domain: string; count: number }>
      }
      return apiSuccess({ data: { ...run, aliases: JSON.parse(run.aliases), ...detail } })
    }

    const runs = await prisma.aiVisibilityRun.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, brand: true, domain: true, promptSource: true, promptCount: true,
        totalMentions: true, totalCitations: true, answersFound: true, lookupsFailed: true,
        createdAt: true,
      },
    })
    return apiSuccess({ data: runs })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/ai-visibility' })
    return apiError(e)
  }
}
