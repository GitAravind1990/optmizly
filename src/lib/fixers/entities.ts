import { callClaude } from '@/lib/anthropic'

export interface FixerIssue {
  issue: string
  category: string
  fix: string
  impact: string
}

export interface AppliedFix {
  issue: string
  entity: string
  definition: string
  location: string
}

export async function fixEntityIssues(
  content: string,
  issues: FixerIssue[]
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  const entityIssues = issues.filter((i) => i.category === 'entities')

  if (entityIssues.length === 0) {
    return { fixed_content: content, applied_fixes: [] }
  }

  const industry = detectIndustry(content)
  const issuesList = entityIssues.slice(0, 5).map((i) => i.issue).join('\n')

  const prompt = `Industry: ${industry}

Content (first 1000 chars):
${content.substring(0, 1000)}

Find ALL undefined entities in these issues:
${issuesList}

For each, return: entity name, definition (2-3 sentences), where it appears.

JSON only:
{"fixes": [{"entity": "name", "definition": "definition", "location": "where"}]}`

  try {
    const raw = await callClaude(
      'Add definitions for undefined business terms. Return JSON only.',
      prompt,
      2000,
      'claude-haiku-4-5-20251001'
    )

    let fixesData: any = { fixes: [] }
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      fixesData = JSON.parse(jsonMatch[0])
    }

    let fixedContent = content
    const appliedFixes: AppliedFix[] = []

    if (fixesData.fixes && Array.isArray(fixesData.fixes)) {
      for (const fix of fixesData.fixes) {
        if (fix.entity && fix.definition) {
          const regex = new RegExp(`\\b${fix.entity}\\b`, 'g')
          let count = 0
          fixedContent = fixedContent.replace(regex, (match) => {
            count++
            return count === 1 ? `<strong>${match}</strong> (${fix.definition})` : match
          })
          if (count > 0) {
            appliedFixes.push({
              issue: `Entity: ${fix.entity}`,
              entity: fix.entity,
              definition: fix.definition,
              location: fix.location || 'Content'
            })
          }
        }
      }
    }

    return { fixed_content: fixedContent, applied_fixes: appliedFixes }
  } catch (e) {
    return { fixed_content: content, applied_fixes: [] }
  }
}

function detectIndustry(content: string): string {
  const keywords: Record<string, string[]> = {
    'software': ['API', 'platform', 'cloud', 'database', 'integration'],
    'restaurant': ['menu', 'chef', 'cuisine', 'dish', 'ingredients'],
    'medical': ['patient', 'treatment', 'doctor', 'surgery', 'hospital'],
    'real estate': ['property', 'listing', 'mortgage', 'bedroom'],
    'ecommerce': ['product', 'price', 'design', 'material'],
    'coaching': ['coach', 'training', 'client', 'goal'],
  }

  const contentLower = content.toLowerCase()
  for (const [industry, words] of Object.entries(keywords)) {
    if (words.filter((w) => contentLower.includes(w.toLowerCase())).length >= 2) {
      return industry
    }
  }
  return 'business'
}