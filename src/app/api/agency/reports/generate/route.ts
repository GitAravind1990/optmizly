import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== Plan.AGENCY) throw new AuthError(403, 'Agency plan required')
  return user
}

function generateMockRankings(keywords: string[]) {
  const data: Record<string, number> = {}
  for (const kw of keywords) {
    data[kw] = Math.floor(Math.random() * 50) + 1
  }
  const sorted = Object.entries(data).sort((a, b) => a[1] - b[1])
  const avgPosition = keywords.length
    ? Math.round(Object.values(data).reduce((s, v) => s + v, 0) / keywords.length)
    : 0
  return {
    data,
    avgPosition,
    topKeywords: sorted.slice(0, 5).map(([keyword, position]) => ({ keyword, position })),
  }
}

function generateMockTraffic() {
  const current = Math.floor(Math.random() * 8000) + 2000
  const change = Math.floor(Math.random() * 41) - 20
  return { current, previous: Math.round(current / (1 + change / 100)), change }
}

function generateMockBacklinks() {
  return {
    total: Math.floor(Math.random() * 4500) + 500,
    new: Math.floor(Math.random() * 46) + 5,
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function generateReportHtml(data: {
  client: { name: string; website: string; brandColor: string }
  month: number
  year: number
  rankings: ReturnType<typeof generateMockRankings>
  traffic: ReturnType<typeof generateMockTraffic>
  backlinks: ReturnType<typeof generateMockBacklinks>
  aiSummary: string
  domainAuthority: number
  pageAuthority: number
}): string {
  const { client, month, year, rankings, traffic, backlinks, aiSummary } = data
  const monthName = MONTH_NAMES[month - 1]
  const trafficColor = traffic.change >= 0 ? '#22c55e' : '#ef4444'
  const trafficSign = traffic.change >= 0 ? '+' : ''
  const brand = client.brandColor ?? '#6366f1'

  const topKwRows = rankings.topKeywords
    .map(
      ({ keyword, position }) => `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 16px;font-size:14px;color:#334155">${keyword}</td>
          <td style="padding:10px 16px;font-size:14px;text-align:center">
            <span style="background:${position <= 10 ? '#dcfce7' : position <= 20 ? '#fef9c3' : '#fee2e2'};
              color:${position <= 10 ? '#15803d' : position <= 20 ? '#854d0e' : '#b91c1c'};
              padding:2px 10px;border-radius:9999px;font-weight:700;font-size:13px">#${position}</span>
          </td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SEO Report — ${client.name} — ${monthName} ${year}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <div style="max-width:800px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:${brand};padding:40px;color:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:28px;font-weight:800;margin-bottom:4px">${client.name}</div>
          <div style="font-size:14px;opacity:.85">${client.website}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700">${monthName} ${year}</div>
          <div style="font-size:13px;opacity:.85">Monthly SEO Report</div>
        </div>
      </div>
    </div>

    <!-- Metrics grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e8f0;margin:0">
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${brand}">${rankings.avgPosition}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">Avg. Position</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${trafficColor}">${trafficSign}${traffic.change}%</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">Traffic Change</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${brand}">${backlinks.new}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">New Backlinks</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${brand}">${data.domainAuthority}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">Domain Authority</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:40px">
      <!-- AI Summary -->
      <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 12px">Executive Summary</h2>
      <p style="font-size:14px;line-height:1.7;color:#475569;background:#f8fafc;padding:20px;border-radius:10px;border-left:4px solid ${brand};margin:0 0 32px">${aiSummary}</p>

      <!-- Top keywords -->
      <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 12px">Top Keyword Rankings</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Keyword</th>
            <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Position</th>
          </tr>
        </thead>
        <tbody>${topKwRows}</tbody>
      </table>

      <!-- Traffic + Backlinks -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px">
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:24px">
          <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 16px">Organic Traffic</h3>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:28px;font-weight:800;color:#1e293b">${traffic.current.toLocaleString()}</div>
              <div style="font-size:13px;color:#64748b">This month</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:700;color:${trafficColor}">${trafficSign}${traffic.change}%</div>
              <div style="font-size:13px;color:#64748b">vs last month</div>
            </div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:24px">
          <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 16px">Backlink Profile</h3>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:28px;font-weight:800;color:#1e293b">${backlinks.total.toLocaleString()}</div>
              <div style="font-size:13px;color:#64748b">Total backlinks</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:700;color:#22c55e">+${backlinks.new}</div>
              <div style="font-size:13px;color:#64748b">New this month</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;color:#94a3b8">Generated by Optmizly</div>
      <div style="font-size:13px;color:#94a3b8">Confidential — ${client.name} — ${monthName} ${year}</div>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAgencyUser()
    const { clientId, month, year } = await req.json()

    if (!clientId || !month || !year) throw new AuthError(400, 'clientId, month, and year are required')

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client || client.agencyId !== user.id) throw new AuthError(404, 'Client not found')

    const keywords: string[] = JSON.parse(client.trackKeywords || '[]')

    const rankings = generateMockRankings(keywords)
    const traffic = generateMockTraffic()
    const backlinks = generateMockBacklinks()
    const domainAuthority = Math.round(Math.random() * 30 + 30)
    const pageAuthority = Math.round(Math.random() * 30 + 35)

    const aiSummary = await callClaude(
      'You are a professional SEO analyst writing concise monthly reports for agency clients. Be data-driven, specific, and encouraging. Write in third person about the client.',
      `Generate a professional 150-200 word SEO executive summary for ${client.name} (${client.website}) for ${MONTH_NAMES[month - 1]} ${year}.\n\nData:\n- Average keyword position: ${rankings.avgPosition}\n- Top keywords: ${rankings.topKeywords.map(k => `"${k.keyword}" at #${k.position}`).join(', ')}\n- Organic traffic: ${traffic.current.toLocaleString()} visits (${traffic.change >= 0 ? '+' : ''}${traffic.change}% vs last month)\n- New backlinks: ${backlinks.new} (total: ${backlinks.total.toLocaleString()})\n- Domain authority: ${domainAuthority}\n\nWrite a professional summary highlighting wins, opportunities, and next steps.`,
      500,
      'claude-haiku-4-5-20251001'
    )

    const reportHtml = generateReportHtml({
      client: { name: client.name, website: client.website, brandColor: client.brandColor },
      month,
      year,
      rankings,
      traffic,
      backlinks,
      aiSummary,
      domainAuthority,
      pageAuthority,
    })

    const report = await prisma.clientReport.create({
      data: {
        clientId: client.id,
        month,
        year,
        keywordRankings: JSON.stringify(rankings.data),
        trafficChange: traffic.change,
        backlinksAdded: backlinks.new,
        topPerformers: JSON.stringify(rankings.topKeywords),
        domainAuthority,
        pageAuthority,
        backlinksTotal: backlinks.total,
        reportHtml,
      },
    })

    return apiSuccess({ id: report.id, success: true, reportUrl: `/agency/reports/${report.id}` }, 201)
  } catch (e) {
    return apiError(e)
  }
}

