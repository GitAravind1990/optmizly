import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEMS: Record<string, (ctx: string, city: string) => string> = {
  entities: (ctx, city) => `You are a hyperlocal SEO expert. Analyse content for local entity gaps. ${ctx}
Return ONLY valid JSON: {"local_entity_score":0,"summary":"","present_local_entities":[],"missing":{"neighborhoods":[],"landmarks":[],"service_areas":[],"local_institutions":[],"regional_terms":[],"local_competitors_to_reference":[],"local_events_or_seasons":[]},"priority_additions":[{"entity":"","type":"","why":"","example_sentence":""}],"hyperlocal_score_breakdown":{"geographic_specificity":0,"area_coverage":0,"local_brand_signals":0,"regional_language":0}}
Rules: priority_additions: top 5 most impactful with example sentence. All specific to ${city}.`,

  nap: (ctx, city) => `You are a Local SEO schema and NAP expert. ${ctx}
Return ONLY valid JSON: {"nap_audit":{"name_found":false,"name_value":"","address_found":false,"address_value":"","phone_found":false,"phone_value":"","nap_score":0,"consistency_issues":[]},"schema_audit":{"current_schema_types":[],"missing_schema_types":[],"recommended_primary_type":"","schema_score":0},"recommendations":[],"json_ld":""}
Rules: json_ld = complete LocalBusiness JSON-LD with @context, @type, name, address, telephone, areaServed including ${city}.`,

  queries: (ctx, city) => `You are an expert in local search intent and AI Overview optimisation. ${ctx}
Return ONLY valid JSON: {"location":"${city}","overall_local_coverage":0,"summary":"","queries":[{"query":"","platform":"Google AI Overview|ChatGPT|Perplexity|All","intent_type":"near-me|city-service|best-in-area|comparison|emergency|seasonal","coverage_score":0,"verdict":"strong|partial|weak|missing","gap":"","fix":""}]}
Rules: exactly 12 queries (3 near-me, 3 city-service, 2 best-in-area, 2 comparison, 1 emergency, 1 seasonal).`,

  gbp: (ctx, city) => `You are a Google Business Profile strategist. ${ctx}
Return ONLY valid JSON: {"gbp_posts":[{"type":"offer|update|event|product","title":"","body":"","cta":"Learn more|Book|Order|Call","hashtags":[]}],"qa_pairs":[{"question":"","answer":""}],"review_responses":[{"star_rating":"5-star|4-star|mixed|negative","scenario":"","response":""}],"gbp_description":"","seo_tip":""}
Rules: 4 posts, 6 Q&A pairs, 4 review templates. gbp_description: 750 chars. All mention ${city} naturally.`,
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('local')
    const { content, subTool, businessName, city, service, phone } = await req.json()

    if (!city) return apiError(new Error('City is required'))
    if (!SYSTEMS[subTool]) return apiError(new Error('Invalid subTool'))

    const ctx = `Business: ${businessName || 'local business'} | Location: ${city} | Service: ${service || 'local service'}${phone ? ` | Phone: ${phone}` : ''}`
    const system = SYSTEMS[subTool](ctx, city)

    const prompts: Record<string, string> = {
      entities: `Analyze local entity gaps:\n\n${content.slice(0, 4500)}`,
      nap: `Audit NAP and generate schema:\n\n${content.slice(0, 4000)}`,
      queries: `Map local AI queries for:\nBusiness: ${businessName}\nLocation: ${city}\nService: ${service}\n\nContent:\n${content.slice(0, 4000)}`,
      gbp: `Generate GBP content for:\nBusiness: ${businessName}\nLocation: ${city}\nService: ${service}\n\nContent:\n${content.slice(0, 3500)}`,
    }

    const raw = await callClaude(system, prompts[subTool], 2500)
    return apiSuccess({ ...extractJSON(raw), subTool, userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
