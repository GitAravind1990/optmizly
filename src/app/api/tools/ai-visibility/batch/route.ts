import { NextRequest } from 'next/server'
import { requireToolAccess, assertQuotaAvailable, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { consumeDailyUsage, refundDailyUsage } from '@/lib/daily-usage'
import { runPrompt, type PromptOutcome } from '@/lib/ai-visibility'
import { isDataForSEOConfigured } from '@/lib/dataforseo'

export const runtime = 'nodejs'
/**
 * Step 2 of 3: ask the engines about a few prompts at a time.
 *
 * Batched because a 25-prompt run is 50 live vendor calls, which no single signed-in POST can
 * hold — Clerk's session token expires 61s after minting, a POST cannot be refreshed, and the
 * rejection can land after the work is done. Five prompts is ten concurrent calls, measured at
 * well inside a minute.
 *
 * Unbilled, like content-optimizer's per-section route: the monthly unit is taken by the final
 * store, so an abandoned run costs the user nothing.
 */
export const maxDuration = 60

/** Ten concurrent vendor calls per request. Raising this trades the safety margin. */
const MAX_PROMPTS_PER_BATCH = 5

/**
 * Because this route spends real money without charging a unit, tier and monthly quota are not
 * enough on their own: a client that never calls the store step could run batches indefinitely.
 * A daily batch cap bounds that independently of billing. 40 batches is 200 prompts, about
 * $1.50 of vendor spend, which is a ceiling rather than an expectation — a normal run is five
 * batches once a month.
 */
const MAX_BATCHES_PER_DAY = 40

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  let dailyTaken: string | null = null
  try {
    const user = await requireToolAccess('ai-visibility')
    clerkId = user.clerkId
    await assertQuotaAvailable(user, 'ai-visibility')

    if (!isDataForSEOConfigured()) {
      throw new AuthError(503, 'AI visibility is temporarily unavailable. Nothing was charged — please try again later.')
    }

    const body = (await req.json().catch(() => ({}))) as {
      brand?: unknown
      domain?: unknown
      aliases?: unknown
      prompts?: unknown
    }

    const brand = typeof body.brand === 'string' ? body.brand.trim().slice(0, 120) : ''
    if (!brand) throw new AuthError(400, 'A brand name is required')

    const prompts = Array.isArray(body.prompts)
      ? body.prompts.filter((p): p is string => typeof p === 'string' && p.trim().length > 2)
          .map(p => p.trim().slice(0, 200))
      : []
    if (!prompts.length) throw new AuthError(400, 'No prompts to run')
    if (prompts.length > MAX_PROMPTS_PER_BATCH) {
      throw new AuthError(400, `Send at most ${MAX_PROMPTS_PER_BATCH} prompts per request`)
    }

    const domain = typeof body.domain === 'string' ? body.domain.trim().slice(0, 253) : null
    const aliases = Array.isArray(body.aliases)
      ? body.aliases.filter((a): a is string => typeof a === 'string').map(a => a.trim().slice(0, 120)).slice(0, 5)
      : []

    const daily = await consumeDailyUsage(user.userId, 'ai-visibility-batch', MAX_BATCHES_PER_DAY)
    dailyTaken = user.userId
    if (daily.exceeded) {
      throw new AuthError(429, `That is the daily limit for AI visibility lookups (${MAX_BATCHES_PER_DAY} batches). It resets tomorrow.`)
    }

    // Prompts run concurrently, and each prompt already runs its two surfaces concurrently.
    // Failures are per-prompt and reported, never thrown: one unreachable lookup must not
    // discard four that succeeded, and "we could not look" is a different finding from
    // "the engine showed no AI answer".
    const outcomes: PromptOutcome[] = await Promise.all(
      prompts.map(p => runPrompt(p, brand, domain, aliases).catch(() => ({
        prompt: p,
        aiOverview: null,
        aiMode: null,
      })))
    )

    dailyTaken = null
    return apiSuccess({ data: { outcomes, dailyRemaining: daily.remaining } })
  } catch (e) {
    // The daily allowance is returned when the batch produced nothing, so a failed lookup does
    // not quietly consume part of tomorrow's ceiling. The monthly unit is untouched here.
    if (dailyTaken) await refundDailyUsage(dailyTaken, 'ai-visibility-batch')

    await captureServerException(clerkId, e, { route: '/api/tools/ai-visibility/batch' })
    return apiError(e)
  }
}
