import { NextRequest } from 'next/server'
import { requireAuth, type AuthedUser } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { captureServerEvent, captureServerException } from '@/lib/posthog-server'
import { getTopSerpResults, getKeywordMetrics, getSearchIntent, getRelatedKeywords, getBulkReferringDomains } from '@/lib/dataforseo'
import { fetchOPRScore, fetchOPRScores } from '@/lib/openpagerank'
import { crawlCompetitorPages } from '@/lib/ranking-engine-crawl'
import { fetchPSIMetrics } from '@/lib/seo-audit/psi'

export const runtime = 'nodejs'
// Was previously unset (pure Claude call) — now also fires two real DataForSEO
// lookups in parallel with the Claude call, so give it the same explicit headroom
// used elsewhere in this codebase instead of the platform default.
export const maxDuration = 60

const SYSTEM = `You are an SEO ranking analyst. Return ONLY valid JSON matching this exact schema:
{"keyword":{"volume":0,"difficulty":0,"cpc":"","intent":"","serp_features":[],"trend":"","related":[{"kw":"","vol":0,"diff":0}],"clusters":[{"name":"","keywords":[""]}]},"competitors":{"avg_da":0,"avg_rd":0,"avg_words":0,"freshness":"","schema_types":[],"eeat_level":"","page_speed":"","top":[{"domain":"","da":0,"rd":0,"words":0}]},"website":{"da_score":0,"backlink_score":0,"topical_score":0,"content_score":0,"technical_score":0,"eeat_score":0,"gaps":{"authority":0,"backlinks":0,"content":0,"topical":0,"technical":0}},"topical":{"published":0,"cluster_pct":0,"covered":[],"missing":[],"semantic_score":0},"content_gaps":{"topics":[],"entities":[],"faqs":[],"schema":[]},"score":{"overall":0,"label":"","factors":{"domain_authority":{"weight":25,"score":0},"backlinks":{"weight":25,"score":0},"content_depth":{"weight":20,"score":0},"topical_authority":{"weight":15,"score":0},"technical_seo":{"weight":10,"score":0},"eeat":{"weight":5,"score":0}},"verdict":"","time_to_rank":""},"forecast":[{"scenario":"","actions":[],"probability":0}],"recommendations":{"blockers":[],"actions":[{"action":"","impact":"","effort":"","gain":0}]},"summary":""}
Rules: overall=weighted sum Σ(factor.weight*factor.score)/100. label: "Very Unlikely"(0-20),"Difficult"(21-40),"Possible"(41-60),"Strong Opportunity"(61-80),"Highly Likely"(81-100). verdict: "Not Recommended"|"Possible but Competitive"|"Highly Likely". time_to_rank: "3-6 Months"|"6-12 Months"|"12+ Months". gaps: negative=deficit(user below competitors),positive=advantage. 3 forecast scenarios(Quick Wins/Serious Investment/Full Authority Build). 4-6 related keywords. 2-3 clusters with 3-4 keywords each. 3-5 real competitor domains likely to rank for this keyword. 5 blockers max. 5-7 action items with impact/effort "High"|"Medium"|"Low" and gain 1-20.`

// Ranking Engine's country dropdown uses full names (client.tsx COUNTRY_OPTIONS);
// dataforseo.ts's location tables are keyed by short codes (Rank Tracker's
// convention). 'Other' has no direct mapping — falls back to US.
const COUNTRY_TO_LOCATION: Record<string, string> = {
  'United States': 'US', 'United Kingdom': 'GB', Australia: 'AU',
  Canada: 'CA', India: 'IN', Germany: 'DE',
}

