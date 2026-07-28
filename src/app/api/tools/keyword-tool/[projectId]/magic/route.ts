import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError, requireAuth } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { getAllInTitleCount } from '@/lib/dataforseo'

export const runtime = 'nodejs'
export const maxDuration = 60

/** "Find Magic Keywords" — checks every keyword in this list that hasn't had an
 *  Opportunity Ratio computed yet, with no volume ceiling (unlike the automatic
 *  <1,000/mo check that already ran at research time). On-demand and billed as
 *  another analysis, since it can fire up to ~25 extra DataForSEO SERP calls. */
export async function POST(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('keyword-tool')
    clerkId = user.clerkId
    const { projectId } = await params

    const project = await prisma.keywordListProject.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.userId) throw new AuthError(404, 'List not found')

    const uncheckedKeywords = await prisma.keywordResearchResult.findMany({
      where: { projectId, opportunityRatio: null, searchVolume: { gt: 0 } },
    })

    const updates = await Promise.all(
      uncheckedKeywords.map(async kw => {
        const count = await getAllInTitleCount(kw.keyword, project.targetLocation).catch(() => null)
        if (count === null || !kw.searchVolume) return null
        const ratio = Math.round((count / kw.searchVolume) * 100) / 100
        return prisma.keywordResearchResult.update({ where: { id: kw.id }, data: { opportunityRatio: ratio } })
      })
    )

    return apiSuccess({ data: { checked: updates.filter(Boolean).length } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/keyword-tool/[projectId]/magic' })
    return apiError(e)
  }
}
