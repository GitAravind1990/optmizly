/**
 * Fetch one homepage and run deterministic SEO checks over it.
 *
 * Deliberately NOT a crawler: one request per business, no link following, no sitemap, no
 * robots. This backs SEO Client Finder, whose job is to tell an agency "this local business
 * has fixable problems worth a pitch" - and the homepage carries almost every signal that
 * conversation opens with.
 *
 * Two rules shape everything below:
 *
 * 1. The URLs come from Google Places, which means they are attacker-influenceable in
 *    practice - anyone can list a business with any website. Every fetch is SSRF-guarded,
 *    including each redirect hop. See fetchHomepage.
 * 2. The HTML is UNTRUSTED and never leaves this module as raw text. Only the structured
 *    signals and findings below travel onward, so page content cannot reach a model as
 *    instructions.
 */
import { validateUrl } from './ssrf-guard'

const UA = 'Mozilla/5.0 (compatible; Optmizly-ClientFinder/1.0; +https://optmizly.com)'

/** One request's whole budget, redirects and body read included. */
const FETCH_TIMEOUT_MS = 8_000

/** Homepages are not 2MB of HTML. Anything larger is a download, a misconfiguration, or an
 *  attempt to exhaust the function's memory; either way it is not worth reading. */
const MAX_BYTES = 2 * 1024 * 1024

/** Enough for http->https->www, not enough to be walked in circles. */
const MAX_REDIRECTS = 5

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface SEOFinding {
  category: string
  severity: Severity
  title: string
  description: string
  recommendation: string
}

/**
 * The raw measurements. scoreOpportunity() reads only this - never the findings, never the
 * HTML - so the score stays a pure function of what was measured.
 */
export interface SEOSignals {
  https: boolean
  titlePresent: boolean
  titleLength: number
  titleGeneric: boolean
  metaDescriptionPresent: boolean
  metaDescriptionLength: number
  h1Count: number
  headingHierarchySane: boolean
  wordCount: number
  imageCount: number
  imagesWithAlt: number
  schemaPresent: boolean
  schemaTypes: string[]
  canonicalPresent: boolean
  viewportPresent: boolean
  internalLinkCount: number
}

export interface HomepageFetch {
  finalUrl: string
  html: string
  status: number
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch a homepage, or return null. Never throws, never hangs.
 *
 * The SSRF surface here is wider than it looks. The caller does not type these URLs - they
 * arrive from Google Places - but "not typed by the user" is not "trustworthy": a Places
 * listing can point anywhere, including at this network's own private ranges or the cloud
 * metadata endpoint. So:
 *
 *   - validateUrl() before the first request: scheme must be http(s), and the hostname is
 *     resolved and rejected if it lands on loopback, link-local (169.254.0.0/16, which is
 *     where IMDS lives), or RFC1918 space.
 *   - redirect: 'manual', and validateUrl() again on every hop. Following redirects
 *     automatically would let a public hostname bounce to 127.0.0.1 after passing the
 *     first check, which is the standard way this guard gets walked around.
 *   - one deadline for the whole operation rather than per hop, so five slow redirects
 *     cannot add up to five timeouts.
 *
 * Known limitation, stated rather than papered over: validateUrl resolves the hostname and
 * fetch() resolves it again, so a DNS entry that changes between the two calls is not
 * caught (classic rebinding TOCTOU). Closing it properly means pinning the resolved IP and
 * connecting to it directly with a custom agent. Out of scope for this MVP, and worth
 * doing before this tool ever accepts a user-typed URL.
 */
export async function fetchHomepage(url: string): Promise<HomepageFetch | null> {
  const deadline = Date.now() + FETCH_TIMEOUT_MS
  let current = url

  try {
    await validateUrl(current)
  } catch {
    return null
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)

    let res: Response
    try {
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      })
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return null
      try {
        current = new URL(location, current).toString()
        await validateUrl(current)   // the hop is as untrusted as the original URL
      } catch {
        return null
      }
      continue
    }

    if (res.status >= 400) return null

    // Only HTML is worth parsing. A PDF or a 200MB video would otherwise be read into
    // memory and regexed for <title>.
    const contentType = res.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return null

    const html = await readCapped(res, deadline)
    if (html === null) return null

    return { finalUrl: current, html, status: res.status }
  }

  return null   // too many redirects
}

/**
 * Read the body up to MAX_BYTES and stop.
 *
 * Streamed rather than res.text() so an oversized response is abandoned partway instead of
 * being buffered in full and then measured - the point of a cap is to not hold the bytes.
 * A truncated homepage still analyses fine: everything measured below lives in the first
 * fraction of the document.
 */
