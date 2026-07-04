import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { ALL_CHECKS, AUTO_CHECK_IDS, type CheckStatus } from '@/lib/seo-audit/framework'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

async function getUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  return user
}

function parse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

// GET /api/tools/seo-audit         → list summaries
// GET /api/tools/seo-audit?id=xxx  → full audit
export async function GET(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const id = req.nextUrl.searchParams.get('id')

    if (id) {
      const a = await prisma.seoAudit.findFirst({ where: { id, userId: user.id } })
      if (!a) throw new AuthError(404, 'Audit not found')
      return apiSuccess({
        data: {
          id: a.id,
          url: a.url,
          pageTitle: a.pageTitle,
          overallScore: a.overallScore,
          totalChecks: a.totalChecks,
          passedChecks: a.passedChecks,
          failedChecks: a.failedChecks,
          warnChecks: a.warnChecks,
          categoryScores: parse<Record<string, number>>(a.categoryScores, {}),
          autoResults: parse<Record<string, { status: CheckStatus; detail: string }>>(a.autoResults, {}),
          aiResults: parse<Record<string, { score: number; issues: string[]; fixes: string[] }>>(a.aiResults, {}),
          checklistState: parse<Record<string, CheckStatus>>(a.checklistState, {}),
          backlinkData: parse<{ oprScore: number | null; domainRank: number | null }>(a.backlinkData ?? '{}', { oprScore: null, domainRank: null }),
          createdAt: a.createdAt,
        },
      })
    }

    const audits = await prisma.seoAudit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, url: true, pageTitle: true, overallScore: true,
        totalChecks: true, passedChecks: true, failedChecks: true, warnChecks: true, createdAt: true,
      },
    })
    return apiSuccess({ data: audits })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/seo-audit' })
    return apiError(e)
  }
}

// PATCH /api/tools/seo-audit  → toggle a manual checklist item
// body: { auditId, checkId, status: 'pass'|'fail'|'na'|null }
export async function PATCH(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const { auditId, checkId, status } = await req.json()
    if (!auditId || !checkId) throw new AuthError(400, 'auditId and checkId are required')

    const audit = await prisma.seoAudit.findFirst({ where: { id: auditId, userId: user.id } })
    if (!audit) throw new AuthError(404, 'Audit not found')

    const state = parse<Record<string, CheckStatus>>(audit.checklistState, {})
    if (status === null || status === undefined) delete state[checkId]
    else state[checkId] = status as CheckStatus

    // Recompute combined counts: auto results + manual checklist (manual wins for non-auto checks)
    const auto = parse<Record<string, { status: CheckStatus }>>(audit.autoResults, {})
    let passed = 0, failed = 0, warn = 0
    for (const check of ALL_CHECKS) {
      const manual = state[check.id]
      const effective: CheckStatus | undefined =
        AUTO_CHECK_IDS.has(check.id) && auto[check.id] ? auto[check.id].status : manual
      if (effective === 'pass') passed++
      else if (effective === 'fail') failed++
      else if (effective === 'warn') warn++
    }

    const updated = await prisma.seoAudit.update({
      where: { id: auditId },
      data: { checklistState: JSON.stringify(state), passedChecks: passed, failedChecks: failed, warnChecks: warn },
    })

    return apiSuccess({
      data: {
        checklistState: state,
        passedChecks: updated.passedChecks,
        failedChecks: updated.failedChecks,
        warnChecks: updated.warnChecks,
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/seo-audit' })
    return apiError(e)
  }
}

// DELETE /api/tools/seo-audit?id=xxx
export async function DELETE(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getUser()
    clerkId = user.clerkId
    const id = req.nextUrl.searchParams.get('id')
    if (!id) throw new AuthError(400, 'id is required')
    await prisma.seoAudit.deleteMany({ where: { id, userId: user.id } })
    return apiSuccess({ data: { deleted: true } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/seo-audit' })
    return apiError(e)
  }
}
