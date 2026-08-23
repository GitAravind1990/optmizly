import { NextRequest } from 'next/server'
import { Plan } from '@prisma/client'
import { requireToolAccess, AuthError } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { consumeDailyUsage } from '@/lib/daily-usage'
import { discoverBusinesses, type DiscoveredBusiness } from '@/lib/places-discovery'
import { fetchHomepage, analyzeHomepage, type SEOFinding } from '@/lib/homepage-seo-check'
import { scoreOpportunity, classifyOpportunity, prospectRank, type OpportunityLevel } from '@/lib/opportunity-score'
import { summarizeProspects } from '@/lib/client-finder-ai'

export const runtime = 'nodejs'

/**
 * Budgeted to finish comfortably inside 60s, which is not the platform limit but Clerk's.
 *
 * A signed-in POST that outlives its session token can be rejected after the handler has
 * returned, with the route unable to see it (measured on other tools, see CLAUDE.md). The
 * arithmetic here: Places ~3s, then ten homepages at concurrency 5 with an 8s per-site
 * ceiling is ~16s worst case, then one model call ~10s. About 30s, with room to spare.
 *
 * The caps below are what keep that true. Raising MAX_SITES or the per-site timeout without
 * redoing this sum is how this route ends up in the same place Content Optimizer was.
 */
export const maxDuration = 60

/** Hard ceiling regardless of what the client asks for - the time budget depends on it. */
const MAX_SITES = 10

/** Five at a time: enough to hide latency, few enough that ten sites cannot open ten
 *  sockets and blow the memory ceiling on a small function. */
const CONCURRENCY = 5

/**
  * Agency-only, so only the AGENCY number is reachable - requireToolAccess refuses the
  * other two before this is read. They stay at 0 rather than being deleted because the
  * Record must cover every Plan, and a 0 says "not entitled" more clearly than a leftover
  * allowance that looks live.
  *
  * 50 a day is a cost ceiling, not a product limit: each search is one paid Places request
  * plus up to ten homepage fetches plus one model call.
  */
const CLIENT_FINDER_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 0,
  PRO: 0,
  AGENCY: 50,
}

type ProspectStatus = 'ANALYZED' | 'WEBSITE_UNAVAILABLE' | 'NO_WEBSITE'

interface Prospect {
  id: string
  name: string
  website: string | null
  location: string
  rating: number | null
  phone: string | null
  opportunityScore: number
  opportunityLevel: OpportunityLevel
  topIssues: string[]
  findings: SEOFinding[]
  salesAngle: string | null
  status: ProspectStatus
  siteReachable: boolean
  rank: number
}

/**
 * Runs `worker` over `items` with at most `limit` in flight.
 *
 * A throwing worker must not reject the pool. analyzeBusiness is written not to throw, but
 * one unexpected exception would otherwise reject Promise.all and lose nine good prospects
 * along with the bad one, which is exactly the failure this tool cannot afford on a first
 * run. `onError` supplies the placeholder instead.
 */
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
  onError: (item: T, e: unknown) => R,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      try {
        results[i] = await worker(items[i])
      } catch (e) {
        results[i] = onError(items[i], e)
      }
    }
  })

  await Promise.all(runners)
  return results
}