async function readCapped(res: Response, deadline: number): Promise<string | null> {
  if (!res.body) return null

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const chunks: string[] = []
  let total = 0

  try {
    for (;;) {
      if (Date.now() > deadline) { await reader.cancel().catch(() => {}); break }

      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      total += value.byteLength
      chunks.push(decoder.decode(value, { stream: true }))

      if (total >= MAX_BYTES) { await reader.cancel().catch(() => {}); break }
    }
  } catch {
    return chunks.length > 0 ? chunks.join('') : null
  }

  return chunks.join('')
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

const GENERIC_TITLES = [
  'home', 'home page', 'homepage', 'welcome', 'index', 'untitled', 'untitled document',
  'new page', 'my site', 'my website', 'just another wordpress site', 'site',
]

function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? (m[2] ?? m[3] ?? m[4] ?? '').trim() : null
}

/** Meta tag by name/property, tolerant of attribute order. */
function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const name = (attr(tag, 'name') ?? attr(tag, 'property') ?? '').toLowerCase()
    if (name === key.toLowerCase()) return attr(tag, 'content')
  }
  return null
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>()

  // JSON-LD. Parsed rather than regexed for @type so nested graphs are seen, and wrapped
  // in try/catch because invalid JSON-LD in the wild is common and is not a crash here.
  const blocks = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '')
    try {
      const walk = (node: unknown): void => {
        if (Array.isArray(node)) return node.forEach(walk)
        if (!node || typeof node !== 'object') return
        const obj = node as Record<string, unknown>
        const t = obj['@type']
        if (typeof t === 'string') types.add(t)
        else if (Array.isArray(t)) t.filter(x => typeof x === 'string').forEach(x => types.add(x as string))
        Object.values(obj).forEach(walk)
      }
      walk(JSON.parse(body))
    } catch {
      // Unparseable JSON-LD counts as absent: a block Google cannot read is not markup.
    }
  }

  // Microdata, still common on older local-business sites.
  for (const tag of html.match(/<[^>]*\bitemtype\s*=\s*["'][^"']+["'][^>]*>/gi) ?? []) {
    const raw = attr(tag, 'itemtype')
    if (raw) types.add(raw.replace(/^https?:\/\/schema\.org\//i, ''))
  }

  return [...types]
}

function countInternalLinks(html: string, finalUrl: string): number {
  let host = ''
  try { host = new URL(finalUrl).host } catch { /* keep host empty */ }

  let count = 0
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, 'href')
    if (!href) continue
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) continue
    if (/^https?:\/\//i.test(href)) {
      try { if (new URL(href).host === host) count++ } catch { /* skip unparseable */ }
    } else {
      count++   // relative link
    }
  }
  return count
}

/**
 * Deterministic checks over one homepage.
 *
 * Every finding is something an agency can point at in a first conversation and the
 * business owner can verify in their own browser. Nothing here is a prediction about
 * rankings, and nothing here needs a model.
 */
