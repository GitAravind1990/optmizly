import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { analyseEeat, EEAT_ANALYSED_CHARS } from '@/lib/eeat'
import { consumeDailyIpQuota } from '@/lib/public-rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Analyses per IP per day. Same figure as the public AI Regex tool on purpose — one
 *  number to explain across every free tool, rather than a table nobody reads. */
const DAILY_LIMIT = 5

/** Ceiling on what will be accepted at all. Well above what the model reads
 *  (EEAT_ANALYSED_CHARS), because rejecting a pasted article outright is a worse
 *  experience than analysing its opening — which the page states plainly. */
const MAX_PUBLIC_CHARS = 20_000

/**
 * E-E-A-T scoring without an account.
 *
 * Same engine as the signed-in tool at /api/eeat — one shared module, so the free result
 * is the real result rather than a weaker imitation. What differs is the door: no account,
 * a per-IP daily allowance, and nothing stored afterwards.
 */
export async function POST(req: NextRequest) {
  // Set once a unit is taken, cleared once the analysis is actually in hand. While it is
  // set, any throw means the visitor paid for a result they never received, so the catch
  // hands the unit back. With five a day, two failed attempts would otherwise burn nearly
  // half a visitor's allowance before they had seen the tool work at all.
  let refundQuota: (() => Promise<void>) | undefined

  try {
    const body = (await req.json().catch(() => ({}))) as { content?: string; summary?: string }

    const content = typeof body.content === 'string' ? body.content : ''
    if (!content.trim()) throw new AuthError(400, 'Paste some content to analyse.')
    if (content.length > MAX_PUBLIC_CHARS) {
      throw new AuthError(
        413,
        `Free version takes up to ${MAX_PUBLIC_CHARS.toLocaleString()} characters. Sign up to analyse longer pages.`
      )
    }

    const quota = await consumeDailyIpQuota(req, 'eeat', DAILY_LIMIT)
    if (quota.unavailable) {
      // No limiter means no way to bound spend on an open endpoint. Refuse rather than
      // leave an unmetered model call exposed to the internet.
      throw new AuthError(503, 'The free tool is unavailable right now. Please try again shortly.')
    }
    if (!quota.allowed) {
      throw new AuthError(
        429,
        `That's ${DAILY_LIMIT} analyses today — the free limit. It resets tomorrow, or sign up to keep going.`
      )
    }
    refundQuota = quota.refund

    // No token-tracking wrapper: there is no account to attribute spend to. The daily IP
    // cap is what bounds cost here.
    const result = await analyseEeat(content, body.summary)
    refundQuota = undefined

    return apiSuccess({
      data: {
        ...result,
        remaining: quota.remaining,
        dailyLimit: DAILY_LIMIT,
        // Echoed so the UI can state what was actually read rather than implying the
        // whole paste was scored.
        analysedChars: Math.min(content.length, EEAT_ANALYSED_CHARS),
        submittedChars: content.length,
      },
    })
  } catch (e) {
    await refundQuota?.()
    await captureServerException(null, e, { route: '/api/public/eeat' })
    return apiError(e)
  }
}
