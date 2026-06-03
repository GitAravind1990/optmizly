import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an expert link-building strategist. Analyse the content topic and identify REAL specific websites. Return ONLY valid JSON:
{"summary":"","opportunities":[{"site_name":"","site_url":"","domain_authority":"high|medium","link_type":"guest_post|resource_page|journalist_pitch|directory|podcast|broken_link|partnership","angle":"","why_relevant":"","contact_approach":"","difficulty":"easy|medium|hard","impact":"high|medium|low"}]}
Rules: site_name = REAL website (e.g. "Moz Blog", "Search Engine Journal", "HubSpot Blog"). site_url = actual domain. Generate 8 opportunities. Mix high-DA publications with niche-relevant blogs. Be specific to the content topic.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('backlinks')
    const { content, summary } = await req.json()
    const raw = await callClaude(SYSTEM, `Find backlink opportunities. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`, 2000)
    return apiSuccess({ ...extractJSON(raw), userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}
