import { callClaude } from '@/lib/anthropic'

export interface FixerIssue {
  issue: string
  category: string
  fix: string
  impact: string
}

export interface AuthorProfile {
  name?: string
  title?: string
  credentials?: string
  experience?: string
  reviewer_name?: string
  reviewer_credentials?: string
}

export interface AppliedFix {
  issue: string
  author_section: string
  credentials: string
}

export async function fixEEATIssues(
  content: string,
  issues: FixerIssue[],
  author?: AuthorProfile
): Promise<{ fixed_content: string; applied_fixes: AppliedFix[] }> {
  const eeatIssues = issues.filter((i) => i.category === 'eeat')

  if (eeatIssues.length === 0) {
    return { fixed_content: content, applied_fixes: [] }
  }

  const industry = detectIndustry(content)
  const authorName = author?.name || 'Expert'
  const authorCreds = author?.credentials || 'Professional'

  const prompt = `Create author credentials for ${industry}.

Author: ${authorName}, ${authorCreds}
Experience: ${author?.experience || 'Not provided'}

Write 2-3 sentences establishing expertise.

JSON:
{"author_section": "text here", "placement": "top"}`

  try {
    const raw = await callClaude(
      'Create author credentials section. Return JSON only.',
      prompt,
      1000,
      'claude-haiku-4-5-20251001'
    )

    let fixesData: any = { author_section: '', placement: 'top' }
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      fixesData = JSON.parse(jsonMatch[0])
    }

    let fixedContent = content
    const appliedFixes: AppliedFix[] = []

    if (fixesData.author_section) {
      if (fixesData.placement === 'top') {
        fixedContent = `${fixesData.author_section}\n\n${content}`
      } else {
        fixedContent = `${content}\n\n${fixesData.author_section}`
      }

      appliedFixes.push({
        issue: 'E-E-A-T: Author credentials added',
        author_section: fixesData.author_section.substring(0, 100),
        credentials: authorCreds
      })
    }

    return { fixed_content: fixedContent, applied_fixes: appliedFixes }
  } catch (e) {
    return { fixed_content: content, applied_fixes: [] }
  }
}

function detectIndustry(content: string): string {
  const keywords: Record<string, string[]> = {
    'software': ['API', 'platform', 'cloud'],
    'restaurant': ['menu', 'chef', 'cuisine'],
    'medical': ['patient', 'treatment', 'doctor'],
  }

  const contentLower = content.toLowerCase()
  for (const [industry, words] of Object.entries(keywords)) {
    if (words.filter((w) => contentLower.includes(w.toLowerCase())).length >= 1) {
      return industry
    }
  }
  return 'business'
}