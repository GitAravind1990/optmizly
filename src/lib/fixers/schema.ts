import { callClaude } from '@/lib/anthropic'

export interface AppliedFix {
  issue: string
  schema_type: string
  implementation: string
}

export async function fixSchemaIssues(
  content: string
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  // Detect industry/business type
  const industry = detectIndustry(content)

  // Extract key info from content
  const title = extractTitle(content)
  const businessName = extractBusinessName(content)

  const prompt = `You are a JSON-LD schema expert for the ${industry} industry.

Content:
${content.substring(0, 1500)}

Business name: ${businessName}
Title: ${title}

Generate appropriate JSON-LD schema markup for this ${industry} content. Return ONLY valid JSON (no markdown):

{
  "schemas": [
    {
      "type": "Schema type name (e.g., Organization, Restaurant, SoftwareApplication)",
      "code": "complete JSON-LD schema code as valid JSON object"
    }
  ]
}`

  const raw = await callClaude(
    `You are a JSON-LD schema expert. Generate production-ready schema markup for any industry. Return ONLY JSON.`,
    prompt,
    3000,
    'claude-haiku-4-5-20251001'
  )

  let schemasData: any = { schemas: [] }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      schemasData = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Schema generation error:', e)
    return { fixed_content: content, applied_fixes: [] }
  }

  let fixedContent = content
  const appliedFixes: AppliedFix[] = []

  if (schemasData.schemas && Array.isArray(schemasData.schemas)) {
    // Build schema markup
    let schemaMarkup = '\n\n<!-- JSON-LD Schema Markup -->\n'

    for (const schema of schemasData.schemas) {
      if (schema.type && schema.code) {
        try {
          // Ensure schema.code is valid JSON
          const schemaObj = typeof schema.code === 'string' ? JSON.parse(schema.code) : schema.code
          schemaMarkup += `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>\n`

          appliedFixes.push({
            issue: `Schema markup added: ${schema.type}`,
            schema_type: schema.type,
            implementation: `<script type="application/ld+json"> with ${schema.type} schema`
          })
        } catch (e) {
          console.error('Schema JSON parse error:', e)
        }
      }
    }

    schemaMarkup += '<!-- End JSON-LD Schema -->\n'

    // Inject schema at the beginning (after any existing head content)
    fixedContent = fixedContent + schemaMarkup
  }

  return { fixed_content: fixedContent, applied_fixes: appliedFixes }
}

function detectIndustry(content: string): string {
  const keywords: Record<string, string[]> = {
    'restaurant': ['menu', 'chef', 'cuisine', 'dish', 'reservation', 'dining', 'pasta', 'food'],
    'software': ['API', 'platform', 'cloud', 'database', 'integration', 'deployment', 'SaaS'],
    'healthcare': ['patient', 'treatment', 'doctor', 'hospital', 'diagnosis', 'surgery', 'medical'],
    'real estate': ['property', 'listing', 'mortgage', 'bedroom', 'price', 'agent', 'inspection'],
    'ecommerce': ['product', 'price', 'cart', 'checkout', 'shipping', 'review', 'shop'],
    'coaching': ['coach', 'training', 'client', 'goal', 'session', 'mentor', 'course'],
  }

  const contentLower = content.toLowerCase()

  for (const [industry, words] of Object.entries(keywords)) {
    const matchCount = words.filter((w) => contentLower.includes(w.toLowerCase())).length
    if (matchCount >= 3) {
      return industry
    }
  }

  return 'business'
}

function extractTitle(content: string): string {
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const headingMatch = content.match(/^#+\s(.+)/m)
  const firstLine = content.split('\n')[0]

  return h1Match ? h1Match[1] : headingMatch ? headingMatch[1] : firstLine.substring(0, 100)
}

function extractBusinessName(content: string): string {
  const nameMatch = content.match(/(?:about|company|welcome).*?([A-Z][A-Za-z\s]+)/i)
  return nameMatch ? nameMatch[1].trim() : 'Business'
}