import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'
export const maxDuration = 60

type AuthorProfile = {
  name?: string
  title?: string
  credentials?: string
  experience?: string
  reviewer_name?: string
  reviewer_credentials?: string
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('fixer')
    const { content, issues, author } = await req.json()

    if (!content || content.length < 50) {
      return apiError({ message: 'Content too short (min 50 chars)', status: 400, name: 'ValidationError' })
    }
    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return apiError({ message: 'At least one issue required', status: 400, name: 'ValidationError' })
    }

    const originalWordCount = content.trim().split(/\s+/).length
    
    // Build issue list
    const issuesToFix = issues.slice(0, 5).map((i: any, idx: number) => 
      `${idx + 1}. [${i.impact || 'medium'}] ${i.issue}`
    ).join('\n')

    // Build author info if provided
    const authorInfo = author as AuthorProfile | undefined
    const authorBlock = authorInfo?.name 
      ? `Author: ${authorInfo.name}${authorInfo.credentials ? ' | ' + authorInfo.credentials : ''}\nReviewer: ${authorInfo.reviewer_name || 'Not specified'}`
      : ''

    const systemPrompt = `You are a surgical editor. Your job is to identify the EXACT problematic sentence for each issue and provide ONLY the fixed version of that sentence. Do NOT rewrite the whole article. Do NOT condense. Return ONLY valid JSON.`

    const userPrompt = `Fix these ${Math.min(issues.length, 5)} issues. For each issue, find the exact problematic sentence in the content and provide the fixed version.

ISSUES TO FIX:
${issuesToFix}

${authorBlock ? `AUTHOR INFO:\n${authorBlock}\n` : ''}

CONTENT:
${content}

Return ONLY this JSON structure (no markdown, no code fences, no explanation):
{
  "fixes": [
    {
      "issue_num": 1,
      "problem": "the exact problematic sentence from the content",
      "solution": "the fixed version of that sentence"
    }
  ]
}

Important: The fixed sentence should be an improvement of the problematic sentence, not a complete rewrite. Keep the original meaning and structure.`

    const raw = await callClaude(systemPrompt, userPrompt, 3000, 'claude-haiku-4-5-20251001')

    // Parse JSON response
    let fixesData: any = { fixes: [] }
    try {
      // Extract JSON from potential markdown fences
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        fixesData = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('JSON parse error:', e)
      return apiError({ message: 'Failed to parse fixes from Claude', status: 500, name: 'ParseError' })
    }

    // Apply fixes to original content (surgical replacement)
    let fixedContent = content
    const appliedFixes = []

    if (fixesData.fixes && Array.isArray(fixesData.fixes)) {
      for (const fix of fixesData.fixes) {
        if (fix.problem && fix.solution && typeof fix.problem === 'string' && typeof fix.solution === 'string') {
          // Try to replace the problematic sentence
          if (fixedContent.includes(fix.problem)) {
            fixedContent = fixedContent.replace(fix.problem, fix.solution)
            appliedFixes.push({
              issue: issues[fix.issue_num - 1]?.issue || `Issue ${fix.issue_num}`,
              problem_sentence: fix.problem.substring(0, 100) + '...',
              fixed_sentence: fix.solution.substring(0, 100) + '...'
            })
          }
        }
      }
    }

    // Calculate word counts
    const newWordCount = fixedContent.trim().split(/\s+/).length
    const lengthRatio = Math.round((newWordCount / originalWordCount) * 100)

    // Determine if content meets preservation requirement
    const meetsRequirement = lengthRatio >= 95
    const warning = !meetsRequirement 
      ? `⚠️ Fixed content is ${lengthRatio}% of original (needs ≥95%). Try running again.`
      : lengthRatio > 100
      ? `✅ Fixed content grew to ${lengthRatio}% (excellent preservation)`
      : `✅ Fixed content at ${lengthRatio}% (good preservation)`

    return apiSuccess({
      fixed_content: fixedContent,
      applied_fixes: appliedFixes,
      changes_summary: `Fixed ${appliedFixes.length} issues while preserving original article structure.`,
      original_word_count: originalWordCount,
      new_word_count: newWordCount,
      length_ratio: lengthRatio,
      meets_requirement: meetsRequirement,
      status_message: warning,
      userPlan: user.plan,
    })
  } catch (e) {
    return apiError(e)
  }
}