import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { auditReadiness, ReadinessFetchError } from '@/lib/ai-readiness'
import { consumeDailyIpQuota } from '@/lib/public-rate-limit'

export const runtime = 'nodejs'

/** Page fetch is capped at 8s and the two side files at 4s each, running in parallel, so a
 *  worst case is ~13s. 30 leaves room without letting a hung socket hold a lambda open. */
export const maxDuration = 30

/** Audits per IP per day. Same figure as the public E-E-A-T and AI Regex tools on purpose —
 *  one number to explain across every free tool, rather than a table nobody reads. */
const DAILY_LIMIT = 5

/** Long enough for any real URL, short enough that nothing pathological reaches the parser. */
const MAX_URL_CHARS = 2_048

/**
 * Accepts what people actually type. "optmizly.com" is a URL to everyone except URL().
 *
 * Only http(s) survives — anything else is rejected here rather than left for the SSRF
 * guard, so the visitor gets a sentence they can act on instead of a generic failure.
 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new AuthError(400, 'Enter a website address to audit.')
  if (trimmed.length > MAX_URL_CHARS) throw new AuthError(400, 'That address is too long.')

  // A scheme we cannot audit has to be caught before the https:// is prepended, or
  // "ftp://example.com" becomes "https://ftp://example.com" and gets refused for the wrong
  // reason — a hostname of "ftp" — with a message that does not explain anything.
  // The `//` is required in the match: without it "example.com:8080" reads as a scheme
  // called "example.com" and a host:port gets refused as an unsupported protocol.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new AuthError(400, 'Only http and https addresses can be audited.')
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    throw new AuthError(400, 'That does not look like a website address. Try example.com.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AuthError(400, 'Only http and https addresses can be audited.')
  }
  // A hostname with no dot is either localhost or a typo, and neither is auditable.
  if (!parsed.hostname.includes('.')) {
    throw new AuthError(400, 'That does not look like a public website address.')
  }

  return parsed.toString()
}

/**
 * The free AI Search Readiness audit — no account, no card, nothing stored.
 *
 * Deliberately cheap to serve: every check is deterministic parsing of pages we fetch
 * ourselves, so there is no model call and no data vendor behind this endpoint. The daily
 * IP cap exists to bound bandwidth and stop the endpoint being used as a proxy, not to
 * ration an expensive resource.
 *
 * Nothing is written to the database. The report is returned and forgotten.
 */
export async function POST(req: NextRequest) {
  // Set once a unit is taken, cleared once the report is in hand. While it is set, any
  // throw means the visitor spent an audit and got nothing back, so the catch returns it.
  let refundQuota: (() => Promise<void>) | undefined

  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string }
    const url = normalizeUrl(typeof body.url === 'string' ? body.url : '')

    const quota = await consumeDailyIpQuota(req, 'ai-readiness', DAILY_LIMIT)
    if (quota.unavailable) {
      // No limiter means no way to bound an endpoint that makes outbound requests on
      // anyone's behalf. Refuse rather than leave that open.
      throw new AuthError(503, 'The free audit is unavailable right now. Please try again shortly.')
    }
    if (!quota.allowed) {
      throw new AuthError(
        429,
        `That's ${DAILY_LIMIT} audits today — the free limit. It resets tomorrow, or sign up to keep going.`
      )
    }
    refundQuota = quota.refund

    const report = await auditReadiness(url)
    refundQuota = undefined

    return apiSuccess({
      data: { ...report, remaining: quota.remaining, dailyLimit: DAILY_LIMIT },
    })
  } catch (e) {
    // A page we could not load is the visitor's most likely failure and is not their fault
    // in a way that should cost them an audit — the refund above covers it, and 422 says
    // "we understood you, the target did not answer" rather than blaming the request.
    if (refundQuota) await refundQuota()

    if (e instanceof ReadinessFetchError) {
      await captureServerException(null, e, { route: '/api/public/ai-readiness', kind: 'fetch' })
      return apiError(new AuthError(422, e.message))
    }

    await captureServerException(null, e, { route: '/api/public/ai-readiness' })
    return apiError(e)
  }
}
