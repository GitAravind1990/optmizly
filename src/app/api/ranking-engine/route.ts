import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an SEO ranking analyst. Return ONLY valid JSON matching this exact schema:
{"keyword":{"volume":0,"difficulty":0,"cpc":"","intent":"","serp_features":[],"trend":"","related":[{"kw":"","vol":0,"diff":0}],"clusters":[{"name":"","keywords":[""]}]},"competitors":{"avg_da":0,"avg_rd":0,"avg_words":0,"freshness":"","schema_types":[],"eeat_level":"","page_speed":"","top":[{"domain":"","da":0,"rd":0,"words":0}]},"website":{"da_score":0,"backlink_score":0,"topical_score":0,"content_score":0,"technical_score":0,"eeat_score":0,"gaps":{"authority":0,"backlinks":0,"content":0,"topical":0,"technical":0}},"topical":{"published":0,"cluster_pct":0,"covered":[],"missing":[],"semantic_score":0},"content_gaps":{"topics":[],"entities":[],"faqs":[],"schema":[]},"score":{"overall":0,"label":"","factors":{"domain_authority":{"weight":25,"score":0},"backlinks":{"weight":25,"score":0},"content_depth":{"weight":20,"score":0},"topical_authority":{"weight":15,"score":0},"technical_seo":{"weight":10,"score":0},"eeat":{"weight":5,"score":0}},"verdict":"","time_to_rank":""},"forecast":[{"scenario":"","actions":[],"probability":0}],"recommendations":{"blockers":[],"actions":[{"action":"","impact":"","effort":"","gain":0}]},"summary":""}
Rules: overall=weighted sum Σ(factor.weight*factor.score)/100. label: "Very Unlikely"(0-20),"Difficult"(21-40),"Possible"(41-60),"Strong Opportunity"(61-80),"Highly Likely"(81-100). verdict: "Not Recommended"|"Possible but Competitive"|"Highly Likely". time_to_rank: "3-6 Months"|"6-12 Months"|"12+ Months". gaps: negative=deficit(user below competitors),positive=advantage. 3 forecast scenarios(Quick Wins/Serious Investment/Full Authority Build). 4-6 related keywords. 2-3 clusters with 3-4 keywords each. 3-5 real competitor domains likely to rank for this keyword. 5 blockers max. 5-7 action items with impact/effort "High"|"Medium"|"Low" and gain 1-20.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('ranking-engine')
    const { keyword, domain, country, goal } = await req.json()
    if (!keyword || !domain || !country || !goal) {
      return apiError(new Error('keyword, domain, country and goal are required'))
    }
    const raw = await callClaude(
      SYSTEM,
      `Keyword: ${keyword}\nDomain: ${domain}\nCountry: ${country}\nGoal: ${goal}\n\nEstimate website metrics from the domain URL. Small/new sites: DA 10-25. Established niche sites: DA 30-55. Major brands: DA 70+. Generate realistic competitor data for this keyword's niche.`,
      2500,
      'claude-sonnet-4-6'
    )
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
