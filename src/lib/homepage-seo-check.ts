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
 *    signals and findings below travel onward. One caveat worth stating precisely rather
 *    than claiming immunity: the page's own <title> is quoted into a finding description,
 *    so a bounded amount of site-authored text does travel. It is capped at 200 characters
 *    for exactly that reason - findings are what reach a model, and a prospect's homepage
 *    should not get to write into a prompt at length.
 */
import http from 'http'
import zlib from 'zlib'
import https from 'https'
import { validateUrl, safeLookup } from './ssrf-guard'

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

/** How one guarded request should behave. The SSRF handling is not optional and is not
 *  in here — every request this module makes is pinned regardless of these. */
export interface GuardedOptions {
  /** Whole-operation budget, redirects and body read included. Default 8s. */
  timeoutMs?: number
  /** Accept header. Default asks for HTML. */
  accept?: string
  userAgent?: string
  /** Refuse anything that is not HTML — for page fetches. */
  requireHtml?: boolean
  /** Refuse anything that IS HTML — for text side files like robots.txt. */
  rejectHtml?: boolean
  /** Cap on decompressed bytes. Default 2MB. */
  maxBytes?: number
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * One HTTP(S) request, with the connection pinned to an address we approved.
 *
 * Node's own http/https rather than fetch, for one reason: `lookup`. It is the only hook
 * that lets the address a socket connects to be the same address that was checked. fetch
 * has no equivalent, so with fetch the name is always resolved a second time, out of our
 * sight, after the check has passed.
 *
 * Redirects are not followed here. The caller walks them so each hop is re-validated.
 */
function requestOnce(target: string, deadline: number, opts: GuardedOptions): Promise<{
  status: number
  location: string | null
  contentType: string
  body: string | null
} | null> {
  return new Promise(resolve => {
    let settled = false
    const finish = (v: Parameters<typeof resolve>[0]) => { if (!settled) { settled = true; resolve(v) } }

    let parsed: URL
    try { parsed = new URL(target) } catch { return finish(null) }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return finish(null)

    const remaining = deadline - Date.now()
    if (remaining <= 0) return finish(null)

    const mod = parsed.protocol === 'https:' ? https : http
    const req = mod.request(
      target,
      {
        method: 'GET',
        // The whole point of this rewrite. safeLookup refuses private addresses at the
        // moment of connection, so there is no window between checking and connecting.
        lookup: safeLookup,
        timeout: remaining,
        headers: {
          'User-Agent': opts.userAgent ?? UA,
          Accept: opts.accept ?? 'text/html,application/xhtml+xml',
          // Worth asking for: measured on moz.com, identity is 168,632 bytes against 25,993
          // brotli — 6.5x the transfer on a path Client Finder walks up to 60 times per
          // search. The decompression-bomb risk that argues against it is handled by
          // maxOutputLength below rather than by refusing compression.
          'Accept-Encoding': 'gzip, deflate, br',
        },
      },
      res => {
        const status = res.statusCode ?? 0
        const contentType = String(res.headers['content-type'] ?? '')

        if (status >= 300 && status < 400) {
          // A redirect's body is never read: the caller only needs where it points.
          res.destroy()
          const location = res.headers.location
          return finish({ status, location: typeof location === 'string' ? location : null, contentType, body: null })
        }
        if (status >= 400) { res.destroy(); return finish(null) }

        // Only HTML is worth reading for a page. A PDF or a 200MB video would otherwise be
        // pulled into memory and regexed for <title>.
        const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType)
        if (opts.requireHtml && !isHtml) { res.destroy(); return finish(null) }
        // For a text side file the opposite: hosts that answer every path with the app shell
        // would otherwise have their HTML parsed as a robots.txt, which reads as "no rules"
        // and therefore "everything allowed".
        if (opts.rejectHtml && isHtml) { res.destroy(); return finish(null) }

        // Decompress if the server compressed. What bounds a decompression bomb here is the
        // byte counter below, which measures DECOMPRESSED bytes and destroys both streams at
        // the cap — measured against a 204KB gzip that expands to 200MB, it stops at exactly
        // 2,097,152 bytes with no heap growth.
        //
        // `maxOutputLength` is defence in depth, not the bound. Node applies it per output
        // buffer rather than to a stream's cumulative output: the same bomb run through
        // createGunzip with maxOutputLength set and nothing else decompressed all 200MB
        // without erroring. Do not remove the counter and rely on this option.
        const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase().trim()
        let stream: NodeJS.ReadableStream = res
        if (encoding === 'gzip' || encoding === 'x-gzip') {
          stream = res.pipe(zlib.createGunzip({ maxOutputLength: opts.maxBytes ?? MAX_BYTES }))
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate({ maxOutputLength: opts.maxBytes ?? MAX_BYTES }))
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress({ maxOutputLength: opts.maxBytes ?? MAX_BYTES }))
        } else if (encoding && encoding !== 'identity') {
          // An encoding we cannot read is not worth guessing at.
          res.destroy()
          return finish(null)
        }

        const maxBytes = opts.maxBytes ?? MAX_BYTES
        const chunks: Buffer[] = []
        let total = 0
        const collected = () => chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null
        const stop = () => { res.destroy(); if (stream !== res) (stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.() }

        stream.on('data', (chunk: Buffer) => {
          total += chunk.length
          chunks.push(chunk)
          // Stop at the cap rather than buffering everything and measuring afterwards —
          // the point of a cap is to not hold the bytes. A truncated homepage still
          // analyses fine: everything measured below lives near the top of the document.
          if (total >= maxBytes) stop()
        })
        stream.on('end', () => finish({ status, location: null, contentType, body: collected() }))
        // Fires instead of 'end' when the cap, the deadline or a decompression failure cut
        // the stream short. What was read is still worth analysing.
        stream.on('close', () => finish(collected() ? { status, location: null, contentType, body: collected() } : null))
        stream.on('error', () => { stop(); finish(collected() ? { status, location: null, contentType, body: collected() } : null) })
        if (stream !== res) res.on('error', () => finish(collected() ? { status, location: null, contentType, body: collected() } : null))
      }
    )

    // `timeout` above is an idle timeout on the socket; this bounds the whole request, so a
    // server dribbling one byte at a time cannot hold the function open.
    const overall = setTimeout(() => req.destroy(), Math.max(1, deadline - Date.now()))
    const clear = () => clearTimeout(overall)
    req.on('close', clear)

    req.on('timeout', () => { req.destroy(); finish(null) })
    req.on('error', () => finish(null))
    req.end()
  })
}

