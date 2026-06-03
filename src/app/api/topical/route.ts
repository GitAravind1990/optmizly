import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('topical')
    const { niche, urls = [] } = await req.json()

    if (!niche || niche.length < 3) return apiError(new Error('Niche is required'))
    const urlBlock = urls.length ? (urls as string[]).join(', ') : 'none provided'

    // Single comprehensive call instead of 5 separate calls
    const system = `You are a topical authority strategist. Return ONLY valid JSON with no empty strings.

Example of correct output for niche "coffee shop business":
{
  "pillars": [
    {
      "title": "How to Start a Coffee Shop",
      "slug": "how-to-start-a-coffee-shop",
      "intent": "informational",
      "monthly_searches": "8,100/mo",
      "keywords": ["start coffee shop", "open coffee shop", "coffee shop startup"],
      "clusters": [
        {
          "title": "Coffee Shop Startup Costs Breakdown",
          "slug": "coffee-shop-startup-costs",
          "intent": "informational",
          "difficulty": "medium",
          "monthly_searches": "2,400/mo",
          "primary_keyword": "coffee shop startup costs",
          "word_count_target": 1500,
          "ai_cite_score": 72,
          "covered": false
        }
      ]
    }
  ],
  "authority_score": 35,
  "coverage_grade": "D",
  "ai_overview_readiness": 40,
  "summary": "Your topical coverage for coffee shop business is sparse with major gaps in startup guidance and operations content.",
  "content_gaps": [
    {"title": "Coffee Shop Equipment Guide", "impact": "high", "why": "High search volume, no existing coverage"}
  ],
  "quick_wins": ["Add cost breakdown table to existing content", "Create FAQ schema markup"],
  "content_calendar": [
    {"week": 1, "title": "Coffee Shop Startup Costs Breakdown", "type": "cluster", "why_now": "High intent, quick to rank"}
  ]
}

Rules:
- Exactly 3 pillar pages, each with exactly 3 cluster pages
- All strings must have actual content, no empty strings
- authority_score: 0-100 based on URL coverage
- coverage_grade: S(90+) A(75+) B(55+) C(35+) D(<35)
- exactly 3 content_gaps, exactly 3 quick_wins, exactly 6 content_calendar weeks
- covered: true only if existing URL clearly covers that topic`

    const prompt = `Niche: ${niche}
Existing URLs: ${urlBlock}

Generate a complete topical authority map with 3 pillars × 3 clusters each, plus scoring and content plan.`

    const raw = await callClaude(system, prompt, 3500)
    const data = extractJSON<{
      pillars: Array<{
        title: string; slug: string; intent: string; monthly_searches: string
        keywords: string[]
        clusters: Array<{
          title: string; slug: string; intent: string; difficulty: string
          monthly_searches: string; primary_keyword: string
          word_count_target: number; ai_cite_score: number; covered: boolean
        }>
      }>
      authority_score: number; coverage_grade: string; ai_overview_readiness: number
      summary: string
      content_gaps: Array<{ title: string; impact: string; why: string }>
      quick_wins: string[]
      content_calendar: Array<{ week: number; title: string; type: string; why_now: string }>
    }>(raw)

    if (!data?.pillars?.length) throw new Error('Could not generate topical map. Try a more specific niche.')

    const pillars = data.pillars.slice(0, 3)
    let totalTopics = 0, coveredCount = 0

    const pillar_pages = pillars.map(p => {
      const clusters = (p.clusters ?? []).slice(0, 3)
      totalTopics += 1 + clusters.length
      const pcov = (urls as string[]).some(u => u.toLowerCase().includes(p.slug.split('-')[0]))
      if (pcov) coveredCount++
      clusters.forEach(c => { if (c.covered) coveredCount++ })
      return {
        ...p,
        covered: pcov,
        ai_cite_score: p.clusters?.[0]?.ai_cite_score ?? Math.floor(45 + Math.random() * 40),
        word_count_target: 2500,
        clusters,
      }
    })

    return apiSuccess({
      topic: niche,
      authority_score: data.authority_score ?? 0,
      coverage_grade: data.coverage_grade ?? 'D',
      summary: data.summary ?? '',
      ai_overview_readiness: data.ai_overview_readiness ?? 0,
      pillar_pages,
      coverage_stats: {
        total_topics: totalTopics,
        covered: coveredCount,
        missing: totalTopics - coveredCount,
        coverage_pct: totalTopics ? Math.round((coveredCount / totalTopics) * 100) : 0,
      },
      content_gaps: data.content_gaps ?? [],
      quick_wins: data.quick_wins ?? [],
      content_calendar: data.content_calendar ?? [],
      userPlan: user.plan,
    })
  } catch (e) {
    return apiError(e)
  }
}
