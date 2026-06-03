import { callClaude } from '@/lib/anthropic'

export interface FixerIssue {
  issue: string
  category: string
  fix: string
  impact: string
}

export interface AppliedFix {
  issue: string
  claim: string
  source: string
  location: string
}

export async function fixCitationIssues(
  content: string,
  issues: FixerIssue[]
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  const citationIssues = issues.filter((i) => i.category === 'citations')

  if (citationIssues.length === 0) {
    return { fixed_content: content, applied_fixes: [] }
  }

  const industry = detectIndustry(content)
  const issuesList = citationIssues.slice(0, 5).map((i) => i.issue).join('\n')

  const prompt = `Add citations to unsourced claims for ${industry}.

Content:
${content.substring(0, 800)}

Issues:
${issuesList}

For each unsourced claim, suggest a source attribution.

JSON only:
{"fixes": [{"claim": "exact quote", "source": "attribution"}]}`

  try {
    const raw = await callClaude(
      'Add citations to claims. Return JSON only.',
      prompt,
      1500,
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
        if (fix.claim && fix.source) {
          const regex = new RegExp(escapeRegex(fix.claim), 'g')
          let count = 0
          fixedContent = fixedContent.replace(regex, (match) => {
            count++
            return count === 1 ? `${match} (${fix.source})` : match
          })
          if (count > 0) {
            appliedFixes.push({
              issue: `Citation: ${fix.source}`,
              claim: fix.claim.substring(0, 80),
              source: fix.source,
              location: 'Content'
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
    'software': ['API', 'platform', 'cloud', 'database'],
    'restaurant': ['menu', 'chef', 'cuisine'],
    'medical': ['patient', 'treatment', 'doctor'],
    'real estate': ['property', 'listing', 'mortgage'],
    'ecommerce': ['product', 'price', 'design'],
  }

  const contentLower = content.toLowerCase()
  for (const [industry, words] of Object.entries(keywords)) {
    if (words.filter((w) => contentLower.includes(w.toLowerCase())).length >= 2) {
      return industry
    }
  }
  return 'business'
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}