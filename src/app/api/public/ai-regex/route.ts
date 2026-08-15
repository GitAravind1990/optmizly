import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { generateRegex, type RegexDataType } from '@/lib/ai-regex'
import { safeMatch, validatePattern, UnsafePatternError } from '@/lib/regex-safety'
import { consumeDailyIpQuota } from '@/lib/public-rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Generations per IP per day. Enough to solve a real problem and decide the product is
 *  worth signing up for; not enough to run a workload through the free door. */
const DAILY_LIMIT = 5

/** Far below the signed-in tool's 500KB. A public endpoint has no account behind it, so
 *  the ceiling is set by what a person plausibly pastes to try something out. */
const MAX_PUBLIC_BYTES = 50_000
const MAX_PUBLIC_LINES = 2_000

const VALID_TYPES: RegexDataType[] = ['gsc_queries', 'keywords', 'page_content', 'generic']

/**
 * AI Regex without an account.
 *
 * Exists to be linked to and shared: the pattern is inspectable, the matching is
 * deterministic, and nothing about it requires trusting us. The signed-in version at
 * /api/tools/ai-regex is the same two layers with a bigger input ceiling.
 *
 * Two paths, and only one costs money. Sending `pattern` re-runs an existing regex —
 * pure local computation, no model call, so it does not consume the daily allowance.
 * Sending `description` generates a new pattern and does.
 */
export async function POST(req: NextRequest) {
  // Set once a unit has been taken, and cleared again the moment a pattern comes back.
  // While it is set, a throw means the visitor paid for a pattern they never received,
  // so the catch hands the unit back. Once generation has succeeded the model call has
  // been made and the cost is real, so a later failure is not refunded.
  let refundQuota: (() => Promise<void>) | undefined

  try {
    const body = await req.json().catch(() => ({})) as {
      description?: string
      pattern?: string
      flags?: string
      negate?: boolean
      data?: string
      dataType?: string
    }

    const data = typeof body.data === 'string' ? body.data : ''
    if (!data.trim()) throw new AuthError(400, 'Paste some data to match against.')
    if (data.length > MAX_PUBLIC_BYTES) {
      throw new AuthError(413, `Free version takes up to ${MAX_PUBLIC_BYTES / 1000}KB. Sign up to run larger sets.`)
    }
    if (data.split(/\r?\n/).length > MAX_PUBLIC_LINES) {
      throw new AuthError(413, `Free version takes up to ${MAX_PUBLIC_LINES.toLocaleString()} lines. Sign up to run larger sets.`)
    }

    // Re-running an edited pattern is free, exactly as it is for signed-in users:
    // iterating is the point of the tool, and matching needs no model.
    if (typeof body.pattern === 'string' && body.pattern.trim()) {
      const check = validatePattern(body.pattern.trim())
      if (!check.safe) throw new AuthError(422, check.reason ?? 'That pattern cannot be run.')
      const m = safeMatch(body.pattern.trim(), body.flags, data, { negate: body.negate === true })
      return apiSuccess({
        data: {
          pattern: body.pattern.trim(),
          flags: body.flags ?? '',
          negate: body.negate === true,
          matches: m.matches,
          matchCount: m.matchCount,
          totalLines: m.totalLines,
          sampleMatches: m.sampleMatches,
          timedOut: m.timedOut,
          truncated: m.truncated,
        },
      })
    }

    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!description) throw new AuthError(400, 'Describe what you want to match.')

    const quota = await consumeDailyIpQuota(req, 'ai-regex', DAILY_LIMIT)
    if (quota.unavailable) {
      // No limiter means no way to bound spend on an open endpoint. Refuse rather than
      // leave an unmetered model call exposed to the internet.
      throw new AuthError(503, 'The free tool is unavailable right now. Please try again shortly.')
    }
    if (!quota.allowed) {
      throw new AuthError(429, `That's ${DAILY_LIMIT} patterns today — the free limit. It resets tomorrow, or sign up to keep going. Editing and re-running a pattern is always free.`)
    }
    refundQuota = quota.refund

    const dataType: RegexDataType = VALID_TYPES.includes(body.dataType as RegexDataType)
      ? (body.dataType as RegexDataType)
      : 'generic'

    // No token tracking wrapper: there is no user to attribute spend to. The daily IP
    // cap is what bounds cost here.
    const generated = await generateRegex(description, dataType, data)
    if (!generated.ok) throw new AuthError(422, generated.error)
    refundQuota = undefined

    const { pattern, flags, negate, explanation, exampleMatches } = generated.result
    const m = safeMatch(pattern, flags, data, { negate })

    return apiSuccess({
      data: {
        pattern, flags, negate, explanation, exampleMatches,
        matches: m.matches,
        matchCount: m.matchCount,
        totalLines: m.totalLines,
        sampleMatches: m.sampleMatches,
        timedOut: m.timedOut,
        truncated: m.truncated,
        remaining: quota.remaining,
        dailyLimit: DAILY_LIMIT,
      },
    })
  } catch (e) {
    await refundQuota?.()
    if (e instanceof UnsafePatternError) return apiError(new AuthError(422, e.message))
    await captureServerException(null, e, { route: '/api/public/ai-regex' })
    return apiError(e)
  }
}
