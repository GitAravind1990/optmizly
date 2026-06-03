import { callClaude } from '@/lib/anthropic'

export interface FixerIssue {
  issue: string
  category: string
  fix: string
  impact: string
}

export interface AppliedFix {
  issue: string
  original_text: string
  expanded_text: string
}

export async function fixSemanticIssues(
  content: string,
  issues: FixerIssue[]
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  const semanticIssues = issues.filter((i) => i.category === 'semantic')

  if (semanticIssues.length === 0) {
    return { fixed_content: content, applied_fixes: [] }
  }

  const issuesList = semanticIssues.slice(0, 3).map((i) => i.issue).join('\n')

  const prompt = `Expand vague claims with details.

Content:
${content.substring(0, 800)}

Vague claims:
${issuesList}

For each vague claim, provide a detailed 2-3 sentence expansion with specifics.

JSON:
{"fixes": [{"vague": "original phrase", "expanded": "detailed version"}]}`

  try {
    const raw = await callClaude(
      'Expand vague claims with details and metrics. Return JSON only.',
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
        if (fix.vague && fix.expanded) {
          const regex = new RegExp(escapeRegex(fix.vague), 'g')
          let count = 0
          fixedContent = fixedContent.replace(regex, (match) => {
            count++
            return count === 1 ? fix.expanded : match
          })
          if (count > 0) {
            appliedFixes.push({
              issue: 'Semantic: Vague claim expanded',
              original_text: fix.vague.substring(0, 80),
              expanded_text: fix.expanded.substring(0, 100)
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}