export function analyzeHomepage(html: string, finalUrl: string): { findings: SEOFinding[]; signals: SEOSignals } {
  const findings: SEOFinding[] = []
  const add = (
    category: string, severity: Severity, title: string, description: string, recommendation: string,
  ) => findings.push({ category, severity, title, description, recommendation })

  // HTTPS
  const https = /^https:/i.test(finalUrl)
  if (!https) {
    add('Security', 'critical', 'No HTTPS',
      'The site is served over plain HTTP, so browsers show a "Not secure" warning in the address bar.',
      'Install a TLS certificate and redirect all HTTP traffic to HTTPS.')
  }

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const titleText = titleMatch ? stripToText(titleMatch[1]) : ''
  const titlePresent = titleText.length > 0
  const titleLength = titleText.length
  // Heuristic, and named as one: a placeholder title, or something so short and
  // undifferentiated it cannot be targeting anything. Separators are the tell - a title
  // written for search almost always carries a service or a place beside the brand.
  const titleGeneric = titlePresent && (
    GENERIC_TITLES.includes(titleText.toLowerCase()) ||
    (titleLength < 20 && !/[|\-–—:·]/.test(titleText))
  )

  if (!titlePresent) {
    add('On-page', 'critical', 'Missing page title',
      'The homepage has no <title>, so search engines and browser tabs fall back to the URL.',
      'Add a title of roughly 50-60 characters naming the main service and the location.')
  } else if (titleGeneric) {
    add('On-page', 'high', 'Generic page title',
      `The title is "${titleText}", which does not say what the business does or where it operates.`,
      'Rewrite as service plus location plus business name.')
  } else if (titleLength < 20 || titleLength > 65) {
    add('On-page', 'medium', titleLength > 65 ? 'Page title too long' : 'Page title very short',
      `The title is ${titleLength} characters; Google typically displays around 50-60.`,
      'Aim for 50-60 characters so the whole title shows in results.')
  }

  // Meta description
  const desc = metaContent(html, 'description') ?? ''
  const metaDescriptionPresent = desc.trim().length > 0
  const metaDescriptionLength = desc.trim().length
  if (!metaDescriptionPresent) {
    add('On-page', 'high', 'Missing meta description',
      'No meta description, so Google writes its own snippet from whatever text it finds on the page.',
      'Add a 140-160 character description covering the main service, the area served, and a reason to click.')
  } else if (metaDescriptionLength < 70 || metaDescriptionLength > 165) {
    add('On-page', 'low', metaDescriptionLength > 165 ? 'Meta description too long' : 'Meta description very short',
      `The description is ${metaDescriptionLength} characters.`,
      'Aim for 140-160 characters.')
  }

  // Headings
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(m => ({ level: Number(m[1]), text: stripToText(m[2]) }))
  const h1Count = headings.filter(h => h.level === 1).length

  let headingHierarchySane = true
  let previous = 0
  for (const h of headings) {
    if (previous && h.level > previous + 1) { headingHierarchySane = false; break }
    previous = h.level
  }

  if (h1Count === 0) {
    add('Structure', 'high', 'No H1 heading',
      'The page has no H1, so the single strongest on-page signal of what it is about is missing.',
      'Add one H1 describing the main service and location.')
  } else if (h1Count > 1) {
    add('Structure', 'medium', `${h1Count} H1 headings`,
      'Multiple H1s split the page’s topic rather than stating it once.',
      'Keep one H1 and demote the rest to H2.')
  }
  if (!headingHierarchySane) {
    add('Structure', 'low', 'Heading levels skip',
      'Heading levels jump (for example H1 straight to H3), which makes the page structure harder to read.',
      'Use headings in order without skipping levels.')
  }

  // Content depth
  const text = stripToText(html)
  const wordCount = text ? text.split(/\s+/).length : 0
  if (wordCount < 150) {
    add('Content', 'critical', 'Very thin homepage content',
      `Roughly ${wordCount} words of text. There is little for search engines to understand the business from.`,
      'Add 300+ words covering services, areas served, and what makes the business different.')
  } else if (wordCount < 300) {
    add('Content', 'high', 'Thin homepage content',
      `Roughly ${wordCount} words of text, below what competing local pages typically carry.`,
      'Expand to 500+ words of genuinely useful detail.')
  }

  // Images
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? []
  const imageCount = imgTags.length
  const imagesWithAlt = imgTags.filter(t => (attr(t, 'alt') ?? '').length > 0).length
  const altCoverage = imageCount === 0 ? 1 : imagesWithAlt / imageCount
  if (imageCount > 0 && altCoverage < 0.8) {
    add('Accessibility', altCoverage < 0.5 ? 'medium' : 'low', 'Images missing alt text',
      `${imageCount - imagesWithAlt} of ${imageCount} images have no alt text.`,
      'Describe each meaningful image in its alt attribute.')
  }

  // Structured data
  const schemaTypes = extractSchemaTypes(html)
  const schemaPresent = schemaTypes.length > 0
  if (!schemaPresent) {
    add('Structured data', 'high', 'No schema markup',
      'No JSON-LD or microdata, so opening hours, address, and reviews are not exposed to search engines in a readable form.',
      'Add LocalBusiness schema with address, phone, opening hours, and geo coordinates.')
  }

  // Canonical
  const canonicalPresent = /<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i.test(html)
  if (!canonicalPresent) {
    add('Technical', 'low', 'No canonical tag',
      'Without a canonical, duplicate versions of the homepage can compete with each other.',
      'Add a self-referencing canonical link.')
  }

  // Mobile
  const viewportPresent = (metaContent(html, 'viewport') ?? '').length > 0
  if (!viewportPresent) {
    add('Mobile', 'critical', 'No mobile viewport tag',
      'The page has no viewport meta tag, so it renders at desktop width on phones - where most local searches happen.',
      'Add <meta name="viewport" content="width=device-width, initial-scale=1">.')
  }

  // Internal linking
  const internalLinkCount = countInternalLinks(html, finalUrl)
  if (internalLinkCount < 5) {
    add('Structure', 'low', 'Very few internal links',
      `Only ${internalLinkCount} internal links found, so there is little for a crawler to follow into the rest of the site.`,
      'Link the homepage to the main service and location pages.')
  }

  return {
    findings,
    signals: {
      https, titlePresent, titleLength, titleGeneric,
      metaDescriptionPresent, metaDescriptionLength,
      h1Count, headingHierarchySane, wordCount,
      imageCount, imagesWithAlt,
      schemaPresent, schemaTypes,
      canonicalPresent, viewportPresent, internalLinkCount,
    },
  }
}
