import { NextRequest } from 'next/server'
import { Plan } from '@prisma/client'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { consumeDailyUsage } from '@/lib/daily-usage'
import { generateOutreach } from '@/lib/client-finder-outreach'
import type { SEOFinding, Severity } from '@/lib/homepage-seo-check'

export const runtime = 'nodejs'

/** One model call. Nothing else happens here - no fetching, no Places, no scoring. */
export const maxDuration = 60

/**
 * Counted separately from searches.
 *
 * Sharing the search counter would mean drafting an email cost the same as discovering ten
 * businesses, which is neither true nor comprehensible to the person watching the number.
 * Agency-only, so FREE and PRO are unreachable - requireToolAccess refuses them first.
 */
const OUTREACH_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 0,
  STARTER: 0,
  PRO: 0,
  AGENCY: 200,
  // Drafting is LLM-only, so this bounds a runaway script rather than a vendor bill.
  AGENCY_PLUS: 400,
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

/**
 * The findings arrive from the client rather than being recomputed here.
 *
 * That is a deliberate trade: re-deriving them would mean fetching the prospect's homepage
 * a second time, for data the browser already holds from the search. The exposure is
 * limited - an authenticated Agency user could hand-craft findings to steer a draft, but
 * they could equally write the email themselves, so nothing is gained by the effort.
 *
 * What matters is that the shape is enforced before any of it reaches a prompt: unknown
 * severities rejected, every string length-capped, the list truncated. An uncapped
 * description field would be an open channel into the model.
 */
function sanitizeFindings(v: unknown): SEOFinding[] {
  if (!Array.isArray(v)) return []
  const out: SEOFinding[] = []
  for (const item of v.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const f = item as Record<string, unknown>
    if (typeof f.title !== 'string' || typeof f.description !== 'string') continue
    if (typeof f.severity !== 'string' || !SEVERITIES.includes(f.severity as Severity)) continue
    out.push({
      category: typeof f.category === 'string' ? f.category.slice(0, 60) : 'General',
      severity: f.severity as Severity,
      title: f.title.slice(0, 120),
      description: f.description.slice(0, 400),
      recommendation: typeof f.recommendation === 'string' ? f.recommendation.slice(0, 400) : '',
    })
  }
  return out
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const { businessName, location, findings, agencyName, senderName } = await req.json()
    if (typeof businessName !== 'string' || !businessName.trim()) {
      throw new AuthError(400, 'Business name is required')
    }

    const clean = sanitizeFindings(findings)
    if (clean.length === 0) {
      throw new AuthError(400, 'No findings to write about. Run a search first.')
    }

    const limit = OUTREACH_DAILY_LIMITS[user.plan]
    const usage = await consumeDailyUsage(user.userId, 'client-finder-outreach', limit)
    if (usage.exceeded) {
      throw new AuthError(429, `Daily limit of ${limit} outreach drafts reached. It resets tomorrow.`)
    }

    const email = await generateOutreach({
      businessName: businessName.trim().slice(0, 120),
      location: typeof location === 'string' ? location.trim().slice(0, 160) : undefined,
      findings: clean,
      agencyName: typeof agencyName === 'string' ? agencyName.trim().slice(0, 80) : undefined,
      senderName: typeof senderName === 'string' ? senderName.trim().slice(0, 80) : undefined,
    })

    if (!email) {
      // Distinct from a server error: the draft was attempted and rejected, either because
      // it came back malformed or because it promised an outcome. Retrying is reasonable.
      throw new AuthError(502, 'Could not draft a usable email for this prospect. Please try again.')
    }

    return apiSuccess({ ...email, usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder/outreach' })
    return apiError(e)
  }
}
