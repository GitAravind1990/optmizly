import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

async function markViewed(reportId: string) {
  await prisma.clientReport.update({
    where: { id: reportId },
    data: { clientViewed: true, clientViewedAt: new Date() },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ reportId: string }> }): Promise<Metadata> {
  const { reportId } = await params
  const report = await prisma.clientReport.findUnique({ where: { id: reportId }, include: { client: true } })
  return { title: report ? `SEO Report — ${report.client.name}` : 'Report not found' }
}

export default async function PublicReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params

  const report = await prisma.clientReport.findUnique({
    where: { id: reportId },
    include: { client: true },
  })

  if (!report) notFound()

  // Mark as viewed (fire-and-forget — don't block render)
  if (!report.clientViewed) {
    markViewed(reportId).catch(() => {})
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <PrintButton />
      {/* Report HTML */}
      <div dangerouslySetInnerHTML={{ __html: report.reportHtml }} />
    </>
  )
}
