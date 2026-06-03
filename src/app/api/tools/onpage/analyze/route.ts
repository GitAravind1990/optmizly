import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  return user
}

// ─── Local analysis helpers (no AI needed) ────────────────────────────────────

function analyzeKeywords(content: string, keyword: string) {
  const words = content.toLowerCase().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const kw = keyword.toLowerCase()
  const kwWords = kw.split(/\s+/)
  let count = 0
  for (let i = 0; i <= words.length - kwWords.length; i++) {
    if (kwWords.every((w, j) => words[i + j] === w)) count++
  }
  const density = wordCount > 0 ? parseFloat(((count / wordCount) * 100).toFixed(2)) : 0
  const inFirstParagraph = content.toLowerCase().slice(0, 300).includes(kw)
  const inLastParagraph = content.toLowerCase().slice(-300).includes(kw)

  const issues: string[] = []
  if (count === 0) issues.push(`Keyword "${keyword}" not found in content`)
  else if (density > 3) issues.push(`Keyword density ${density}% is too high (over-optimized) — aim for 1–2%`)
  else if (density < 0.5) issues.push(`Keyword density ${density}% is too low — use keyword more naturally`)
  if (!inFirstParagraph) issues.push('Keyword missing from opening paragraph — add it in first 100 words')
  if (!inLastParagraph) issues.push('Keyword missing from conclusion — reinforce it in last paragraph')

  const score = count === 0 ? 0 : density > 3 ? 50 : density < 0.5 ? 40 : inFirstParagraph && inLastParagraph ? 100 : 70

  return { count, density, wordCount, inFirstParagraph, inLastParagraph, issues, score }
}

