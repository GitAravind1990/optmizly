import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'
import { sendAgencyReportEmail } from '@/lib/email'

export const runtime = 'nodejs'

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== Plan.AGENCY) throw new AuthError(403, 'Agency plan required')
  return user
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function POST(req: NextRequest) {
  try {
    const user = await getAgencyUser()
    const { reportId } = await req.json()
    if (!reportId) throw new AuthError(400, 'reportId is required')

    const report = await prisma.clientReport.findUnique({
      where: { id: reportId },
      include: { client: true },
    })
    if (!report) throw new AuthError(404, 'Report not found')
    if (report.client.agencyId !== user.id) throw new AuthError(403, 'Forbidden')

    const monthName = MONTH_NAMES[report.month - 1]
    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Optmizly.com'}/agency/reports/${report.id}`

    await sendAgencyReportEmail(report.client.email, {
      clientName: report.client.name,
      website: report.client.website,
      monthName,
      year: report.year,
      reportUrl,
      trafficChange: report.trafficChange,
      backlinksAdded: report.backlinksAdded,
      domainAuthority: report.domainAuthority,
    })

    await prisma.clientReport.update({
      where: { id: reportId },
      data: { emailSent: true, emailSentAt: new Date() },
    })

    return apiSuccess({ success: true, sentTo: report.client.email })
  } catch (e) {
    return apiError(e)
  }
}

