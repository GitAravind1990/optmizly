import { NextRequest } from 'next/server'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { fetchPSIMetrics, applyPSIOverrides } from '@/lib/seo-audit/psi'
import { computeAuditScores, type CheckStatus } from '@/lib/seo-audit/framework'
import type { AutoCheckResult } from '@/lib/seo-audit/auto-checks'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
/**
 * Real Core Web Vitals for an audit that is already stored, split out of ../analyze.
 *
 * fetchPSIMetrics allows 45s on its own. Inside the analyze POST that forced maxDuration 90,
 * and a signed-in POST that long can be rejected by Clerk after the handler has finished —
 * charging a unit for a response that says "Not authenticated". Alone in its own request it
 * has the whole budget to itself.
 *
 * Not charged. The unit was taken by ../analyze, which is the request that produced the audit
 * the user keeps; this only enriches that record, so charging again for one click would be
 * double billing. requireToolAccess still enforces the tier, and the row is matched on
 * userId so one account cannot enrich another's audit.
 */
export const maxDuration = 60

const parse = <T,>(s: string | null, fallback: T): T => {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('seo-audit')
    clerkId = user.clerkId

    const { auditId } = (await req.json().catch(() => ({}))) as { auditId?: unknown }
    if (!auditId || typeof auditId !== 'string') throw new AuthError(400, 'auditId is required')

    // Scoped to the caller, so an audit id belonging to someone else is a 404 rather than a
    // read of their data.
    const audit = await prisma.seoAudit.findFirst({
      where: { id: auditId, userId: user.userId },
    })
    if (!audit) throw new AuthError(404, 'Audit not found')

    const metrics = await fetchPSIMetrics(audit.url)
    if (!metrics) {
      // PSI is best-effort and always has been: an unreachable or rate-limited PSI leaves the
      // regex-derived CWV checks standing rather than failing the audit. Reported so the
      // client can stop waiting and say so, instead of showing a spinner that never resolves.
      return apiSuccess({ data: { applied: false } })
    }

    const autoResults = parse<Record<string, AutoCheckResult>>(audit.autoResults, {})
    const aiResults = parse<Record<string, { score: number }>>(audit.aiResults, {})
    const checklistState = parse<Record<string, CheckStatus>>(audit.checklistState, {})

    applyPSIOverrides(autoResults, metrics)

    // Same shared recompute the PATCH path uses, so a PSI-enriched audit and a
    // manually-rechecked one can never drift to different scoring rules.
    const { categoryScores, overallScore, passedChecks, failedChecks, warnChecks } =
      computeAuditScores({ autoResults, aiResults, checklistState })

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        autoResults: JSON.stringify(autoResults),
        categoryScores: JSON.stringify(categoryScores),
        overallScore,
        passedChecks,
        failedChecks,
        warnChecks,
      },
    })

    return apiSuccess({
      data: {
        applied: true,
        autoResults,
        categoryScores,
        overallScore,
        passedChecks,
        failedChecks,
        warnChecks,
      },
    })
  } catch (e) {
    // Nothing charged here, so nothing to refund. The unit belongs to ../analyze.
    await captureServerException(clerkId, e, { route: '/api/tools/seo-audit/analyze/psi' })
    return apiError(e)
  }
}
