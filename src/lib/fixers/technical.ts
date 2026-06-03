import { callClaude } from '@/lib/anthropic'

export interface FixerIssue {
  issue: string
  category: string
  fix: string
  impact: string
}

export interface AppliedFix {
  issue: string
  recommendation: string
  implementation: string
}

export async function fixTechnicalIssues(
  content: string,
  issues: FixerIssue[]
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  const technicalIssues = issues.filter((i) => i.category === 'technical')

  if (technicalIssues.length === 0) {
    return { fixed_content: content, applied_fixes: [] }
  }

  const issuesList = technicalIssues.slice(0, 3).map((i) => i.issue).join('\n')

  const prompt = `Provide technical SEO recommendations.

Issues:
${issuesList}

For each issue, suggest: what to do, how to implement it.

JSON:
{"fixes": [{"issue": "problem", "recommendation": "what to do", "implementation": "how"}]}`

  try {
    const raw = await callClaude(
      'Suggest technical SEO fixes with implementation steps. Return JSON only.',
      prompt,
      1500,
      'claude-haiku-4-5-20251001'
    )

    let fixesData: any = { fixes: [] }
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      fixesData = JSON.parse(jsonMatch[0])
    }

    const appliedFixes: AppliedFix[] = []
    let technicalNotes = '\n\n<!-- TECHNICAL SEO RECOMMENDATIONS -->\n'

    if (fixesData.fixes && Array.isArray(fixesData.fixes)) {
      for (const fix of fixesData.fixes) {
        if (fix.recommendation && fix.implementation) {
          technicalNotes += `<!-- ${fix.issue}: ${fix.recommendation} -->\n`
          appliedFixes.push({
            issue: `Technical: ${fix.issue}`,
            recommendation: fix.recommendation,
            implementation: fix.implementation.substring(0, 150)
          })
        }
      }
    }

    technicalNotes += '<!-- END TECHNICAL SEO RECOMMENDATIONS -->\n'
    const fixedContent = technicalNotes + content

    return { fixed_content: fixedContent, applied_fixes: appliedFixes }
  } catch (e) {
    return { fixed_content: content, applied_fixes: [] }
  }
}