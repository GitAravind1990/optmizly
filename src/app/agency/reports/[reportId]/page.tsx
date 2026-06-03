import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function markViewed(reportId: string) {
  await prisma.clientReport.update({
    where: { id: reportId },
    data: { clientViewed: true, clientViewedAt: new Date() },
  })
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
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SEO Report — {report.client.name}</title>
        <style>{`
          body { margin: 0; padding: 0; }
          @media print {
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Print button */}
        <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Print / Save PDF
          </button>
        </div>
        {/* Report HTML */}
        <div dangerouslySetInnerHTML={{ __html: report.reportHtml }} />
      </body>
    </html>
  )
}
