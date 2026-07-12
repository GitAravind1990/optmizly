import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, setTrackingUser } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'
import { fetchOPRScore } from '@/lib/openpagerank'
import { getBacklinksSummary, getOrganicRank, getTrafficEstimate, isDataForSEOConfigured, settledOrNull } from '@/lib/dataforseo'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getAgencyUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan !== Plan.AGENCY) throw new AuthError(403, 'Agency plan required')
  setTrackingUser(user.id)
  return user
}

function cleanDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase().split('/')[0]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function generateReportHtml(data: {
  client: { name: string; website: string; brandColor: string }
  month: number
  year: number
  avgPosition: number | null
  topKeywords: Array<{ keyword: string; position: number }>
  trafficCurrent: number | null
  trafficChange: number | null
  backlinksTotal: number | null
  backlinksAdded: number | null
  aiSummary: string
  domainAuthority: number | null
}): string {
  const { client, month, year, avgPosition, topKeywords, trafficCurrent, trafficChange, backlinksTotal, backlinksAdded, aiSummary, domainAuthority } = data
  const monthName = MONTH_NAMES[month - 1]
  const brand = client.brandColor ?? '#6366f1'

  const trafficColor = trafficChange === null ? '#64748b' : trafficChange >= 0 ? '#22c55e' : '#ef4444'
  const trafficChangeText = trafficChange === null ? '—' : `${trafficChange >= 0 ? '+' : ''}${trafficChange}%`
  const backlinksAddedText = backlinksAdded === null ? '—' : `${backlinksAdded >= 0 ? '+' : ''}${backlinksAdded}`

  const topKwRows = topKeywords.length
    ? topKeywords
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
    : `<tr><td colspan="2" style="padding:16px;font-size:13px;color:#94a3b8;text-align:center">No tracked keywords ranked in the top 100 this period</td></tr>`

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
        <div style="font-size:32px;font-weight:800;color:${brand}">${avgPosition ?? '—'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">Avg. Position</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${trafficColor}">${trafficChangeText}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">Traffic Change</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${brand}">${backlinksAddedText}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;font-weight:600">New Backlinks</div>
      </div>
      <div style="background:#fff;padding:24px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${brand}">${domainAuthority ?? '—'}</div>
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
              <div style="font-size:28px;font-weight:800;color:#1e293b">${trafficCurrent !== null ? trafficCurrent.toLocaleString() : '—'}</div>
              <div style="font-size:13px;color:#64748b">Est. monthly visits</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:700;color:${trafficColor}">${trafficChangeText}</div>
              <div style="font-size:13px;color:#64748b">${trafficChange === null ? 'first report' : 'vs last month'}</div>
            </div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:24px">
          <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 16px">Backlink Profile</h3>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:28px;font-weight:800;color:#1e293b">${backlinksTotal !== null ? backlinksTotal.toLocaleString() : '—'}</div>
              <div style="font-size:13px;color:#64748b">Total backlinks</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:700;color:#22c55e">${backlinksAddedText}</div>
              <div style="font-size:13px;color:#64748b">${backlinksAdded === null ? 'first report' : 'vs last month'}</div>
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
  let clerkId: string | null = null
  try {
    const user = await getAgencyUser()
    clerkId = user.clerkId
    const { clientId, month, year } = await req.json()

    if (!clientId || !month || !year) throw new AuthError(400, 'clientId, month, and year are required')

    if (!isDataForSEOConfigured()) {
      throw new AuthError(503, 'Report generation is temporarily unavailable. Please try again later.')
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client || client.agencyId !== user.id) throw new AuthError(404, 'Client not found')

    const keywords: string[] = JSON.parse(client.trackKeywords || '[]')
    const domain = cleanDomain(client.website)

    // Real per-keyword rank, run concurrently — one paid DataForSEO lookup each.
    const rankResults = await Promise.allSettled(
      keywords.map(kw => getOrganicRank(kw, domain, 'US', 'desktop'))
    )
    const rankings: Record<string, number> = {}
    for (let i = 0; i < keywords.length; i++) {
      const result = settledOrNull(rankResults[i])
      if (result?.found && result.rank !== null) rankings[keywords[i]] = result.rank
    }
    const rankedEntries = Object.entries(rankings).sort((a, b) => a[1] - b[1])
    const avgPosition = rankedEntries.length
      ? Math.round(rankedEntries.reduce((s, [, v]) => s + v, 0) / rankedEntries.length)
      : null
    const topKeywords = rankedEntries.slice(0, 5).map(([keyword, position]) => ({ keyword, position }))

    // Real domain/page authority via OpenPageRank — it only scores at domain
    // granularity, so both fields get the same value (same approach as Competitor Spy).
    let domainAuthority: number | null = null
    try {
      const opr = await fetchOPRScore(domain)
      if (opr.status_code === 200 && typeof opr.page_rank_decimal === 'number') {
        domainAuthority = Math.round(Math.min(10, Math.max(0, opr.page_rank_decimal)) * 10)
      }
    } catch { /* leave null — OPR not configured or lookup failed */ }
    const pageAuthority = domainAuthority

    // Real backlinks + traffic — independent of rank/authority and each other.
    const [backlinksSummary, trafficCurrent] = await Promise.all([
      getBacklinksSummary(domain),
      getTrafficEstimate(domain),
    ])
    const backlinksTotal = backlinksSummary?.totalBacklinks ?? null

    // Month-over-month deltas against this client's own most recent prior report —
    // null (shown as "first report") when there's nothing real to compare against yet.
    const priorReport = await prisma.clientReport.findFirst({
      where: { clientId, OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    const backlinksAdded = (priorReport?.backlinksTotal != null && backlinksTotal !== null)
      ? backlinksTotal - priorReport.backlinksTotal
      : null
    const trafficChange = (priorReport?.trafficCurrent != null && priorReport.trafficCurrent > 0 && trafficCurrent !== null)
      ? Math.round(((trafficCurrent - priorReport.trafficCurrent) / priorReport.trafficCurrent) * 100)
      : null

    const aiSummary = await callClaude(
      'You are a professional SEO analyst writing concise monthly reports for agency clients. Be data-driven, specific, and encouraging. Write in third person about the client. Where a metric is noted as "not yet available", describe it as still being established rather than inventing a number.',
      `Generate a professional 150-200 word SEO executive summary for ${client.name} (${client.website}) for ${MONTH_NAMES[month - 1]} ${year}.

Data (values marked "not yet available" should be described as still being established, not stated as numbers):
- Average keyword position: ${avgPosition ?? 'not yet available'}
- Top keywords: ${topKeywords.length ? topKeywords.map(k => `"${k.keyword}" at #${k.position}`).join(', ') : 'no tracked keywords ranked in the top 100 this period'}
- Estimated organic traffic: ${trafficCurrent !== null ? `${trafficCurrent.toLocaleString()} visits/month` : 'not yet available'}${trafficChange !== null ? ` (${trafficChange >= 0 ? '+' : ''}${trafficChange}% vs last month)` : ''}
- Backlinks: ${backlinksTotal !== null ? backlinksTotal.toLocaleString() : 'not yet available'}${backlinksAdded !== null ? ` (${backlinksAdded >= 0 ? '+' : ''}${backlinksAdded} vs last month)` : ''}
- Domain authority: ${domainAuthority ?? 'not yet available'}

Write a professional summary highlighting wins, opportunities, and next steps.`,
      500,
      'claude-haiku-4-5-20251001'
    )

    const reportHtml = generateReportHtml({
      client: { name: client.name, website: client.website, brandColor: client.brandColor },
      month,
      year,
      avgPosition,
      topKeywords,
      trafficCurrent,
      trafficChange,
      backlinksTotal,
      backlinksAdded,
      aiSummary,
      domainAuthority,
    })

    const report = await prisma.clientReport.create({
      data: {
        clientId: client.id,
        month,
        year,
        keywordRankings: JSON.stringify(rankings),
        trafficChange,
        trafficCurrent,
        backlinksAdded,
        topPerformers: JSON.stringify(topKeywords),
        domainAuthority,
        pageAuthority,
        backlinksTotal,
        reportHtml,
      },
    })

    return apiSuccess({ id: report.id, success: true, reportUrl: `/agency/reports/${report.id}` }, 201)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/agency/reports/generate' })
    return apiError(e)
  }
}