const SEVERITY_ORDER: Record<SEOFinding['severity'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

/**
 * One business: fetch its homepage, check it, score it.
 *
 * Never throws. A site that times out, blocks us, redirects somewhere private or serves a
 * PDF becomes WEBSITE_UNAVAILABLE and stays in the list - an agency still wants to know the
 * business exists, and dropping it silently would make the result count look wrong.
 */
async function analyzeBusiness(biz: DiscoveredBusiness): Promise<Prospect> {
  const base: Omit<Prospect, 'opportunityScore' | 'opportunityLevel' | 'topIssues' | 'findings' | 'status' | 'siteReachable' | 'rank'> = {
    id: biz.placeId,
    name: biz.name,
    website: biz.website ?? null,
    location: biz.address,
    rating: biz.rating ?? null,
    phone: biz.phone ?? null,
    salesAngle: null,
  }

  if (!biz.hasWebsite || !biz.website) {
    // No site at all. Deliberately NOT scored: there is no homepage to measure, and
    // inventing a 100 here would be a fabricated number sitting beside real ones.
    return {
      ...base,
      opportunityScore: 0,
      opportunityLevel: 'Low',
      topIssues: [],
      findings: [],
      status: 'NO_WEBSITE',
      siteReachable: false,
      rank: 0,
    }
  }

  const page = await fetchHomepage(biz.website)
  if (!page) {
    return {
      ...base,
      opportunityScore: 0,
      opportunityLevel: 'Low',
      topIssues: [],
      findings: [],
      status: 'WEBSITE_UNAVAILABLE',
      siteReachable: false,
      rank: 0,
    }
  }

  const { findings, signals } = analyzeHomepage(page.html, page.finalUrl)
  const opportunityScore = scoreOpportunity(signals)
  const ordered = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return {
    ...base,
    website: page.finalUrl,
    opportunityScore,
    opportunityLevel: classifyOpportunity(opportunityScore),
    topIssues: ordered.slice(0, 3).map(f => f.title),
    findings: ordered,
    status: 'ANALYZED',
    siteReachable: true,
    rank: prospectRank(opportunityScore, true),
  }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    // requireToolAccess, not requireAuth: Agency-only and capped per day rather than drawn
    // from the monthly analysis allowance. Same shape as AI Regex.
    const user = await requireToolAccess('client-finder')
    clerkId = user.clerkId

    const { industry, location, service, limit } = await req.json()
    if (typeof industry !== 'string' || !industry.trim()) throw new AuthError(400, 'Industry is required')
    if (typeof location !== 'string' || !location.trim()) throw new AuthError(400, 'Location is required')

    const dailyLimit = CLIENT_FINDER_DAILY_LIMITS[user.plan]
    const usage = await consumeDailyUsage(user.userId, 'client-finder', dailyLimit)
    if (usage.exceeded) {
      throw new AuthError(429, `Daily limit of ${dailyLimit} searches reached. It resets tomorrow.`)
    }

    const requested = Number(limit)
    const wanted = Number.isFinite(requested) ? Math.max(1, Math.min(MAX_SITES, Math.floor(requested))) : MAX_SITES

    // `service` narrows the Places query when supplied - "plumber" in "Leeds" is a
    // different list from "emergency plumber" in "Leeds".
    const query = typeof service === 'string' && service.trim()
      ? `${industry.trim()} ${service.trim()}`
      : industry.trim()

    const businesses = await discoverBusinesses(query, location.trim(), wanted)
    if (businesses.length === 0) {
      return apiSuccess({
        prospects: [],
        searchMeta: {
          industry: industry.trim(), location: location.trim(),
          found: 0, analyzed: 0, unreachable: 0, noWebsite: 0,
          aiSummaries: false,
          usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
        },
      })
    }

    const prospects = await pool(businesses, CONCURRENCY, analyzeBusiness, (biz, e) => {
      console.error(`[client-finder] ${biz.name} threw during analysis:`, e instanceof Error ? e.message : e)
      return {
        id: biz.placeId, name: biz.name, website: biz.website ?? null, location: biz.address,
        rating: biz.rating ?? null, phone: biz.phone ?? null, salesAngle: null,
        opportunityScore: 0, opportunityLevel: 'Low' as const, topIssues: [], findings: [],
        status: 'WEBSITE_UNAVAILABLE' as const, siteReachable: false, rank: 0,
      }
    })

    // Ranked by prospectRank, not by opportunity: a dead site scores high and is a poor
    // lead. See opportunity-score.ts.
    const analyzed = prospects.filter(p => p.status === 'ANALYZED').sort((a, b) => b.rank - a.rank)
    const unreachable = prospects.filter(p => p.status === 'WEBSITE_UNAVAILABLE')
    const noWebsite = prospects.filter(p => p.status === 'NO_WEBSITE')

    // One call, top prospects only, structured findings only.
    const summaries = await summarizeProspects(
      analyzed.map(p => ({ id: p.id, name: p.name, opportunityScore: p.opportunityScore, findings: p.findings })),
    )
    for (const p of analyzed) {
      const s = summaries.get(p.id)
      if (!s) continue
      p.salesAngle = s.salesAngle
      if (s.topThreeIssues.length > 0) p.topIssues = s.topThreeIssues
    }

    return apiSuccess({
      // findings are dropped from the response: the UI shows the top three issues, and
      // shipping every finding for ten sites is payload nobody reads.
      prospects: [...analyzed, ...unreachable, ...noWebsite].map(({ findings: _findings, rank: _rank, ...p }) => p),
      searchMeta: {
        industry: industry.trim(),
        location: location.trim(),
        found: prospects.length,
        analyzed: analyzed.length,
        unreachable: unreachable.length,
        noWebsite: noWebsite.length,
        aiSummaries: summaries.size > 0,
        usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/client-finder' })
    return apiError(e)
  }
}
