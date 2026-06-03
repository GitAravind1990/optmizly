import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `You are a structured data expert. Analyze the provided content and suggest which JSON-LD schemas would be most beneficial for SEO, regardless of business type.

Return ONLY valid JSON:
{
  "business_type": "what type of business/website is this (e.g., local service, e-commerce, SaaS, blog, coaching)?",
  "suggested_schemas": [
    {
      "schema_type": "Organization|LocalBusiness|Product|Service|BlogPosting|FAQPage|Person|BreadcrumbList|WebSite|Event",
      "reason": "why this schema is relevant for SEO",
      "confidence": "high|medium|low"
    }
  ],
  "extracted_data": {
    "business_name": "",
    "website_url": "",
    "address": "",
    "phone": "",
    "email": "",
    "services": [""],
    "products": [""],
    "people": [{"name": "", "title": ""}],
    "faq_items": [{"question": "", "answer": ""}],
    "article_title": "",
    "publication_date": "",
    "author_name": "",
    "industry": ""
  }
}

Rules:
- Suggest 3-5 most relevant schemas (not all)
- Business type can be ANYTHING: clinic, restaurant, e-shop, SaaS, blog, freelancer, etc.
- Extract actual data from content (names, services, products, people, FAQs, etc.)
- Use realistic data from the content, not made-up values
- If data is missing, leave field empty string or empty array`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('schema')
    const { content } = await req.json()

    if (!content || content.length < 100) {
      return apiError({ message: 'Content too short (min 100 chars)', status: 400, name: 'ValidationError' })
    }

    const prompt = `Analyze this content and suggest the best JSON-LD schemas for SEO. Infer the business type from the content and suggest appropriate schemas:

${content.slice(0, 4000)}`

    const raw = await callClaude(SYSTEM, prompt, 2000, 'claude-haiku-4-5-20251001')
    const result = extractJSON(raw)

    return apiSuccess({
      ...result,
      userPlan: user.plan,
    })
  } catch (e) {
    return apiError(e)
  }
}