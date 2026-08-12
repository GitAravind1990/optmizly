import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { captureServerException } from '@/lib/posthog-server'
import { safeMatch, validatePattern, UnsafePatternError, MAX_INPUT_BYTES } from '@/lib/regex-safety'

export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * Apply a pattern the user already has. No model call, and no daily-cap consumption.
 *
 * Iterating on a pattern is the main thing people do with a tool like this — tweak a
 * word boundary, flip the negation, re-run. Charging a generation for that would make
 * the free tier feel punitive and would spend provider tokens on a job that needs no
 * model at all. The expensive layer is generation; matching is a local regex scan.
 *
 * Still authenticated, still validated, still capped on input size: the pattern arrives
 * from the client and is therefore untrusted regardless of where it originally came from.
 */
export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const { userId: authedClerkId } = await auth()
    if (!authedClerkId) throw new AuthError(401, 'Not authenticated')
    clerkId = authedClerkId
    await getOrCreateUser(authedClerkId)

    const body = await req.json().catch(() => ({})) as {
      pattern?: string
      flags?: string
      data?: string
      negate?: boolean
    }

    const pattern = typeof body.pattern === 'string' ? body.pattern.trim() : ''
    const data = typeof body.data === 'string' ? body.data : ''

    if (!pattern) throw new AuthError(400, 'No pattern provided.')
    if (!data.trim()) throw new AuthError(400, 'No data to match against.')
    if (data.length > MAX_INPUT_BYTES) {
      throw new AuthError(413, `That is too much data at once. The limit is ${Math.floor(MAX_INPUT_BYTES / 1000)}KB.`)
    }

    // Validated before running so an edited pattern gets the same explanation of *why*
    // it was refused — the lookahead message in particular, which is the edit a user is
    // most likely to make by hand after seeing a generated pattern.
    const check = validatePattern(pattern)
    if (!check.safe) throw new AuthError(422, check.reason ?? 'That pattern cannot be run.')

    const match = safeMatch(pattern, body.flags, data, { negate: body.negate === true })

    return apiSuccess({
      data: {
        pattern,
        flags: body.flags ?? '',
        negate: body.negate === true,
        matches: match.matches,
        matchCount: match.matchCount,
        totalLines: match.totalLines,
        sampleMatches: match.sampleMatches,
        timedOut: match.timedOut,
        truncated: match.truncated,
      },
    })
  } catch (e) {
    if (e instanceof UnsafePatternError) {
      return apiError(new AuthError(422, e.message))
    }
    await captureServerException(clerkId, e, { route: '/api/tools/ai-regex/match' })
    return apiError(e)
  }
}
