import { NextRequest } from 'next/server'
import { requireAuth, type AuthedUser } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { captureServerEvent, captureServerException } from '@/lib/posthog-server'
import { getTopSerpResults, getKeywordMetrics } from '@/lib/dataforseo'

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
  keyword: { volume: number; difficulty: number; [key: string]: unknown }
  competitors: {
    avg_da?: number
    avg_rd?: number
    avg_words?: number
    top?: Array<{ domain: string; da: number; rd: number; words: number }>
    [key: string]: unknown
  }
  [key: string]: unknown
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
    // Real top-10 SERP and real search volume/difficulty, fetched concurrently
    // since neither depends on the other or on the AI call. Fed into the prompt so
    // Claude's own output (and any fields it invents around them, like per-domain
    // DA estimates) is at least anchored to the keyword's actual current ranking
    // page — not required for the call to proceed if either fails.
    const [serpResult, metricsMap] = await Promise.all([
      getTopSerpResults(keyword, targetLocation, 'desktop', 10),
      getKeywordMetrics([keyword], targetLocation),
    ])
    const realMetrics = metricsMap.get(keyword)
    const realSerp = serpResult && serpResult.length > 0 ? serpResult : null

    const realDataLines = [
      realSerp ? `Real current top ${realSerp.length} Google organic results for this exact keyword (use these exact domains for competitors.top and competitors' order — do not invent different domains): ${realSerp.map(r => r.domain).join(', ')}` : null,
      realMetrics?.searchVolume != null ? `Real monthly search volume: ${realMetrics.searchVolume}` : null,
      realMetrics?.difficulty != null ? `Real keyword difficulty: ${realMetrics.difficulty}/100` : null,
    ].filter(Boolean).join('\n')

    const raw = await callClaude(
      SYSTEM,
      `Keyword: ${keyword}\nDomain: ${domain}\nCountry: ${country}\nGoal: ${goal}${realDataLines ? `\n\n${realDataLines}` : ''}\n\nEstimate website metrics from the domain URL. Small/new sites: DA 10-25. Established niche sites: DA 30-55. Major brands: DA 70+. ${realSerp ? "Estimate per-domain DA/referring-domains/word-count for the real competitor domains given above." : "Generate realistic competitor data for this keyword's niche."}`,
      2500,
      'claude-sonnet-4-6'
    )
    const result = extractJSON<RankingEngineResult>(raw)

    // Real data always wins over whatever Claude produced, regardless of how well
    // it followed the instructions above — guarantees the keyword numbers and
    // competitor domain list are accurate even if the model didn't comply exactly.
    // Per-domain DA/referring-domains/word-count stay as Claude's estimates (kept
    // aligned to the real domain by position) since those need per-URL crawl/
    // backlink data this tool doesn't fetch.
    if (realMetrics?.searchVolume != null) result.keyword.volume = realMetrics.searchVolume
    if (realMetrics?.difficulty != null) result.keyword.difficulty = realMetrics.difficulty
    if (realSerp) {
      const aiTop = Array.isArray(result.competitors?.top) ? result.competitors.top : []
      result.competitors.top = realSerp.map((r, i) => ({
        domain: r.domain,
        da: aiTop[i]?.da ?? result.competitors?.avg_da ?? 40,
        rd: aiTop[i]?.rd ?? result.competitors?.avg_rd ?? 100,
        words: aiTop[i]?.words ?? result.competitors?.avg_words ?? 1500,
      }))
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
        serpTop: !!realSerp,
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
