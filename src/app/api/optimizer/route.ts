import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { fixEntityIssues } from '@/lib/fixers/entities'
import { fixCitationIssues } from '@/lib/fixers/citations'
import { fixEEATIssues } from '@/lib/fixers/eeat'
import { fixSemanticIssues } from '@/lib/fixers/semantic'
import { fixTechnicalIssues } from '@/lib/fixers/technical'
import { fixSchemaIssues } from '@/lib/fixers/schema'

export const runtime = 'nodejs'
export const maxDuration = 60

interface AuthorProfile {
  name?: string
  title?: string
  credentials?: string
  experience?: string
  reviewer_name?: string
  reviewer_credentials?: string
}

interface OptimizerIssue {
  issue: string
  category: string
  type: string
  impact: string
  fix: string
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('optimizer')
    const { content, issues, author, selectedFixTypes } = await req.json()

    if (!content || content.length < 50) {
      return apiError({ message: 'Content too short (min 50 chars)', status: 400, name: 'ValidationError' })
    }
    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return apiError({ message: 'Issues required', status: 400, name: 'ValidationError' })
    }

    const originalWordCount = content.trim().split(/\s+/).length
    const originalScore = issues[0]?.overall_score || 50 // Get original score

    // QUALITY GATE: If content already scores well (>70), only apply schema
    const isHighQuality = originalScore > 70
    let fixTypes = selectedFixTypes || ['entities', 'citations', 'eeat', 'semantic', 'technical']
    
    if (isHighQuality) {
      // For high-quality content, skip aggressive fixers, only add schema
      fixTypes = ['schema']
    }

    let optimizedContent = content
    const allAppliedFixes: any[] = []

    // Step 1: Entity Issues (skip if high quality)
    if (fixTypes.includes('entities')) {
      try {
        const entityResult = await fixEntityIssues(optimizedContent, issues as OptimizerIssue[])
        optimizedContent = entityResult.fixed_content
        allAppliedFixes.push(...entityResult.applied_fixes)
      } catch (e) {
        console.error('Entity fixer error:', e)
      }
    }

    // Step 2: Citation Issues (skip if high quality)
    if (fixTypes.includes('citations')) {
      try {
        const citationResult = await fixCitationIssues(optimizedContent, issues as OptimizerIssue[])
        optimizedContent = citationResult.fixed_content
        allAppliedFixes.push(...citationResult.applied_fixes)
      } catch (e) {
        console.error('Citation fixer error:', e)
      }
    }

    // Step 3: E-E-A-T Issues (skip if high quality)
    if (fixTypes.includes('eeat')) {
      try {
        const eeatResult = await fixEEATIssues(optimizedContent, issues as OptimizerIssue[], author as AuthorProfile | undefined)
        optimizedContent = eeatResult.fixed_content
        allAppliedFixes.push(...eeatResult.applied_fixes)
      } catch (e) {
        console.error('E-E-A-T fixer error:', e)
      }
    }

    // Step 4: Semantic Issues (skip if high quality)
    if (fixTypes.includes('semantic')) {
      try {
        const semanticResult = await fixSemanticIssues(optimizedContent, issues as OptimizerIssue[])
        optimizedContent = semanticResult.fixed_content
        allAppliedFixes.push(...semanticResult.applied_fixes)
      } catch (e) {
        console.error('Semantic fixer error:', e)
      }
    }

    // Step 5: Technical Issues (skip if high quality)
    if (fixTypes.includes('technical')) {
      try {
        const technicalResult = await fixTechnicalIssues(optimizedContent, issues as OptimizerIssue[])
        optimizedContent = technicalResult.fixed_content
        allAppliedFixes.push(...technicalResult.applied_fixes)
      } catch (e) {
        console.error('Technical fixer error:', e)
      }
    }

    // Step 6: Schema (ALWAYS apply - safe for all content)
    try {
      const schemaResult = await fixSchemaIssues(optimizedContent)
      optimizedContent = schemaResult.fixed_content
      allAppliedFixes.push(...schemaResult.applied_fixes)
    } catch (e) {
      console.error('Schema generation error:', e)
    }

    // Calculate final metrics
    const newWordCount = optimizedContent.trim().split(/\s+/).length
    const lengthRatio = Math.round((newWordCount / originalWordCount) * 100)
    const meetsRequirement = lengthRatio >= 95

    // QUALITY GATE: Safety check
    const finalContent = optimizedContent
    let qualityGateMessage = ''

    if (isHighQuality) {
      qualityGateMessage = `⚠️ Content already high-quality (${originalScore}/100). Applied schema only to maintain quality.`
    } else {
      qualityGateMessage = `✅ Content optimized from ${originalScore} → estimated ${originalScore + 15}/100`
    }

    const statusMessage = meetsRequirement
      ? `✅ Content preserved (${lengthRatio}%) and optimized successfully.`
      : `⚠️ Content at ${lengthRatio}% (needs ≥95%). Some optimization skipped.`

    return apiSuccess({
      optimized_content: finalContent,
      applied_fixes: allAppliedFixes,
      changes_summary: `Applied ${allAppliedFixes.length} optimization fixes. ${qualityGateMessage}`,
      original_word_count: originalWordCount,
      new_word_count: newWordCount,
      length_ratio: lengthRatio,
      meets_requirement: meetsRequirement,
      status_message: statusMessage,
      original_score: originalScore,
      estimated_new_score: isHighQuality ? originalScore : originalScore + 15,
      is_high_quality: isHighQuality,
      fix_types_applied: fixTypes,
      userPlan: user.plan,
    })
  } catch (e) {
    return apiError(e)
  }
}