function analyzeHeaders(content: string, keyword: string) {
  const kw = keyword.toLowerCase()
  const h1Matches = [...content.matchAll(/^#\s+(.+)$/gm)].map(m => m[1])
  const h2Matches = [...content.matchAll(/^##\s+(.+)$/gm)].map(m => m[1])
  const h3Matches = [...content.matchAll(/^###\s+(.+)$/gm)].map(m => m[1])

  // Also match HTML-style headers
  const h1Html = [...content.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''))
  const h2Html = [...content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''))
  const h3Html = [...content.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''))

  const h1 = [...h1Matches, ...h1Html]
  const h2 = [...h2Matches, ...h2Html]
  const h3 = [...h3Matches, ...h3Html]

  const h1HasKw = h1.some(h => h.toLowerCase().includes(kw))
  const h2HasKw = h2.some(h => h.toLowerCase().includes(kw))

  const issues: string[] = []
  if (h1.length === 0) issues.push('No H1 found — add a single H1 with your primary keyword')
  else if (h1.length > 1) issues.push(`${h1.length} H1 tags found — use only one H1 per page`)
  if (!h1HasKw && h1.length > 0) issues.push(`H1 "${h1[0]}" doesn't contain the keyword "${keyword}"`)
  if (h2.length === 0) issues.push('No H2 subheadings — add H2s to structure content and include keyword variants')
  if (!h2HasKw && h2.length > 0) issues.push(`None of the ${h2.length} H2s include the keyword — add it to at least one`)
  if (h2.length > 0 && h3.length === 0) issues.push('No H3 headings — consider adding H3s for better content hierarchy')

  const score = h1.length === 1 && h1HasKw && h2.length >= 2 && h2HasKw
    ? 100
    : h1.length === 1 && h2.length >= 1
    ? 70
    : h1.length > 0
    ? 40
    : 10

  return { h1, h2, h3, h1HasKw, h2HasKw, issues, score }
}

function analyzeMeta(content: string, keyword: string, pageTitle?: string) {
  const kw = keyword.toLowerCase()
  const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i)
  const descMatch = content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)

  const title = titleMatch?.[1] ?? pageTitle ?? ''
  const description = descMatch?.[1] ?? ''

  const issues: string[] = []
  if (!title) issues.push('No <title> tag found — add a title tag with your keyword')
  else {
    if (!title.toLowerCase().includes(kw)) issues.push(`Title "${title}" doesn't contain keyword "${keyword}"`)
    if (title.length < 30) issues.push(`Title is too short (${title.length} chars) — aim for 50–60 characters`)
    if (title.length > 65) issues.push(`Title is too long (${title.length} chars) — Google truncates after ~60 characters`)
  }
  if (!description) issues.push('No meta description found — add one (150–160 chars) with your keyword')
  else {
    if (!description.toLowerCase().includes(kw)) issues.push(`Meta description doesn't include keyword "${keyword}"`)
    if (description.length < 100) issues.push(`Meta description is too short (${description.length} chars) — aim for 150–160 characters`)
    if (description.length > 165) issues.push(`Meta description is too long (${description.length} chars) — will be truncated in SERPs`)
  }

  const score = !title && !description ? 0
    : title && description && title.toLowerCase().includes(kw) && description.toLowerCase().includes(kw) && title.length >= 30 && title.length <= 65 ? 100
    : title && description ? 65
    : title ? 35
    : 20

  return { title, titleLength: title.length, description, descriptionLength: description.length, issues, score }
}

function analyzeImages(content: string, keyword: string) {
  const kw = keyword.toLowerCase()
  const imgMatches = [...content.matchAll(/<img[^>]+>/gi)]
  const images = imgMatches.map(m => {
    const tag = m[0]
    const altMatch = tag.match(/alt=["']([^"']*)["']/i)
    const srcMatch = tag.match(/src=["']([^"']+)["']/i)
    return { src: srcMatch?.[1] ?? '', alt: altMatch?.[1] ?? null, hasAlt: altMatch !== null }
  })

  const total = images.length
  const missingAlt = images.filter(i => !i.hasAlt || i.alt === '').length
  const withKeyword = images.filter(i => i.alt?.toLowerCase().includes(kw)).length

  const issues: string[] = []
  if (total === 0) issues.push('No images found — add relevant images to improve engagement and visual SEO')
  else {
    if (missingAlt > 0) issues.push(`${missingAlt} of ${total} images missing alt text — add descriptive alt text to all images`)
    if (withKeyword === 0 && total > 0) issues.push(`No image has alt text containing "${keyword}" — add keyword to at least one image's alt text`)
    if (total < 2) issues.push('Only 1 image found — add more images (aim for 1 per 300 words)')
  }

  const score = total === 0 ? 30
    : missingAlt === 0 && withKeyword > 0 ? 100
    : missingAlt === 0 ? 75
    : missingAlt < total ? 50
    : 20

  return { total, missingAlt, withKeyword, images: images.slice(0, 10), issues, score }
}

function analyzeLinks(content: string) {
  const internalLinks = [...content.matchAll(/href=["'](?!https?:\/\/)([^"'#][^"']*?)["']/gi)]
    .map(m => m[1]).filter(Boolean)
  const externalLinks = [...content.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
    .map(m => m[1])
  const hasNofollow = content.includes('rel="nofollow"') || content.includes("rel='nofollow'")

  const issues: string[] = []
  if (internalLinks.length === 0) issues.push('No internal links found — add 2–5 internal links to related content')
  else if (internalLinks.length < 2) issues.push('Only 1 internal link — add more to distribute link equity')
  if (externalLinks.length === 0) issues.push('No external links — cite authoritative sources to build E-E-A-T')
  else if (externalLinks.length > 10) issues.push(`${externalLinks.length} external links may dilute page authority — review and trim`)

  const score = internalLinks.length >= 2 && externalLinks.length >= 1 ? 100
    : internalLinks.length >= 1 && externalLinks.length >= 1 ? 80
    : internalLinks.length >= 1 || externalLinks.length >= 1 ? 50
    : 10

  return { internal: internalLinks.length, external: externalLinks.length, hasNofollow, issues, score }
}

function analyzeReadability(content: string) {
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/#+\s/g, '').replace(/\s+/g, ' ').trim()
  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const words = plainText.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const sentenceCount = Math.max(sentences.length, 1)
  const avgWordsPerSentence = parseFloat((wordCount / sentenceCount).toFixed(1))

  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 25).length
  const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim().length > 50)
  const longParagraphs = paragraphs.filter(p => p.trim().split(/\s+/).length > 150).length

  // Simple Flesch-Kincaid approximation
  const syllables = words.reduce((acc, w) => acc + Math.max(1, w.replace(/[^aeiouy]/gi, '').length), 0)
  const fkScore = Math.round(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount))
  const fkClamped = Math.max(0, Math.min(100, fkScore))

  const issues: string[] = []
  if (avgWordsPerSentence > 20) issues.push(`Average sentence length is ${avgWordsPerSentence} words — aim for under 20 words per sentence`)
  if (longSentences > 0) issues.push(`${longSentences} sentences exceed 25 words — break them up for better readability`)
  if (longParagraphs > 0) issues.push(`${longParagraphs} paragraphs are too long — keep paragraphs under 150 words`)
  if (fkClamped < 50) issues.push(`Readability score ${fkClamped}/100 is low — simplify language and shorten sentences`)
  if (wordCount < 300) issues.push(`Content is very short (${wordCount} words) — aim for at least 800 words for competitive topics`)
  if (wordCount < 800) issues.push(`Content is thin (${wordCount} words) — expand to 1500+ words for better rankings`)

  const score = fkClamped >= 60 && avgWordsPerSentence <= 20 && longParagraphs === 0 ? 100
    : fkClamped >= 50 && avgWordsPerSentence <= 25 ? 70
    : fkClamped >= 40 ? 50
    : 30

  return { wordCount, sentenceCount, avgWordsPerSentence, fleschScore: fkClamped, longSentences, longParagraphs, issues, score }
}

interface AIFix {
  category: string
  priority: 'high' | 'medium' | 'low'
  issue: string
  fix: string
  before?: string
  after?: string
  impact: number
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    const { content, targetKeyword, pageUrl, pageTitle, previousAnalysisId } = await req.json()

    if (!content || !targetKeyword) {
      throw new AuthError(400, 'content and targetKeyword are required')
    }
    if (content.length < 50) throw new AuthError(400, 'Content too short — paste at least 50 characters')

    // Run all local analyses in parallel (no AI cost)
    const [keywords, headers, meta, images, links, readability] = await Promise.all([
      Promise.resolve(analyzeKeywords(content, targetKeyword)),
      Promise.resolve(analyzeHeaders(content, targetKeyword)),
      Promise.resolve(analyzeMeta(content, targetKeyword, pageTitle)),
      Promise.resolve(analyzeImages(content, targetKeyword)),
      Promise.resolve(analyzeLinks(content)),
      Promise.resolve(analyzeReadability(content)),
    ])

    const overallScore = Math.round(
      keywords.score * 0.25 +
      headers.score  * 0.20 +
      meta.score     * 0.20 +
      images.score   * 0.10 +
      links.score    * 0.10 +
      readability.score * 0.15
    )

    // Gather all issues for AI fix generation
    const allIssues = [
      ...keywords.issues.map(i => `[Keyword] ${i}`),
      ...headers.issues.map(i => `[Headers] ${i}`),
      ...meta.issues.map(i => `[Meta] ${i}`),
      ...images.issues.map(i => `[Images] ${i}`),
      ...links.issues.map(i => `[Links] ${i}`),
      ...readability.issues.map(i => `[Readability] ${i}`),
    ]

    // AI generates specific fixes with before/after examples
    let fixes: AIFix[] = []
    try {
      const contentSnippet = content.slice(0, 1500)
      const raw = await callClaude(
        'You are an expert on-page SEO consultant. Return ONLY valid JSON — no markdown, no backticks.',
        `Generate specific, actionable SEO fixes for this page. Target keyword: "${targetKeyword}"

Content snippet (first 1500 chars):
${contentSnippet}

Issues detected:
${allIssues.slice(0, 10).join('\n')}

Return a JSON array of up to 8 fix objects:
[
  {
    "category": "keyword|headers|meta|images|links|readability",
    "priority": "high|medium|low",
    "issue": "specific problem description",
    "fix": "exactly what to do",
    "before": "exact text that needs changing (copy from content above)",
    "after": "improved version with keyword naturally included",
    "impact": 15
  }
]

Rules:
- "before" must be actual text from the content or a placeholder like "<title>Your Title</title>"
- "after" must be a concrete improved version
- "impact" is score improvement estimate (1-20)
- Order by priority: high first
- Only include issues that actually exist in the content`,
        1500,
        'claude-haiku-4-5-20251001'
      )
      fixes = extractJSON<AIFix[]>(raw) ?? []
      if (!Array.isArray(fixes)) fixes = []
    } catch {
      // Fallback: generate basic fixes from detected issues
      fixes = allIssues.slice(0, 5).map((issue, i) => ({
        category: issue.split(']')[0].replace('[', '').toLowerCase(),
        priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
        issue: issue.replace(/^\[\w+\]\s*/, ''),
        fix: 'Address this issue to improve your SEO score',
        before: '',
        after: '',
        impact: 10 - i * 2,
      }))
    }

    // Fetch previous score if re-analyzing
    let previousScore: number | null = null
    if (previousAnalysisId) {
      const prev = await prisma.onPageAnalysis.findUnique({ where: { id: previousAnalysisId } })
      previousScore = prev?.overallScore ?? null
    }

    const analysis = await prisma.onPageAnalysis.create({
      data: {
        userId: user.id,
        content,
        targetKeyword,
        pageUrl: pageUrl ?? null,
        pageTitle: meta.title || pageTitle || null,
        overallScore,
        keywordScore: keywords.score,
        headerScore: headers.score,
        metaScore: meta.score,
        imageScore: images.score,
        linkScore: links.score,
        readabilityScore: readability.score,
        keywordDensity: keywords.density,
        keywordCount: keywords.count,
        wordCount: keywords.wordCount,
        keywordData: JSON.stringify(keywords),
        headers: JSON.stringify(headers),
        metaTags: JSON.stringify(meta),
        images: JSON.stringify(images),
        links: JSON.stringify(links),
        readabilityData: JSON.stringify(readability),
        fixes: JSON.stringify(fixes),
        appliedFixes: JSON.stringify([]),
        previousScore,
        version: previousAnalysisId ? 2 : 1,
      },
    })

    return apiSuccess({
      success: true,
      analysisId: analysis.id,
      overallScore,
      previousScore,
      scores: {
        keyword: keywords.score,
        headers: headers.score,
        meta: meta.score,
        images: images.score,
        links: links.score,
        readability: readability.score,
      },
      summary: {
        wordCount: keywords.wordCount,
        keywordDensity: keywords.density,
        keywordCount: keywords.count,
        issueCount: allIssues.length,
        fixCount: fixes.length,
      },
      details: { keywords, headers, meta, images, links, readability },
      fixes,
    }, 201)
  } catch (e) {
    return apiError(e)
  }
}