// Only the fields this route actually reads/overwrites after Claude's response —
// everything else Claude returns passes through untyped via the spread in apiSuccess.
type RankingEngineResult = {
  keyword: {
    volume: number; difficulty: number; cpc: string; trend: string; serp_features: string[]
    intent?: string
    related?: Array<{ kw: string; vol: number; diff: number }>
    [key: string]: unknown
  }
  competitors: {
    avg_da?: number
    avg_rd?: number
    avg_words?: number
    freshness?: string
    schema_types?: string[]
    top?: Array<{ domain: string; da: number; rd: number; words: number; position?: number; url?: string; daIsReal?: boolean; rdIsReal?: boolean; wordsIsReal?: boolean }>
    [key: string]: unknown
  }
  website: { da_score: number; technical_score: number; backlink_score: number; gaps: Record<string, number>; [key: string]: unknown }
  score: {
    overall: number
    label: string
    factors: Record<string, { weight: number; score: number }>
    [key: string]: unknown
  }
  [key: string]: unknown
}

// score.overall/label are supposed to be a deterministic function of score.factors
// (per the SYSTEM prompt's own stated rule), but Claude's arithmetic on 6 weighted
// terms isn't reliably correct — observed the displayed overall diverge from what
// its own factors/weights compute to. Recomputed here in code instead of trusted,
// same "don't trust the model's math" precedent as the real-data overwrites above.
function computeOverallScore(factors: Record<string, { weight: number; score: number }>): number {
  const weighted = Object.values(factors).reduce((sum, f) => sum + f.weight * f.score, 0)
  return Math.round(weighted / 100)
}

function labelForScore(overall: number): string {
  if (overall <= 20) return 'Very Unlikely'
  if (overall <= 40) return 'Difficult'
  if (overall <= 60) return 'Possible'
  if (overall <= 80) return 'Strong Opportunity'
  return 'Highly Likely'
}

// OPR's page_rank_decimal (0-10) scaled to the same 0-100 range used for DA
// throughout this tool and Competitor Spy — clamped since OPR occasionally returns
// values slightly outside 0-10 for edge-case domains.
function scaleOPR(decimal: number): number {
  return Math.round(Math.min(10, Math.max(0, decimal)) * 10)
}

