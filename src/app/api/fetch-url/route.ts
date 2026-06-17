import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { apiError, apiSuccess } from '@/lib/api'
import { isIP } from 'net'
import dns from 'dns/promises'

export const runtime = 'nodejs'

function isPrivateIP(ip: string): boolean {
  return [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,   // link-local + AWS metadata endpoint
    /^0\./,
    /^::1$/,
    /^fc/i,
    /^fd/i,
  ].some(r => r.test(ip))
}

async function validateUrl(urlStr: string): Promise<void> {
  let parsed: URL
  try { parsed = new URL(urlStr) } catch { throw new Error('Invalid URL') }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are allowed')
  }

  const hostname = parsed.hostname
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('Private/internal URLs are not allowed')
    return
  }

  try {
    const { address } = await dns.lookup(hostname)
    if (isPrivateIP(address)) throw new Error('Private/internal URLs are not allowed')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    throw new Error(msg.includes('not allowed') ? msg : 'Could not resolve hostname')
  }
}

function extractMainContent(html: string): string {
  // 1. Remove entire noise blocks (including their inner content)
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
    // Remove common noise divs by class/id (ads, banners, sidebars, comments, popups)
    .replace(/<div[^>]+(?:class|id)="[^"]*(?:sidebar|widget|banner|advertisement|cookie|popup|modal|overlay|comment|related|social|share|subscribe|newsletter|promo|breadcrumb|pagination|tag-cloud|author-bio)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')

  // 2. Try to isolate main content — prefer <article>, <main>, then common content class patterns
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]+(?:class|id)="[^"]*(?:post-content|entry-content|article-content|blog-content|content-body|single-content|post-body|article-body|story-body|rich-text|prose|blog-post)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]

  let contentHtml = cleaned
  for (const pattern of contentPatterns) {
    const match = cleaned.match(pattern)
    if (match) {
      contentHtml = match[1]
      break
    }
  }

  // 3. Strip all remaining HTML tags
  let text = contentHtml.replace(/<[^>]+>/g, ' ')

  // 4. Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))

  // 5. Remove leftover symbols, control characters, and excessive whitespace
  text = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // keep printable ASCII + newlines
    .replace(/[ \t]+/g, ' ')               // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')            // max 2 consecutive newlines
    .trim()

  return text
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    try {
      await validateUrl(url)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid URL' },
        { status: 400 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Optmizly/2.0)' },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)

    const html = await res.text()
    const text = extractMainContent(html).slice(0, 50000)

    if (text.length < 100) throw new Error('Could not extract enough content from that URL')

    return apiSuccess({ content: text })
  } catch (e) {
    return apiError(e)
  }
}

