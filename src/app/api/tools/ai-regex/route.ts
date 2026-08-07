import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { runWithTracking } from '@/lib/anthropic'
import { captureServerException } from '@/lib/posthog-server'
import { generateRegex, type RegexDataType } from '@/lib/ai-regex'
import { safeMatch, UnsafePatternError, MAX_INPUT_BYTES } from '@/lib/regex-safety'
import { AI_REGEX_DAILY_LIMITS, consumeDailyUsage, peekDailyUsage } from '@/lib/daily-usage'

export const runtime = 'nodejs'
export const maxDuration = 30

const TOOL = 'ai-regex'
const VALID_TYPES: RegexDataType[] = ['gsc_queries', 'keywords', 'page_content', 'generic']

/**
 * Generate a pattern from a description, then apply it.
 *
 * Deliberately NOT behind requireAuth: this tool is available on every plan including
 * FREE, and requireAuth would meter it against the monthly analysis allowance, charging
 * a free user's three analyses for a tool meant to be a free entry point. The cap here
 * is a separate daily one.
 *
 * The two layers stay strictly separated. Claude sees the description and at most a few
 * sample lines; it returns a pattern. The pattern is validated, then run by a real
 * engine over the data. The model never sees the full dataset and never decides a match.
 */
export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const { userId: authedClerkId } = await auth()
    if (!authedClerkId) throw new AuthError(401, 'Not authenticated')
    clerkId = authedClerkId

    const user = await getOrCreateUser(authedClerkId)

    const body = await req.json().catch(() => ({})) as {
      description?: string
      data?: string
      dataType?: string
    }

    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const data = typeof body.data === 'string' ? body.data : ''
    const dataType: RegexDataType = VALID_TYPES.includes(body.dataType as RegexDataType)
      ? (body.dataType as RegexDataType)
      : 'generic'

    if (!description) throw new AuthError(400, 'Describe what you want to match.')
    if (!data.trim()) throw new AuthError(400, 'Paste some data to match against.')
    if (data.length > MAX_INPUT_BYTES) {
      throw new AuthError(413, `That is too much data at once. The limit is ${Math.floor(MAX_INPUT_BYTES / 1000)}KB.`)
    }

    const limit = AI_REGEX_DAILY_LIMITS[user.plan]
    const usage = await consumeDailyUsage(user.id, TOOL, limit)
    if (usage.exceeded) {
      throw new AuthError(
        429,
        user.plan === 'FREE'
          ? `You have used all ${limit} free pattern generations today. They reset tomorrow, or upgrade to Pro for ${AI_REGEX_DAILY_LIMITS.PRO} a day.`
          : `Daily limit of ${limit} pattern generations reached. It resets tomorrow.`
      )
    }

    // Only the sample reaches Claude, never the full dataset.
    const generated = await runWithTracking(user.id, () => generateRegex(description, dataType, data))
    if (!generated.ok) throw new AuthError(422, generated.error)

    const { pattern, flags, negate, explanation, exampleMatches } = generated.result

    const match = safeMatch(pattern, flags, data, { negate })

    return apiSuccess({
      data: {
        pattern,
        flags,
        negate,
        explanation,
        // Labelled as the model's illustration, never mixed into real results.
        exampleMatches,
        matches: match.matches,
        matchCount: match.matchCount,
        totalLines: match.totalLines,
        sampleMatches: match.sampleMatches,
        timedOut: match.timedOut,
        truncated: match.truncated,
        usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
      },
    })
  } catch (e) {
    // An unsafe pattern that slipped past generation is a 422, not a 500 — the request
    // was fine, the pattern was not, and the user can rephrase.
    if (e instanceof UnsafePatternError) {
      return apiError(new AuthError(422, e.message))
    }
    await captureServerException(clerkId, e, { route: '/api/tools/ai-regex' })
    return apiError(e)
  }
}

/** Today's remaining generations, so the UI can show the counter before the first run. */
export async function GET() {
  let clerkId: string | null = null
  try {
    const { userId: authedClerkId } = await auth()
    if (!authedClerkId) throw new AuthError(401, 'Not authenticated')
    clerkId = authedClerkId

    const user = await getOrCreateUser(authedClerkId)
    const usage = await peekDailyUsage(user.id, TOOL, AI_REGEX_DAILY_LIMITS[user.plan])

    return apiSuccess({ data: { plan: user.plan, ...usage } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/ai-regex' })
    return apiError(e)
  }
}
