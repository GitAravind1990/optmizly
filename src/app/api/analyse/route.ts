import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

const SYSTEM = `You are an expert SEO and content analyst. Analyse the provided content and return ONLY valid JSON. NO other text.

Return this exact structure:
{
  "overall_score": 0-100,
  "grade": "S|A|B|C|D",
  "summary": "brief summary",
  "scores": {
    "technical_seo": 0-100,
    "on_page_seo": 0-100,
    "entity_optimization": 0-100,
    "eeat_signals": 0-100,
    "semantic_richness": 0-100,
    "llm_citation_triggers": 0-100,
    "structured_data": 0-100,
    "authority_reinforcement": 0-100
  },
  "top_issues": [
    {
      "issue": "exact problem description",
      "category": "MUST BE ONE OF: entities|citations|eeat|semantic|technical",
      "type": "specific type of issue",
      "impact": "high|medium|low",
      "fix": "specific actionable fix"
    }
  ],
  "entity_gaps": ["list", "of", "missing", "entities"],
  "quick_wins": ["specific", "quick", "fixes"],
  "llm_citation_tip": "tip for AI search optimization"
}

CATEGORY MAPPING (MANDATORY):
- If issue mentions: schema, meta tag, HTML structure, markup → category: "technical"
- If issue mentions: author, credentials, expertise, author schema → category: "eeat"
- If issue mentions: undefined terms, entities, links to concepts → category: "entities"
- If issue mentions: unsourced claims, citations, attribution, reviews, evidence → category: "citations"
- If issue mentions: vague, shallow, lacking details, weak explanations → category: "semantic"

RULES:
- overall_score: 0-100
- grade: S(90+) A(80+) B(70+) C(55+) D(<55)
- top_issues: 5-7 ranked by impact
- EVERY issue MUST have a category field inside JSON
- Do NOT append category to fix text
- Return ONLY JSON`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('analyse')
    const { content } = await req.json()

    if (!content || content.length < 50) {
      return apiError({ message: 'Content too short', status: 400, name: 'ValidationError' })
    }

    const raw = await callClaude(
      SYSTEM,
      `Analyse this content and categorize each issue with category and type tags:\n\n${content.slice(0, 5000)}`,
      2000,
      'claude-haiku-4-5-20251001'
    )

    const result = extractJSON(raw)

    // Validate and ensure all issues have category and type
    if (result.top_issues && Array.isArray(result.top_issues)) {
      result.top_issues = result.top_issues.map((issue: any) => ({
        ...issue,
        category: issue.category || 'semantic',
        type: issue.type || 'vague_explanation'
      }))
    }

    return apiSuccess({ ...result, userPlan: user.plan })
  } catch (e) {
    return apiError(e)
  }
}