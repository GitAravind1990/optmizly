import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { apiError, apiSuccess } from '@/lib/api'
import { AuthError } from '@/lib/auth'
import { validateUrl } from '@/lib/ssrf-guard'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
export const maxDuration = 20

// Strips noise (scripts, nav, ads, etc.) and isolates the main content region,
// but — unlike /api/fetch-url — keeps h1-h6/title/meta/img/a tags intact so the
// on-page analyzer's HTML-aware regexes can still find them.
function extractOnPageContent(html: string): { content: string; pageTitle: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)

  const pageTitle = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  const description = descMatch?.[1]?.trim() ?? ''

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<div[^>]+(?:class|id)="[^"]*(?:sidebar|widget|banner|advertisement|cookie|popup|modal|overlay|comment|related|social|share|subscribe|newsletter|promo|breadcrumb|pagination|tag-cloud|author-bio)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')

  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]+(?:class|id)="[^"]*(?:post-content|entry-content|article-content|blog-content|content-body|single-content|post-body|article-body|story-body|rich-text|prose|blog-post)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]

  let bodyHtml = cleaned
  for (const pattern of contentPatterns) {
    const match = cleaned.match(pattern)
    if (match) { bodyHtml = match[1]; break }
  }
  if (bodyHtml === cleaned) {
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) bodyHtml = bodyMatch[1]
  }

  const metaPrefix = [
    pageTitle ? `<title>${pageTitle}</title>` : '',
    description ? `<meta name="description" content="${description.replace(/"/g, '&quot;')}">` : '',
  ].filter(Boolean).join('\n')

  const content = `${metaPrefix}\n\n${bodyHtml}`.trim().slice(0, 50000)
  return { content, pageTitle }
}

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const { userId } = await auth()
    if (!userId) throw new AuthError(401, 'Not authenticated')
    clerkId = userId

    const { url } = await req.json()
    if (!url || typeof url !== 'string') throw new AuthError(400, 'url is required')

    try {
      await validateUrl(url)
    } catch (e) {
      throw new AuthError(400, e instanceof Error ? e.message : 'Invalid URL')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    let res: Response
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Optmizly/2.0; +https://optmizly.com)' },
      })
    } catch {
      throw new AuthError(400, 'Could not reach that URL')
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) throw new AuthError(400, `Failed to fetch URL: ${res.status}`)

    const html = await res.text()
    const { content, pageTitle } = extractOnPageContent(html)

    if (content.replace(/<[^>]+>/g, '').trim().length < 50) {
      throw new AuthError(400, 'Could not extract enough content from that URL')
    }

    return apiSuccess({ data: { content, pageTitle, pageUrl: url } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/onpage/fetch' })
    return apiError(e)
  }
}