/**
 * Fetch a homepage, or return null. Never throws, never hangs.
 *
 * The SSRF surface here is wider than it looks. Client Finder's URLs arrive from Google
 * Places, and "not typed by the user" is not "trustworthy" — anyone can list a business
 * with any website. The free readiness audit is more direct still: the URL is typed by a
 * stranger on a public page. So:
 *
 *   - validateUrl() before the first request: the scheme must be http(s), and the hostname
 *     is resolved and refused if any address it returns is loopback, link-local
 *     (169.254.0.0/16, where IMDS lives), RFC1918, CGNAT or otherwise not public.
 *   - safeLookup as the request's `lookup`, which re-runs that check on the address the
 *     socket is actually connecting to. **This is what closes DNS rebinding.** validateUrl
 *     alone cannot: it resolves the name, approves it, and then the connection resolves the
 *     name again — and an attacker running the authoritative server can answer differently
 *     the second time. Because Node resolves through `lookup`, the approved address and the
 *     connected address are now the same event rather than two.
 *   - redirects walked by hand, with validateUrl() on every hop, so a public hostname
 *     cannot bounce to 127.0.0.1 after passing the first check.
 *   - one deadline for the whole operation rather than per hop, so five slow redirects
 *     cannot add up to five timeouts.
 */
export async function fetchHomepage(url: string): Promise<HomepageFetch | null> {
  const res = await fetchGuarded(url, { requireHtml: true })
  return res ? { finalUrl: res.finalUrl, html: res.body, status: res.status } : null
}

/**
 * The guarded fetch, for anything else that has to pull a URL a stranger chose.
 *
 * Exported so there is exactly one implementation of "connect somewhere untrusted" in this
 * codebase. The readiness audit's robots.txt and llms.txt requests used plain `fetch` when
 * the page fetch was hardened, which left two unpinned connections behind a fix whose whole
 * claim was that connections are pinned. One door bolted and two beside it open is not a
 * fixed building.
 */
export async function fetchGuarded(url: string, options: GuardedOptions = {}): Promise<{
  finalUrl: string
  body: string
  contentType: string
  status: number
} | null> {
  const deadline = Date.now() + (options.timeoutMs ?? FETCH_TIMEOUT_MS)
  let current = url

  try {
    await validateUrl(current)
  } catch {
    return null
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (Date.now() >= deadline) return null

    const res = await requestOnce(current, deadline, options)
    if (!res) return null

    if (res.status >= 300 && res.status < 400) {
      if (!res.location) return null
      try {
        current = new URL(res.location, current).toString()
        await validateUrl(current)   // the hop is as untrusted as the original URL
      } catch {
        return null
      }
      continue
    }

    if (res.body === null) return null
    return { finalUrl: current, body: res.body, contentType: res.contentType, status: res.status }
  }

  return null   // too many redirects
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

/**
 * One attribute's value, or null when the attribute is absent.
 *
 * Null and '' are different answers and callers depend on the difference: `alt=""` is a
 * deliberately decorative image, no `alt` at all is an omission.
 *
 * The leading `(^|[\s/])` matters. Without it the name matched anywhere inside the tag, so
 * asking for `alt` also matched `data-alt="…"` and asking for `name` matched `itemname`,
 * silently returning another attribute's value.
 */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`(?:^|[\\s/])${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
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
  // Capped at 200 characters. The title is the one piece of site-authored text that gets
  // quoted into a finding description, and findings are the only thing that reaches a
  // model - so this is the whole surface through which a prospect's own page could try to
  // put words in a prompt. A real title is under 70 characters; anything beyond 200 is not
  // a title. Length is measured before the cap so the "too long" check still sees the truth.
  const titleRaw = titleMatch ? stripToText(titleMatch[1]) : ''
  const titleText = titleRaw.slice(0, 200)
  const titlePresent = titleRaw.length > 0
  const titleLength = titleRaw.length
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
  //
  // `alt=""` is NOT a missing alt attribute. An empty alt is the correct, deliberate way to
  // mark a decorative image — a spacer, an icon beside text that already says the same
  // thing — and both WCAG and every screen reader treat it as "skip this". Counting it as a
  // fault flagged sites whose markup was right, and told them to describe images that
  // should not be described.
  //
  // Only an image with no alt attribute at all is an omission, which `attr` reports as null
  // and an empty alt reports as ''.
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? []
  const imageCount = imgTags.length
  const imagesWithAlt = imgTags.filter(t => attr(t, 'alt') !== null).length
  const altCoverage = imageCount === 0 ? 1 : imagesWithAlt / imageCount
  if (imageCount > 0 && altCoverage < 0.8) {
    add('Accessibility', altCoverage < 0.5 ? 'medium' : 'low', 'Images missing alt text',
      `${imageCount - imagesWithAlt} of ${imageCount} images have no alt attribute at all.`,
      'Describe each meaningful image in its alt attribute, and give purely decorative ones an empty alt="".')
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
