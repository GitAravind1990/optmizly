import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON, setTrackingUser } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError, getOrCreateUser } from '@/lib/auth'
import { captureServerException } from '@/lib/posthog-server'
import { fetchOPRScore } from '@/lib/openpagerank'
import { getTrafficEstimate, getBacklinksSummary, getRankedKeywords, getReferringDomains, getTopPagesByTraffic, getDomainIntersectionGaps, settledOrNull } from '@/lib/dataforseo'
import { parseDataQuality } from '@/lib/competitor-spy-quality'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await getOrCreateUser(clerkId)
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO or AGENCY plan required')
  setTrackingUser(user.id)
  return user
}

function strHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff
  }
}

function rand(min: number, max: number, rng: () => number = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function extractDomainName(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
}

const SAAS_KEYWORDS = [
  'seo tools', 'keyword research tool', 'rank tracker', 'backlink checker',
  'content optimizer', 'site audit', 'competitor analysis', 'serp checker',
  'link building', 'on-page seo', 'technical seo', 'seo audit',
  'google search console', 'organic traffic', 'domain authority',
  'page speed', 'core web vitals', 'local seo', 'e-commerce seo',
  'seo for startups', 'b2b seo strategy', 'seo reporting tool',
  'white label seo', 'seo agency software', 'content marketing platform',
]

const BACKLINK_SOURCES = [
  'forbes.com', 'medium.com', 'linkedin.com', 'producthunt.com',
  'techcrunch.com', 'hubspot.com', 'moz.com', 'searchengineland.com',
  'g2.com', 'capterra.com', 'reddit.com', 'quora.com',
]

function generateMockData(domainName: string) {
  const rng = seededRng(strHash(domainName))
  const r = (min: number, max: number) => rand(min, max, rng)

  const traffic = r(5000, 50000)
  const da = r(30, 80)

  const shuffledKws = [...SAAS_KEYWORDS].sort(() => rng() - 0.5)
  const topKeywords = shuffledKws.slice(0, 20).map((kw, i) => ({
    keyword: kw,
    position: i + 1,
    volume: r(200, 8000),
    traffic: Math.floor(traffic * (0.15 - i * 0.006)),
  }))

  const shuffledBL = [...BACKLINK_SOURCES].sort(() => rng() - 0.5)
  const topBacklinks = shuffledBL.slice(0, 8).map(domain => ({
    domain,
    links: r(2, 45),
    da: r(50, 95),
  }))

  const topPages = [
    { title: `${domainName} (Home)`, url: '/', traffic: Math.floor(traffic * 0.35) },
    { title: 'Pricing', url: '/pricing', traffic: Math.floor(traffic * 0.15) },
    { title: 'How to improve SEO rankings', url: '/blog/seo-rankings', traffic: Math.floor(traffic * 0.12) },
    { title: 'Best SEO tools comparison', url: '/blog/best-seo-tools', traffic: Math.floor(traffic * 0.09) },
    { title: 'Free keyword research guide', url: '/blog/keyword-research', traffic: Math.floor(traffic * 0.07) },
  ]

  const gapKeywords = [
    { keyword: 'ai seo tools', volume: r(1000, 4000), difficulty: r(20, 45) },
    { keyword: 'seo content brief generator', volume: r(500, 2000), difficulty: r(15, 40) },
    { keyword: 'topical authority seo', volume: r(800, 3000), difficulty: r(25, 50) },
    { keyword: 'e-e-a-t seo checklist', volume: r(300, 1500), difficulty: r(20, 45) },
    { keyword: 'semantic seo guide', volume: r(600, 2500), difficulty: r(30, 55) },
  ]

  // missingEntities/contentOpps are NOT generated here — they're always overwritten
  // by the AI-insights block below (either Claude's real, domain-grounded output, or
  // an honest generic fallback if that call fails). These typed-empty placeholders
  // exist only so `data`'s shape is consistent before that block runs.
  const missingEntities: string[] = []
  const contentOpps: Array<{ title: string; opportunity: string; traffic: number }> = []

  return {
    traffic,
    da,
    pa: Math.max(da - r(0, 12), 20),
    backlinksTotal: r(500, 5000),
    backlinksNew: r(5, 50),
    topKeywords,
    keywordCount: r(500, 5000),
    topBacklinks,
    topPages,
    contentCount: r(50, 200),
    avgContentLength: r(2000, 3000),
    gapKeywords,
    missingEntities,
    contentOpps,
  }
}

interface AIInsights {
  strengths?: string[]
  weaknesses?: string[]
  topOpportunity?: string
  threatLevel?: string
  missingEntities?: string[]
  // `keyword` is Claude's own output, used server-side to look up a real traffic
  // number for the separate `contentOpps` DB column (which only has
  // {title, opportunity, traffic}, no `keyword`) — stripped before `aiInsights`
  // itself is persisted, see below.
  contentOpps?: Array<{ title: string; opportunity: string; keyword?: string }>
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await getProUser()
    clerkId = user.clerkId
    const { domainUrl, userDomain: userDomainRaw } = await req.json()
    if (!domainUrl) throw new AuthError(400, 'domainUrl is required')

    const domainName = extractDomainName(domainUrl)
    if (!domainName || !domainName.includes('.')) {
      throw new AuthError(400, 'Invalid domain. Enter a domain like "ahrefs.com"')
    }
    // Optional — only enables real gap-keyword analysis when provided. Not required
    // since most of the tool's value (traffic, backlinks, keywords, pages) doesn't
    // need a second domain to compare against.
    const userDomain = userDomainRaw ? extractDomainName(userDomainRaw) : undefined

    const data = generateMockData(domainName)

    // Per-field real-vs-estimated tracking, stored as JSON in `dataQuality` (still a
    // plain String column — no migration). Every field here starts as the seeded
    // mock from generateMockData() and only gets overwritten when its real lookup
    // actually succeeds, matching the original DA/PA precedent below rather than the
    // null-on-failure pattern used elsewhere (this model's numeric columns are
    // non-nullable, so "couldn't fetch" has to mean "keep the estimate," not null).
    const quality = { authority: false, traffic: false, backlinks: false, backlinksDetail: false, keywords: false, pages: false, gaps: false, backlinksNew: false }

    // Real signals from OpenPageRank and DataForSEO, fetched concurrently since none
    // of them depend on each other. A rejected promise here is treated the same as an
    // in-band failure — settledOrNull() unwraps both cases to null, and null always
    // means "keep the mock estimate," never zero. Gap keywords only run when the user
    // supplied their own domain to compare against — skipped (not even attempted)
    // otherwise rather than calling with a garbage/empty target.
    const [oprResult, trafficResult, backlinksResult, keywordsResult, referringDomainsResult, topPagesResult, gapsResult, priorResult] = await Promise.allSettled([
      fetchOPRScore(domainName),
      getTrafficEstimate(domainName),
      getBacklinksSummary(domainName),
      getRankedKeywords(domainName, 20),
      getReferringDomains(domainName, 8),
      getTopPagesByTraffic(domainName, 5),
      userDomain ? getDomainIntersectionGaps(userDomain, domainName, 10) : Promise.resolve(null),
      // For the backlinksNew delta below — independent of the DataForSEO calls, so it
      // rides in the same batch rather than adding a sequential round trip.
      prisma.competitorAnalysis.findFirst({ where: { userId: user.id, domainName }, orderBy: { createdAt: 'desc' } }),
    ])

    // OpenPageRank only scores at domain granularity (0-10), so both Domain and Page
    // Authority get the same real value rather than inventing a separate "page" score.
    // The batch endpoint returns 200 for the request itself even when a specific
    // domain isn't in OPR's index (per-domain status_code 404, page_rank_decimal 0) —
    // check the per-domain status so an unindexed domain falls back to the estimate
    // instead of reporting a false, misleadingly-confident "0/100" authority score.
    const opr = settledOrNull(oprResult)
    const authorityIsReal = !!opr && opr.status_code === 200 && typeof opr.page_rank_decimal === 'number'
    if (authorityIsReal) {
      const realAuthority = Math.round(Math.min(10, Math.max(0, opr!.page_rank_decimal)) * 10)
      data.da = realAuthority
      data.pa = realAuthority
      quality.authority = true
    }

    const traffic = settledOrNull(trafficResult)
    if (traffic !== null) {
      data.traffic = traffic
      quality.traffic = true
    }

    const backlinks = settledOrNull(backlinksResult)
    if (backlinks !== null) {
      data.backlinksTotal = backlinks.totalBacklinks
      quality.backlinks = true
    }

    const keywords = settledOrNull(keywordsResult)
    if (keywords !== null) {
      data.topKeywords = keywords.items
      data.keywordCount = keywords.totalCount
      quality.keywords = true
    }

    const referringDomains = settledOrNull(referringDomainsResult)
    if (referringDomains !== null) {
      data.topBacklinks = referringDomains
      quality.backlinksDetail = true
    }

    const topPages = settledOrNull(topPagesResult)
    if (topPages !== null) {
      data.topPages = topPages
      quality.pages = true
    }

    const gaps = settledOrNull(gapsResult)
    if (gaps !== null) {
      data.gapKeywords = gaps
      quality.gaps = true
    }

    // "New backlinks" as a delta against the user's own most recent PRIOR analysis of
    // this same domain (mirrors the same pattern Client Reports uses for its
    // traffic/backlinks deltas) — only computed when BOTH this run's and the prior
    // run's backlinksTotal are real; a delta between one real number and one mock
    // number would be meaningless. No prior analysis, or either side estimated,
    // means "first real check" — 0 is the honest answer, and the field can't be null
    // (schema constraint), so it can't be left blank either.
    const priorAnalysis = settledOrNull(priorResult)
    if (quality.backlinks && priorAnalysis && parseDataQuality(priorAnalysis.dataQuality).backlinks) {
      data.backlinksNew = Math.max(0, data.backlinksTotal - priorAnalysis.backlinksTotal)
      quality.backlinksNew = true
    } else {
      data.backlinksNew = 0
    }

    // AI insights — inputs are qualified inline ("(measured)" vs "(rough estimate)")
    // so Claude's own generated text doesn't state a mock number with false
    // confidence. missingEntities/contentOpps moved here from generateMockData: they
    // used to be the same 3 hardcoded ideas every single time regardless of domain;
    // now they're grounded in this domain's actual gap/top keywords when available.
    const qual = (isReal: boolean) => isReal ? '(measured)' : '(rough estimate)'
    let aiInsights: AIInsights = {}
    try {
      const raw = await callClaude(
        'You are an expert SEO competitive analyst. Return ONLY valid JSON — no markdown, no backticks.',
        `Analyze this competitor SEO data for ${domainName} and return JSON insights:

Traffic: ${data.traffic.toLocaleString()} monthly visits ${qual(quality.traffic)}
Domain Authority: ${data.da} ${qual(quality.authority)}
Backlinks: ${data.backlinksTotal.toLocaleString()} total ${qual(quality.backlinks)}, ${data.backlinksNew} new this month ${qual(quality.backlinksNew)}
Top keywords they rank for: ${data.topKeywords.slice(0, 5).map(k => k.keyword).join(', ')} ${qual(quality.keywords)}
Content count: ${data.contentCount} pages, avg ${data.avgContentLength} words (rough estimate)
Top backlink sources: ${data.topBacklinks.slice(0, 4).map(b => b.domain).join(', ')} ${qual(quality.backlinksDetail)}
${quality.gaps ? `Keywords they rank for that you (${userDomain}) don't: ${data.gapKeywords.slice(0, 8).map(g => g.keyword).join(', ')} (measured)` : ''}

Return ONLY this JSON object:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "topOpportunity": "single best actionable opportunity to beat them",
  "threatLevel": "low|medium|high",
  "missingEntities": ["topic/entity 1", "topic/entity 2", "topic/entity 3", "topic/entity 4", "topic/entity 5"],
  "contentOpps": [
    {"title": "specific content piece title", "opportunity": "why this is a gap worth filling", "keyword": "the exact gap/top keyword above this content piece would target, or empty string if none apply"}
  ]
}

Rules: base "missingEntities" on topics implied by the competitor's top keywords that aren't obviously covered elsewhere in this data — don't invent generic SEO topics unrelated to what's actually here. Base "contentOpps" (exactly 3 items) on the supplied gap/top keywords when available — each "keyword" field should exactly match one of the keywords listed above, or be an empty string if you're using threatLevel/general reasoning instead. If no gap keywords were supplied, base contentOpps on the competitor's top keywords and content gaps you can infer instead.`,
        700,
        'claude-haiku-4-5-20251001'
      )
      aiInsights = extractJSON<AIInsights>(raw)

      // Claude can't reliably estimate real traffic numbers, so contentOpps' displayed
      // "traffic" comes from the real gap-keyword volume it matched, not an AI guess —
      // falls back to 0 (rendered as "estimated" via dataQuality either way) when it
      // didn't match a real keyword.
      const gapByKeyword = new Map(data.gapKeywords.map(g => [g.keyword, g.volume]))
      if (aiInsights.contentOpps) {
        data.contentOpps = aiInsights.contentOpps.map(o => ({
          title: o.title,
          opportunity: o.opportunity,
          traffic: gapByKeyword.get(o.keyword ?? '') ?? 0,
        }))
      }
      if (aiInsights.missingEntities) {
        data.missingEntities = aiInsights.missingEntities
      }
      // Both were only needed to populate the separate `missingEntities`/`contentOpps`
      // DB columns above — drop them before `aiInsights` itself is persisted below,
      // since the frontend reads those from their own columns, not from this blob.
      delete aiInsights.contentOpps
      delete aiInsights.missingEntities
    } catch {
      aiInsights = {
        strengths: ['Established brand', 'Strong backlink profile', 'High content volume'],
        weaknesses: ['Thin AI content coverage', 'Low E-E-A-T signals', 'Missing semantic gaps'],
        topOpportunity: 'Target their low-competition keywords with better E-E-A-T content',
        threatLevel: data.da > 60 ? 'high' : data.da > 45 ? 'medium' : 'low',
      }
      // AI generation failed entirely — fall back to generic, honestly-generic
      // placeholders rather than domain-specific-sounding invented content.
      data.missingEntities = ['Core Web Vitals', 'E-E-A-T signals', 'Topical authority']
      data.contentOpps = [
        { title: 'Re-run this analysis', opportunity: 'AI content suggestions were unavailable for this run — try analyzing again.', traffic: 0 },
      ]
    }

    const analysis = await prisma.competitorAnalysis.create({
      data: {
        userId: user.id,
        domainUrl: domainName,
        domainName,
        userDomain: userDomain ?? null,
        estimatedTraffic: data.traffic,
        domainAuthority: data.da,
        pageAuthority: data.pa,
        backlinksTotal: data.backlinksTotal,
        backlinksNew: data.backlinksNew,
        topKeywords: JSON.stringify(data.topKeywords),
        keywordCount: data.keywordCount,
        brandKeywords: JSON.stringify([]),
        topPages: JSON.stringify(data.topPages),
        contentCount: data.contentCount,
        avgContentLength: data.avgContentLength,
        topBacklinks: JSON.stringify(data.topBacklinks),
        backlinksSource: JSON.stringify(data.topBacklinks.map(b => b.domain)),
        gapKeywords: JSON.stringify(data.gapKeywords),
        missingEntities: JSON.stringify(data.missingEntities),
        contentOpps: JSON.stringify(data.contentOpps),
        aiInsights: JSON.stringify(aiInsights),
        // Per-field real/estimated flags (see `quality` above). Frontend parses this
        // with a fallback for pre-existing rows that still hold the old
        // 'partial-real' | 'estimated' string values.
        dataQuality: JSON.stringify(quality),
        lastAnalyzedAt: new Date(),
      },
    })

    return apiSuccess({
      success: true,
      analysisId: analysis.id,
      competitor: {
        domain: domainName,
        traffic: data.traffic,
        da: data.da,
        backlinks: data.backlinksTotal,
        topKeywords: data.topKeywords.slice(0, 5).map(k => k.keyword),
        opportunities: data.gapKeywords.length + data.contentOpps.length,
      },
    }, 201)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/competitor-spy/analyze' })
    return apiError(e)
  }
}

