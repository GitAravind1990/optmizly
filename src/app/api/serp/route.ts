import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { captureServerException } from '@/lib/posthog-server'
import { getTopSerpResults } from '@/lib/dataforseo'

export const runtime = 'nodejs'
export const maxDuration = 60

// Was previously an Apify Google Search Scraper call gated on APIFY_API_TOKEN —
// that env var was never configured in production (confirmed via `vercel env ls`),
// so this always silently returned [] and every "competitor" (including their
// URLs) was 100% Claude-fabricated, with no indication to the user. Replaced with
// the same proven, already-paid-for DataForSEO SERP endpoint every other real-data
// tool in this codebase uses (Ranking Engine, Content Gap grounding, etc.).
async function fetchRealSERP(
  keyword: string,
  city?: string,
  countryCode: string = 'us'
): Promise<Array<{ url: string; domain: string; position: number }>> {
  const searchQuery = city ? `${keyword} ${city}` : keyword
  const targetLocation = countryCode.toUpperCase()
  const result = await getTopSerpResults(searchQuery, targetLocation, 'desktop', 10).catch(() => null)
  if (!result || result.items.length === 0) return []
  return result.items.map(i => ({ url: i.url, domain: i.domain, position: i.rank }))
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('serp')
    clerkId = user.clerkId
    const { url, keyword, position, biztype, city, countryCode } = await req.json()

    if (!url || !keyword) return apiError(new Error('URL and keyword are required'))

    const realSerpData = await fetchRealSERP(keyword, city, countryCode || 'us')
    const serpContext = realSerpData.length > 0 
     ? `\n\nREAL GOOGLE SERP TOP 5 URLS (use these exactly):\n${realSerpData.slice(0, 5).map(r => `${r.position}. ${r.domain} — ${r.url}`).join('\n')}`
      : '\n\nNo real SERP data available — use best estimates.'

    const ctx = `URL:${url} | Keyword:"${keyword}" | Position:#${position || '?'} | Biz:${biztype || 'business'}${city ? ` | City:${city}` : ''}${serpContext}`

    const sys1 = `SEO strategist. Return ONLY valid JSON. CRITICAL: Use the REAL SERP URLs provided above as the actual competitors. Do NOT make up URLs. Context: ${ctx}.
{"serp_overview":{"dominant_types":[""],"serp_features":[""],"competition_level":"medium","ymyl":false},"competitors":[{"rank":1,"url":"","authority":"high","page_type":"","word_count":"2000","local_signals":"medium","eeat":"medium","schema":["LocalBusiness"],"backlinks":"medium"}],"root_causes":[{"dimension":"","diagnosis":"","severity":"high"}],"competitor_explanations":[{"rank":1,"url":"","page_type_model":"root_domain|subdirectory|directory_listicle|local_native|national_chain","why_they_rank":"","gap_to_close":""}],"gap_scores":{"target":{"domain_authority":0,"local_signals":0,"content_depth":0,"eeat":0,"backlinks":0,"technical_health":0,"brand_authority":0},"competitor1":{"name":"","domain_authority":0,"local_signals":0,"content_depth":0,"eeat":0,"backlinks":0,"technical_health":0,"brand_authority":0},"competitor2":{"name":"","domain_authority":0,"local_signals":0,"content_depth":0,"eeat":0,"backlinks":0,"technical_health":0,"brand_authority":0},"competitor3":{"name":"","domain_authority":0,"local_signals":0,"content_depth":0,"eeat":0,"backlinks":0,"technical_health":0,"brand_authority":0}}}
Rules: Use the EXACT URLs from the real SERP data above. 5 competitors from the actual SERP. 4 root_causes. gap scores 1-10. Strings max 12 words.`

    const sys2 = `SEO recovery strategist. Return ONLY valid JSON. Context: ${ctx}.
{"action_plan":{"phase1":[{"task":"","why":"","effort":"2hrs","impact":"high","priority":"critical"}],"phase2":[{"task":"","why":"","effort":"3days","impact":"high","priority":"high"}],"phase3":[{"task":"","why":"","effort":"2wks","impact":"high","priority":"medium"}]},"rank_projection":[{"month":"Mo 1","position":0},{"month":"Mo 2","position":0},{"month":"Mo 3","position":0},{"month":"Mo 4","position":0},{"month":"Mo 5","position":0},{"month":"Mo 6","position":0}],"structural_recommendation":{"title":"","detail":"","tradeoffs":""}}
Rules: phase1=3 tasks (weeks 1-4), phase2=3 tasks (weeks 5-10), phase3=3 tasks (weeks 11-20). Realistic rank projection.`

    const [r1, r2] = await Promise.all([
      callClaude(sys1, `SERP audit for: ${url} targeting "${keyword}"`, 4000, 'claude-sonnet-4-6'),
      callClaude(sys2, `Recovery plan for: ${url} targeting "${keyword}"`, 2000, 'claude-sonnet-4-6'),
    ])

    const result = {
      ...extractJSON(r1),
      ...extractJSON(r2),
      _real_serp: realSerpData,
      _meta: { url, keyword, position, city, has_real_data: realSerpData.length > 0 },
      plan: user.plan,
    }

    return apiSuccess(result)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/serp' })
    return apiError(e)
  }
}