// Same log-scale the Gaps tab already uses client-side to turn a raw referring-
// domain count into a 0-100 score for the competitor-avg bar (client.tsx
// compScoreFor.backlinks) — mirrored here so the user's own bar is computed with
// the identical methodology instead of being Claude's independent 0-100 guess.
function scaleRdToScore(rd: number): number {
  return Math.min(100, Math.round(Math.log10(Math.max(2, rd)) * 26))
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('ranking-engine')
    clerkId = user.clerkId
    const { keyword, domain, country, goal } = await req.json()
    if (!keyword || !domain || !country || !goal) {
      return apiError(new Error('keyword, domain, country and goal are required'))
    }

    const targetLocation = COUNTRY_TO_LOCATION[country] ?? 'US'
    // Real top-10 SERP (+ real SERP features), real search volume/difficulty/CPC/
    // trend, and the user's own real authority score — fetched concurrently since
    // none of these depend on each other or on the AI call. Fed into the prompt so
    // Claude's own output (and any fields it invents around them, like per-domain
    // DA estimates) is at least anchored to the keyword's actual current ranking
    // page — not required for the call to proceed if any of them fail.
    const [serpResult, metricsMap, userOpr, intentMap, realRelated] = await Promise.all([
      getTopSerpResults(keyword, targetLocation, 'desktop', 10),
      getKeywordMetrics([keyword], targetLocation),
      fetchOPRScore(domain).catch(() => null),
      getSearchIntent([keyword], targetLocation),
      getRelatedKeywords(keyword, targetLocation, 6),
    ])
    const realMetrics = metricsMap.get(keyword)
    const realSerp = serpResult && serpResult.items.length > 0 ? serpResult.items : null
    const realFeatures = serpResult && serpResult.features.length > 0 ? serpResult.features : null
    const userAuthorityIsReal = !!userOpr && userOpr.status_code === 200 && typeof userOpr.page_rank_decimal === 'number'
    const realUserDa = userAuthorityIsReal ? scaleOPR(userOpr!.page_rank_decimal) : null
    const realIntent = intentMap.get(keyword) ?? null

    const realDataLines = [
      realSerp ? `Real current top ${realSerp.length} Google organic results for this exact keyword (use these exact domains for competitors.top and competitors' order — do not invent different domains): ${realSerp.map(r => r.domain).join(', ')}` : null,
      realFeatures ? `Real SERP features present for this keyword: ${realFeatures.join(', ')}` : null,
      realMetrics?.searchVolume != null ? `Real monthly search volume: ${realMetrics.searchVolume}` : null,
      realMetrics?.difficulty != null ? `Real keyword difficulty: ${realMetrics.difficulty}/100` : null,
      realMetrics?.cpc != null ? `Real CPC: $${realMetrics.cpc}` : null,
      realMetrics?.trend ? `Real search trend (last 3 months vs prior 3): ${realMetrics.trend}` : null,
      realUserDa != null ? `Real authority score (OpenPageRank, 0-100 scale) for ${domain}: ${realUserDa}` : null,
      realIntent ? `Real search intent: ${realIntent}` : null,
      realRelated && realRelated.length > 0 ? `Real related keywords (use these exact ones for keyword.related, do not invent different ones): ${realRelated.map(r => `${r.keyword} (vol ${r.volume}, kd ${r.difficulty})`).join('; ')}` : null,
    ].filter(Boolean).join('\n')

    // Real per-competitor authority/referring-domains/page-content stats, plus real
    // page speed for the user's own domain — all depend on the real SERP domain
    // list (or just `domain`) above, so none can join the first batch, but all run
    // concurrently with the Claude call instead of adding sequential round trips.
    // PSI gets a much shorter timeout than its 45s default (real Lighthouse runs can
    // take that long) — bounded so a slow PSI run can't dominate this route's total
    // latency; a timeout just means the technical score falls back to Claude's
    // estimate, same graceful-degradation pattern as every other real call here.
    const [raw, competitorOprMap, rdMap, competitorPageStats, psiMetrics] = await Promise.all([
      callClaude(
        SYSTEM,
        `Keyword: ${keyword}\nDomain: ${domain}\nCountry: ${country}\nGoal: ${goal}${realDataLines ? `\n\n${realDataLines}` : ''}\n\nEstimate website metrics from the domain URL. Small/new sites: DA 10-25. Established niche sites: DA 30-55. Major brands: DA 70+. ${realSerp ? "DA, referring domains, and word counts for the real competitor domains will be supplied separately where available — estimate only what isn't." : "Generate realistic competitor data for this keyword's niche."}`,
        2500,
        'claude-sonnet-4-6'
      ),
      realSerp ? fetchOPRScores(realSerp.map(r => r.domain)).catch(() => new Map()) : Promise.resolve(new Map()),
      // Same bulk endpoint, one extra target — the user's own domain rides along
      // with the competitor domains in a single call, so getting a real referring-
      // domain count for the user's site (previously only fetched for competitors)
      // costs nothing extra.
      getBulkReferringDomains([domain, ...(realSerp ? realSerp.map(r => r.domain) : [])]).catch(() => new Map()),
      realSerp ? crawlCompetitorPages(realSerp.map(r => r.url)) : Promise.resolve(new Map()),
      fetchPSIMetrics(`https://${domain}`, 20000),
    ])
    const result = extractJSON<RankingEngineResult>(raw)

    // Real data always wins over whatever Claude produced, regardless of how well
    // it followed the instructions above — guarantees the keyword numbers, SERP
    // features, competitor domain list, and (wherever each real source has that
    // particular domain) per-domain DA/referring-domains/word-count are accurate
    // even if the model didn't comply exactly.
    if (realMetrics?.searchVolume != null) result.keyword.volume = realMetrics.searchVolume
    if (realMetrics?.difficulty != null) result.keyword.difficulty = realMetrics.difficulty
    if (realMetrics?.cpc != null) result.keyword.cpc = `$${realMetrics.cpc.toFixed(2)}`
    if (realMetrics?.trend) result.keyword.trend = realMetrics.trend
    if (realFeatures) result.keyword.serp_features = realFeatures
    if (realUserDa != null) result.website.da_score = realUserDa
    if (realIntent) result.keyword.intent = realIntent
    if (realRelated && realRelated.length > 0) {
      result.keyword.related = realRelated.map(r => ({ kw: r.keyword, vol: r.volume, diff: r.difficulty }))
    }
    // Real Lighthouse performance score doubles as the technical-SEO score — the
    // same simplification SEO Audit's own PSI integration makes (page speed is a
    // large, directly-measurable chunk of what "technical SEO" means in practice),
    // rather than leaving it as a pure AI guess.
    if (psiMetrics?.performanceScore != null) result.website.technical_score = psiMetrics.performanceScore

    // score.factors drives the "Ranking Factors" panel and the headline gauge —
    // was previously left as Claude's independent, unsynced guess even after the
    // two lines above replaced website.da_score/technical_score with real values,
    // so the same domain's authority/technical scores could show two different
    // numbers in two panels. Sync whichever factors have a real source.
    if (result.score?.factors?.domain_authority && realUserDa != null) {
      result.score.factors.domain_authority.score = realUserDa
    }
    if (result.score?.factors?.technical_seo && psiMetrics?.performanceScore != null) {
      result.score.factors.technical_seo.score = psiMetrics.performanceScore
    }

    // Real referring-domain count for the user's own domain — domain-level
    // authority/backlinks are legitimately comparable regardless of which keyword
    // is being evaluated (unlike word count/content depth, which is specific to a
    // page the user may not have written yet, so that one stays an AI estimate).
    // Scored with the same log-scale formula the Gaps tab already applies to the
    // competitor-avg bar, so both sides of that comparison use identical methodology.
    const userRd = rdMap.get(domain.toLowerCase())
    const userRdIsReal = typeof userRd === 'number'
    if (userRdIsReal) {
      const scaled = scaleRdToScore(userRd!)
      result.website.backlink_score = scaled
      if (result.score?.factors?.backlinks) result.score.factors.backlinks.score = scaled
    }

    if (realSerp) {
      const aiTop = Array.isArray(result.competitors?.top) ? result.competitors.top : []
      result.competitors.top = realSerp.map((r, i) => {
        const opr = competitorOprMap.get(r.domain)
        const realDa = opr && opr.status_code === 200 && typeof opr.page_rank_decimal === 'number' ? scaleOPR(opr.page_rank_decimal) : null
        const realRd = rdMap.get(r.domain)
        const pageStats = competitorPageStats.get(r.url)
        return {
          domain: r.domain,
          // Real SERP position and URL — previously fetched via getTopSerpResults()
          // but discarded here, so the UI only showed an implicit list order with no
          // actual rank number or link to verify against.
          position: r.rank,
          url: r.url,
          da: realDa ?? aiTop[i]?.da ?? result.competitors?.avg_da ?? 40,
          // Per-row flags since none of OPR / the bulk backlinks lookup / the page
          // crawl has every domain covered — some rows in the same table are real,
          // some estimated, not an all-or-nothing column.
          daIsReal: realDa != null,
          rd: realRd ?? aiTop[i]?.rd ?? result.competitors?.avg_rd ?? 100,
          rdIsReal: realRd != null,
          words: pageStats?.words ?? aiTop[i]?.words ?? result.competitors?.avg_words ?? 1500,
          wordsIsReal: pageStats?.words != null,
        }
      })
      // avg_da/avg_rd/avg_words now mix real and estimated per-domain values
      // (whichever each domain resolved to above) — recompute so the displayed
      // averages match what the table actually shows instead of Claude's guesses.
      if (result.competitors && result.competitors.top.length > 0) {
        const top = result.competitors.top
        result.competitors.avg_da = Math.round(top.reduce((sum, c) => sum + c.da, 0) / top.length)
        result.competitors.avg_rd = Math.round(top.reduce((sum, c) => sum + c.rd, 0) / top.length)
        result.competitors.avg_words = Math.round(top.reduce((sum, c) => sum + c.words, 0) / top.length)
      }

      // Real schema types actually found across the crawled competitor pages —
      // replaces Claude's guessed list entirely when we have at least one real
      // crawl result (a real "here's what's actually there" beats a partial mix).
      const realSchemaTypes = [...new Set([...competitorPageStats.values()].flatMap(s => s.schemaTypes))]
      if (competitorPageStats.size > 0) result.competitors.schema_types = realSchemaTypes

      // Real freshness summary from actual dateModified/datePublished found on the
      // crawled pages — falls back to Claude's estimate if nothing crawled
      // successfully returned a usable date.
      const freshDates = [...competitorPageStats.values()].map(s => s.lastUpdated).filter((d): d is string => d != null)
      if (freshDates.length > 0) {
        const sixMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 182
        const recentCount = freshDates.filter(d => Date.parse(d) >= sixMonthsAgo).length
        result.competitors.freshness = `${recentCount} of ${freshDates.length} checked competitors updated within 6 months`
      }
    }

    // Raw RD delta for the Gaps tab's backlinks badge (shown in RD units, not the
    // 0-100 score above) — only trustworthy once competitors.avg_rd has settled to
    // its final real-or-estimated value from the block above, so this runs after it.
    if (userRdIsReal && result.website.gaps && typeof result.competitors?.avg_rd === 'number') {
      result.website.gaps.backlinks = userRd! - result.competitors.avg_rd
    }

    // overall/label are recomputed deterministically from factors after every
    // possible factor overwrite above (domain authority, technical SEO, backlinks)
    // — Claude's own arithmetic on its stated "weighted sum / 100" rule isn't
    // reliably self-consistent, so this never trusts result.score.overall/label
    // as returned by the model, real data or not.
    if (result.score?.factors) {
      result.score.overall = computeOverallScore(result.score.factors)
      result.score.label = labelForScore(result.score.overall)
    }

    // Analytics: awaited but fully isolated — a PostHog failure never surfaces to the user
    await trackToolRun(user, 'ranking-engine').catch(() => {})

    return apiSuccess({
      ...result,
      userPlan: user.plan,
      // Not persisted anywhere (this tool is stateless, one-shot per request) — just
      // tells the frontend which of the fields above are real vs. still AI-estimated.
      dataQuality: {
        keywordVolume: realMetrics?.searchVolume != null,
        keywordDifficulty: realMetrics?.difficulty != null,
        keywordCpc: realMetrics?.cpc != null,
        keywordTrend: !!realMetrics?.trend,
        keywordIntent: !!realIntent,
        keywordRelated: !!realRelated && realRelated.length > 0,
        serpFeatures: !!realFeatures,
        serpTop: !!realSerp,
        userAuthority: userAuthorityIsReal,
        userReferringDomains: userRdIsReal,
        competitorAuthority: !!realSerp && realSerp.some(r => {
          const opr = competitorOprMap.get(r.domain)
          return opr && opr.status_code === 200
        }),
        competitorReferringDomains: !!realSerp && realSerp.some(r => rdMap.has(r.domain)),
        competitorWords: competitorPageStats.size > 0,
        competitorSchemaTypes: competitorPageStats.size > 0,
        competitorFreshness: [...competitorPageStats.values()].some(s => s.lastUpdated != null),
        technicalScore: psiMetrics?.performanceScore != null,
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/ranking-engine' })
    return apiError(e)
  }
}

async function trackToolRun(user: AuthedUser, toolName: string): Promise<void> {
  // Sum usage across all months to determine if this is the user's first-ever tool run.
  // requireAuth already incremented the counter before the AI call, so totalRuns === 1
  // means this is the very first successful call this user has ever made.
  const agg = await prisma.usage.aggregate({
    where: { userId: user.userId },
    _sum: { count: true },
  })
  const totalRuns = agg._sum.count ?? 0
  const isFirst = totalRuns === 1

  await captureServerEvent(user.clerkId, 'tool_run_completed', {
    tool_name: toolName,
    $set: { plan: user.plan },
  })

  if (isFirst) {
    await captureServerEvent(user.clerkId, 'first_tool_run', {
      tool_name: toolName,
      is_first_ever_run: true,
      $set: { activated: true, plan: user.plan },
    })
  }
}
