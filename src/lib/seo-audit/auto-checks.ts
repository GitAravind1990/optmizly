// Automated SEO-audit detectors. Pure functions (no AI, no network) that parse a
// fetched page's raw HTML + response headers + robots.txt + sitemap.xml and return
// pass/fail/warn results keyed by the check ids defined in framework.ts (35 categories).
//
// Only checks the engine can reasonably judge from a single page are produced here;
// any framework check id not returned is treated as a manual checklist item by the UI.

import type { CheckStatus } from './framework'

export interface AutoCheckResult {
  status: CheckStatus
  detail: string
}

export interface RedirectHop {
  status: number
  url: string
}

export interface AutoCheckContext {
  url: string
  finalUrl: string
  html: string
  status: number
  headers: Record<string, string>
  robotsTxt: string | null
  sitemapXml: string | null
  sitemapStatus: number | null
  redirects: RedirectHop[]
  oprScore?: number | null
  domainRank?: number | null
  /** false when HTML was pasted — skips checks that need real response headers/status */
  fetched?: boolean
  /** false when no real URL was provided (pasted HTML with placeholder URL) — skips URL-based checks */
  urlKnown?: boolean
  /** HTTP status of /xmlrpc.php, /readme.html, /?p=1 — only fetched when the page looks like WordPress */
  wpXmlrpcStatus?: number | null
  wpReadmeStatus?: number | null
  wpDefaultUrlStatus?: number | null
}

type ResultMap = Record<string, AutoCheckResult>

// ─── Low-level HTML extraction (regex-based, mirrors existing onpage parser) ─────

function getHead(html: string): string {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  return m ? m[1] : html.slice(0, 8000)
}

function getBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return m ? m[1] : html
}

function plainText(html: string): string {
  return getBody(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface MetaTag { name: string; property: string; content: string; httpEquiv: string }

function metaTags(head: string): MetaTag[] {
  return [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => {
    const tag = m[0]
    const attr = (re: RegExp) => tag.match(re)?.[1] ?? ''
    return {
      name: attr(/\bname=["']([^"']*)["']/i).toLowerCase(),
      property: attr(/\bproperty=["']([^"']*)["']/i).toLowerCase(),
      content: attr(/\bcontent=["']([^"']*)["']/i),
      httpEquiv: attr(/\bhttp-equiv=["']([^"']*)["']/i).toLowerCase(),
    }
  })
}

interface LinkTag { rel: string; href: string; hreflang: string; as: string; media: string }

function linkTags(head: string): LinkTag[] {
  return [...head.matchAll(/<link\b[^>]*>/gi)].map(m => {
    const tag = m[0]
    const attr = (re: RegExp) => tag.match(re)?.[1] ?? ''
    return {
      rel: attr(/\brel=["']([^"']*)["']/i).toLowerCase(),
      href: attr(/\bhref=["']([^"']*)["']/i),
      hreflang: attr(/\bhreflang=["']([^"']*)["']/i),
      as: attr(/\bas=["']([^"']*)["']/i).toLowerCase(),
      media: attr(/\bmedia=["']([^"']*)["']/i).toLowerCase(),
    }
  })
}

interface ScriptTag { src: string; async: boolean; defer: boolean; inHead: boolean; type: string }

function scriptTags(html: string): ScriptTag[] {
  const head = getHead(html)
  return [...html.matchAll(/<script\b[^>]*>/gi)].map(m => {
    const tag = m[0]
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? ''
    return {
      src,
      async: /\basync\b/i.test(tag),
      defer: /\bdefer\b/i.test(tag),
      inHead: src ? head.includes(tag) : false,
      type: tag.match(/\btype=["']([^"']*)["']/i)?.[1]?.toLowerCase() ?? '',
    }
  })
}

interface ImgTag { src: string; alt: string | null; width: string; height: string; loading: string; srcset: string; fetchpriority: string }

function imgTags(html: string): ImgTag[] {
  return [...getBody(html).matchAll(/<img\b[^>]*>/gi)].map(m => {
    const tag = m[0]
    const attr = (re: RegExp) => tag.match(re)?.[1] ?? ''
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i)
    return {
      src: attr(/\bsrc=["']([^"']+)["']/i),
      alt: altMatch ? altMatch[1] : null,
      width: attr(/\bwidth=["']?([^"'\s>]+)/i),
      height: attr(/\bheight=["']?([^"'\s>]+)/i),
      loading: attr(/\bloading=["']([^"']*)["']/i).toLowerCase(),
      srcset: attr(/\bsrcset=["']([^"']*)["']/i),
      fetchpriority: attr(/\bfetchpriority=["']([^"']*)["']/i).toLowerCase(),
    }
  })
}

interface Anchor { href: string; rel: string; text: string; external: boolean }

function anchors(html: string, origin: string): Anchor[] {
  return [...getBody(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m => {
    const attrs = m[1]
    const href = attrs.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? ''
    const rel = (attrs.match(/\brel=["']([^"']*)["']/i)?.[1] ?? '').toLowerCase()
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const isAbs = /^https?:\/\//i.test(href)
    const external = isAbs && !!origin && !href.toLowerCase().startsWith(origin.toLowerCase())
    return { href, rel, text, external }
  })
}

function jsonLdTypes(html: string): { types: string[]; topLevelTypes: string[]; invalid: boolean } {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const types: string[] = []
  const topLevelTypes: string[] = []
  let invalid = false
  const pushTypes = (node: unknown, out: string[]) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const t = (node as Record<string, unknown>)['@type']
    if (typeof t === 'string') out.push(t)
    else if (Array.isArray(t)) t.forEach(x => typeof x === 'string' && out.push(x))
  }
  // Deep walk: nested entities (author Person, publisher Organization, mainEntity
  // FAQ items…) count for presence checks, so well-marked-up pages aren't flagged.
  const collectDeep = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(collectDeep)
    pushTypes(node, types)
    for (const v of Object.values(node as Record<string, unknown>)) collectDeep(v)
  }
  for (const b of blocks) {
    const raw = b[1].trim()
    try {
      const parsed = JSON.parse(raw)
      collectDeep(parsed)
      // Top-level types (block roots + direct @graph members) feed the
      // duplicate-block checks, where nested repeats are expected and fine.
      const roots = Array.isArray(parsed) ? parsed : [parsed]
      for (const root of roots) {
        pushTypes(root, topLevelTypes)
        const graph = root && typeof root === 'object' ? (root as Record<string, unknown>)['@graph'] : null
        if (Array.isArray(graph)) graph.forEach(n => pushTypes(n, topLevelTypes))
      }
    } catch {
      invalid = true
    }
  }
  return { types, topLevelTypes, invalid }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pass = (detail: string): AutoCheckResult => ({ status: 'pass', detail })
const fail = (detail: string): AutoCheckResult => ({ status: 'fail', detail })
const warn = (detail: string): AutoCheckResult => ({ status: 'warn', detail })
const na = (detail: string): AutoCheckResult => ({ status: 'na', detail })

function originOf(url: string): string {
  try { const u = new URL(url); return `${u.protocol}//${u.host}` } catch { return '' }
}

function hasType(types: string[], ...names: string[]): boolean {
  const lower = types.map(t => t.toLowerCase())
  return names.some(n => lower.includes(n.toLowerCase()))
}

// ─── Main engine ────────────────────────────────────────────────────────────────

export function runAutoChecks(ctx: AutoCheckContext): ResultMap {
  const r: ResultMap = {}
  const { html, headers, finalUrl, status, robotsTxt } = ctx
  const head = getHead(html)
  const metas = metaTags(head)
  const links = linkTags(head)
  const scripts = scriptTags(html)
  const imgs = imgTags(html)
  const origin = originOf(finalUrl)
  const links_a = anchors(html, origin)
  const fetched = ctx.fetched !== false
  const urlKnown = ctx.urlKnown !== false
  const { types: ldTypes, topLevelTypes: ldTopTypes, invalid: ldInvalid } = jsonLdTypes(html)
  const text = plainText(html)
  const wordCount = text ? text.split(/\s+/).length : 0
  const isHttps = /^https:/i.test(finalUrl)
  const headerLc: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) headerLc[k.toLowerCase()] = v

  // robots meta + X-Robots-Tag
  const robotsMeta = metas.find(m => m.name === 'robots')?.content?.toLowerCase() ?? ''
  const xRobots = (headerLc['x-robots-tag'] ?? '').toLowerCase()
  const hasNoindexMeta = /noindex/.test(robotsMeta)
  const hasNoindexHeader = /noindex/.test(xRobots)

  // canonical
  const canonicals = links.filter(l => l.rel.split(/\s+/).includes('canonical'))

  // ── Crawling — robots.txt ──
  if (robotsTxt != null) {
    const lines = robotsTxt.split(/\r?\n/).map(l => l.trim())
    const blocksAll = /user-agent:\s*\*/i.test(robotsTxt) && /^disallow:\s*\/\s*$/im.test(robotsTxt)
    r['crawling.0.2'] = blocksAll
      ? fail('robots.txt contains "Disallow: /" for User-agent: * — the whole site is blocked')
      : pass('robots.txt does not block the entire site')
    const blocksAssets = lines.some(l => /^disallow:.*\.(css|js)/i.test(l))
    r['crawling.0.1'] = blocksAssets
      ? warn('robots.txt disallows .css/.js resources — Googlebot may not render the page correctly')
      : pass('CSS/JS resources are not blocked in robots.txt')
    const delay = robotsTxt.match(/crawl-delay:\s*(\d+)/i)
    if (delay) {
      r['crawling.0.5'] = Number(delay[1]) > 5
        ? warn(`crawl-delay is set to ${delay[1]}s — high values slow Googlebot crawling`)
        : pass(`crawl-delay is ${delay[1]}s`)
    }
    r['migration.0.5'] = blocksAll
      ? fail('robots.txt blocks the entire URL structure (Disallow: /)')
      : pass('robots.txt is not blocking the site structure')
    const robotsExists = robotsTxt.length > 0
    const blocksSearch = lines.some(l => /^disallow:.*(\?s=|\?q=|\/search)/i.test(l))
    r['siteSearch.0.1'] = !robotsExists
      ? warn('No robots.txt file found — cannot block internal search result URLs')
      : blocksSearch
        ? pass('Internal search params (?s=/?q=) appear blocked in robots.txt')
        : warn('No robots.txt rule blocking internal search result URLs (?s= / ?q=)')
    const blocksImages = lines.some(l => /^disallow:.*\.(jpg|jpeg|png|gif|webp|avif)/i.test(l))
    r['images.0.5'] = blocksImages
      ? warn('robots.txt disallows image files — they cannot be indexed in Google Images')
      : pass('Images are not blocked in robots.txt')
  }

  // ── Indexing — noindex ──
  r['indexing.0.0'] = hasNoindexMeta
    ? fail(`Page is set to noindex via meta robots ("${robotsMeta}") — it will be dropped from the index`)
    : pass('Page is indexable (no noindex meta)')
  r['indexing.0.1'] = hasNoindexMeta
    ? warn('A noindex directive is present — confirm this is intentional and not a leftover from development')
    : pass('No stray noindex directive found')
  if (fetched) {
    if (hasNoindexHeader || hasNoindexMeta) {
      r['indexing.0.2'] = hasNoindexHeader && hasNoindexMeta
        ? warn('noindex set in BOTH the X-Robots-Tag header and meta robots — redundant/conflicting')
        : hasNoindexHeader
          ? warn('noindex set via X-Robots-Tag HTTP header')
          : pass('No conflicting X-Robots-Tag header')
    } else {
      r['indexing.0.2'] = pass('No conflicting noindex header')
    }
  }

  // ── Indexing — canonical ──
  r['indexing.1.0'] = canonicals.length === 0
    ? fail('No rel="canonical" tag found — add one to consolidate ranking signals')
    : pass(`Canonical tag present (${canonicals.length})`)
  if (canonicals.length > 0) {
    const href = canonicals[0].href
    const selfRef = href && (href === finalUrl || href.replace(/\/$/, '') === finalUrl.replace(/\/$/, ''))
    r['indexing.1.1'] = selfRef
      ? pass('Canonical is self-referencing')
      : warn(`Canonical points to a different URL (${href || 'empty'}) — confirm this is intended`)
  } else {
    r['indexing.1.1'] = fail('No self-referencing canonical (no canonical tag at all)')
  }
  r['indexing.1.2'] = canonicals.length > 1
    ? fail(`${canonicals.length} canonical tags on one page — Google will ignore them; keep exactly one`)
    : pass('Single canonical tag')
  r['indexing.1.4'] = canonicals.length > 0 && hasNoindexMeta
    ? fail('Page has BOTH a canonical tag and noindex — conflicting signals; remove one')
    : pass('No canonical/noindex conflict')
  r['migration.0.1'] = canonicals.length === 0
    ? warn('No canonical tag — important after a migration to avoid duplicate URLs')
    : pass('Canonical tag present')

  // ── Thin content ──
  r['indexing.3.0'] = wordCount < 200
    ? fail(`Only ~${wordCount} words of body text — under the 200-word thin-content threshold`)
    : pass(`~${wordCount} words of body content`)

  // ── Architecture — URL ──
  let pathname = ''
  try { pathname = new URL(finalUrl).pathname } catch {}
  if (urlKnown) {
    let qParamCount = 0
    try { qParamCount = [...new URL(finalUrl).searchParams.keys()].length } catch {}
    r['architecture.0.0'] = qParamCount >= 2
      ? warn(`URL has ${qParamCount} query parameters — dynamic parameterised URLs risk duplication`)
      : pass('URL has at most one query parameter')
    r['architecture.0.1'] = finalUrl.length > 75
      ? warn(`URL is ${finalUrl.length} characters — aim for under 75 for cleaner, more crawlable URLs`)
      : pass(`URL length is ${finalUrl.length} characters`)
    r['architecture.0.5'] = /[A-Z]/.test(pathname)
      ? warn('URL path contains uppercase characters — use lowercase to avoid duplicate-URL issues')
      : pass('URL path is lowercase')
  }

  // ── Architecture / link-equity — internal linking ──
  const internalLinks = links_a.filter(a => a.href && !a.external && !/^(mailto:|tel:|javascript:|#)/i.test(a.href))
  const nofollowInternal = internalLinks.filter(a => a.rel.split(/\s+/).includes('nofollow'))
  const totalLinks = links_a.filter(a => a.href).length
  const genericAnchors = links_a.filter(a => /^(click here|read more|here|learn more|more|link)$/i.test(a.text))
  r['architecture.2.0'] = internalLinks.length < 3
    ? warn(`Only ${internalLinks.length} internal links — add more links to related pages`)
    : pass(`${internalLinks.length} internal links`)
  r['architecture.2.3'] = genericAnchors.length > 0
    ? warn(`${genericAnchors.length} links use generic anchor text ("click here", "read more") — use descriptive text`)
    : pass('No generic anchor text detected')
  r['architecture.2.4'] = totalLinks > 100
    ? warn(`${totalLinks} links on the page — too many links dilute link equity`)
    : pass(`${totalLinks} links on the page`)
  r['architecture.2.5'] = nofollowInternal.length > 0
    ? warn(`${nofollowInternal.length} internal links use rel="nofollow" — usually unnecessary and blocks equity flow`)
    : pass('No nofollow on internal links')
  r['linkEquity.0.3'] = r['architecture.2.5']
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i)
  if (footerMatch) {
    const footerLinks = (footerMatch[1].match(/<a\b[^>]*href=/gi) ?? []).length
    r['linkEquity.0.5'] = footerLinks > 40
      ? warn(`Footer contains ${footerLinks} links — trim low-value footer links`)
      : pass(`Footer has ${footerLinks} links`)
  }

  // ── Core Web Vitals (static heuristics) ──
  const heroPreloaded = imgs.some(i => i.fetchpriority === 'high') ||
    links.some(l => l.rel.includes('preload') && l.as === 'image')
  r['cwv.0.0'] = heroPreloaded
    ? pass('A hero image is preloaded / marked fetchpriority="high"')
    : warn('No fetchpriority="high" or image preload found — the LCP image may load late')
  r['cwvRootCause.0.0'] = r['cwv.0.0']
  const imgsNoSrcset = imgs.filter(i => i.src && !i.srcset)
  r['cwv.0.4'] = imgs.length > 0 && imgsNoSrcset.length === imgs.length
    ? warn('No images use srcset — add responsive images to avoid oversized downloads')
    : pass('Responsive srcset is used on at least one image')
  const imgsNoDim = imgs.filter(i => i.src && (!i.width || !i.height))
  r['cwv.2.0'] = imgsNoDim.length > 0
    ? warn(`${imgsNoDim.length} of ${imgs.length} images lack explicit width/height — a common CLS cause`)
    : pass('All images have explicit dimensions')
  r['cwvRootCause.1.0'] = r['cwv.2.0']
  const modernImgs = imgs.filter(i => /\.(webp|avif)(\?|$)/i.test(i.src))
  r['cwv.3.0'] = imgs.length > 0 && modernImgs.length === 0
    ? warn('No WebP/AVIF images detected — convert images to modern formats to cut payload')
    : pass('Modern image formats (WebP/AVIF) in use')
  const blockingCss = links.filter(l => l.rel.includes('stylesheet') && (!l.media || l.media === 'all' || l.media === 'screen'))
  r['cwv.3.2'] = blockingCss.length > 3
    ? warn(`${blockingCss.length} render-blocking stylesheets in <head> — inline critical CSS / defer the rest`)
    : pass(`${blockingCss.length} render-blocking stylesheets`)
  const imgsNoLazy = imgs.filter(i => i.src && i.loading !== 'lazy')
  r['cwv.3.7'] = imgs.length > 3 && imgsNoLazy.length === imgs.length
    ? warn('No images use loading="lazy" — lazy-load below-the-fold images')
    : pass('Lazy loading is used on images')
  if (fetched) {
    r['cwv.3.4'] = headerLc['cache-control']
      ? pass(`Cache-Control header present (${headerLc['cache-control']})`)
      : warn('No Cache-Control header on the document response')
  }

  // third-party scripts
  const extScripts = scripts.filter(s => /^https?:\/\//i.test(s.src) && !s.src.toLowerCase().startsWith(origin.toLowerCase()))
  const syncHeadScripts = scripts.filter(s => s.src && s.inHead && !s.async && !s.defer)
  r['thirdParty.0.0'] = extScripts.length > 8
    ? warn(`${extScripts.length} third-party scripts detected — audit and remove non-essential ones`)
    : pass(`${extScripts.length} third-party scripts`)
  // 0.1: external (analytics/chat/ad) scripts that are render-blocking (sync, in head)
  const extSyncHeadScripts = syncHeadScripts.filter(s =>
    /^https?:\/\//i.test(s.src) && !s.src.toLowerCase().startsWith(origin.toLowerCase())
  )
  r['thirdParty.0.1'] = extSyncHeadScripts.length > 0
    ? warn(`${extSyncHeadScripts.length} external analytics/chat/ad scripts load synchronously in <head> — defer or async them`)
    : pass('No external render-blocking scripts in <head>')
  // 0.2: any script (first or third party) loading synchronously in head
  r['thirdParty.0.2'] = syncHeadScripts.length > 0
    ? warn(`${syncHeadScripts.length} synchronous scripts in <head> may block rendering`)
    : pass('No render-blocking synchronous scripts in <head>')
  r['cwv.1.2'] = extScripts.length > 8
    ? warn(`${extScripts.length} third-party scripts can delay interaction (INP)`)
    : pass('Third-party script count is reasonable')
  r['cwvRootCause.2.1'] = r['cwv.1.2']
  const gaTags = scripts.filter(s => /google-analytics\.com|googletagmanager\.com\/gtag|analytics\.js|gtag\.js/i.test(s.src))
  r['thirdParty.0.4'] = gaTags.length > 1
    ? warn(`${gaTags.length} analytics scripts detected — check for duplicate/legacy tracking (e.g. GA4 + UA)`)
    : pass('No duplicate analytics tags detected')
  // DOM size heuristic
  const domNodes = (html.match(/<[a-z][^>]*>/gi) ?? []).length
  r['cwvRootCause.2.2'] = domNodes > 1500
    ? warn(`~${domNodes} DOM elements — large DOM slows style recalculation and hurts INP`)
    : pass(`~${domNodes} DOM elements`)

  // ── Mobile ──
  const viewport = metas.find(m => m.name === 'viewport')?.content ?? ''
  r['mobile.0.3'] = !viewport
    ? fail('No <meta name="viewport"> — page will not be mobile-friendly')
    : /width=device-width/i.test(viewport)
      ? pass(`Viewport configured (${viewport})`)
      : warn(`Viewport tag does not use width=device-width (${viewport})`)
  r['mobile.1.0'] = /width=\s*\d+/i.test(viewport)
    ? warn('Viewport sets a fixed pixel width — use width=device-width for responsive layout')
    : pass('No fixed-width viewport')

  // ── HTTPS & security ──
  if (urlKnown) {
    const httpAssets = [...html.matchAll(/(?:src|href)=["']http:\/\/[^"']+["']/gi)]
      .filter(m => !/http:\/\/(www\.)?w3\.org/i.test(m[0]))
    const mixed = isHttps && httpAssets.length > 0
    r['https.0.0'] = mixed
      ? fail(`${httpAssets.length} resources loaded over HTTP on an HTTPS page — mixed content`)
      : pass(isHttps ? 'No mixed content detected' : 'Page is not served over HTTPS')
    r['eeat.3.3'] = r['https.0.0']
    r['https.0.2'] = isHttps
      ? pass('Page is served over HTTPS')
      : fail('Page is served over HTTP — redirect all traffic to HTTPS')
  }
  if (fetched) {
    r['https.0.1'] = isHttps && status > 0 && status < 400
      ? pass('HTTPS connection succeeded with a valid certificate')
      : isHttps
        ? warn('HTTPS responded with a non-2xx/3xx status — verify the certificate')
        : fail('Page is not served over HTTPS')
    r['https.0.3'] = headerLc['strict-transport-security']
      ? pass('HSTS header is set')
      : warn('No Strict-Transport-Security (HSTS) header')
  }

  // ── Status codes / redirects ──
  if (fetched) {
    r['statusCodes.0.2'] = status >= 500
      ? fail(`Server returned ${status} — fix the server error`)
      : pass(`Status ${status}`)
    r['statusCodes.0.3'] = status === 503
      ? warn('503 Service Unavailable — ensure maintenance mode is removed')
      : pass('No 503 status')
  }
  const metaRefresh = metas.some(m => m.httpEquiv === 'refresh')
  r['statusCodes.0.4'] = metaRefresh
    ? warn('Page uses a meta-refresh redirect — use a server-side 301 instead')
    : pass('No meta-refresh redirect')
  const has302 = ctx.redirects.some(h => h.status === 302)
  const has307 = ctx.redirects.some(h => h.status === 307)
  if (fetched) {
    r['statusCodes.0.5'] = has302
      ? warn('A 302 (temporary) redirect was followed — use 301 for permanent moves')
      : pass('No 302 redirects in the chain')
  }
  if (ctx.redirects.length > 0) {
    r['redirects.0.0'] = ctx.redirects.length > 1
      ? warn(`Redirect chain of ${ctx.redirects.length} hops — point the first URL straight to the final one`)
      : pass('Single redirect hop')
    const seen = new Set<string>()
    const loop = ctx.redirects.some(h => { if (seen.has(h.url)) return true; seen.add(h.url); return false })
    r['redirects.0.1'] = loop ? fail('Redirect loop detected') : pass('No redirect loop')
    r['redirects.0.2'] = has302 ? warn('302 used in redirect chain — prefer 301 for permanent moves') : pass('No 302 in chain')
    r['redirects.0.3'] = has307 ? warn('307 redirect in chain — confirm it is intentional') : pass('No 307 in chain')
  }

  // ── Structured data / schema ──
  if (ldInvalid) {
    r['schema.0.0'] = fail('A JSON-LD structured-data block failed to parse — fix the syntax')
  } else if (ldTypes.length > 0) {
    r['schema.0.0'] = pass(`Valid JSON-LD found (${[...new Set(ldTypes)].join(', ')})`)
  } else {
    r['schema.0.0'] = warn('No JSON-LD structured data found')
  }
  const dupType = ldTopTypes.find((t, i) => ldTopTypes.indexOf(t) !== i)
  r['schema.0.2'] = dupType
    ? warn(`Duplicate schema block of type "${dupType}" — consolidate into one`)
    : pass('No duplicate schema blocks')
  // Applicability signals — only warn about schema types this page plausibly needs.
  // Everything else is N/A: recorded but excluded from the score, so a SaaS page
  // is never penalised for missing MedicalClinic or Event markup.
  const isHome = pathname === '/' || pathname === ''
  const ogTypeVal = metas.find(m => m.property === 'og:type')?.content?.toLowerCase() ?? ''
  const isArticlePage = hasType(ldTypes, 'Article', 'BlogPosting', 'NewsArticle') ||
    ogTypeVal === 'article' || /<article[\s>]/i.test(html)
  const medicalSignals = (text.match(/\b(clinic|hospital|doctors?|physicians?|patients?|dentists?|dental|surgery|diagnosis)\b/gi) ?? []).length >= 3
  const videoSignals = /<video\b/i.test(html) || /youtube(-nocookie)?\.com\/embed|player\.vimeo\.com|fast\.wistia/i.test(html)
  const reviewSignals = /testimonial|customer review|aggregate rating|★|⭐/i.test(html)
  const headingTexts = [...getBody(html).matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' '))
  const faqSignals = /faq|frequently asked/i.test(text) || headingTexts.filter(t => t.includes('?')).length >= 2
  const localSignals = /href=["']tel:/i.test(html) && /\b(address|directions|opening hours|hours of operation|visit us|our location)\b/i.test(text)

  const missingSchema = (id: string, label: string, applicable: boolean, ...names: string[]) => {
    r[id] = hasType(ldTypes, ...names)
      ? pass(`${label} schema present`)
      : applicable
        ? warn(`${label} schema not found`)
        : na(`${label} schema not applicable to this page type`)
  }
  missingSchema('schema.1.0', 'Organization/LocalBusiness', true, 'Organization', 'LocalBusiness')
  missingSchema('schema.1.1', 'MedicalClinic/Hospital', medicalSignals, 'MedicalClinic', 'Hospital', 'MedicalOrganization')
  missingSchema('schema.1.2', 'Person', isArticlePage || medicalSignals, 'Person')
  missingSchema('schema.1.3', 'BreadcrumbList', !isHome, 'BreadcrumbList')
  missingSchema('schema.1.4', 'FAQPage', faqSignals, 'FAQPage')
  missingSchema('schema.1.5', 'Article/BlogPosting', isArticlePage, 'Article', 'MedicalWebPage', 'BlogPosting', 'NewsArticle')
  missingSchema('schema.1.6', 'Review/AggregateRating', reviewSignals, 'Review', 'AggregateRating')
  missingSchema('schema.1.7', 'Service', false, 'Service')
  missingSchema('schema.1.8', 'Video', videoSignals, 'VideoObject')
  missingSchema('schema.1.9', 'Event', false, 'Event')
  missingSchema('schema.1.10', 'Speakable', false, 'SpeakableSpecification')
  missingSchema('schema.1.11', 'SiteNavigationElement', false, 'SiteNavigationElement')
  r['eeat.2.3'] = hasType(ldTypes, 'Organization', 'LocalBusiness', 'MedicalOrganization')
    ? pass('Organization entity present in schema')
    : warn('No Organization entity in structured data')
  r['aiSeo.0.0'] = hasType(ldTypes, 'Person')
    ? pass('Person entities present in schema')
    : isArticlePage || medicalSignals
      ? warn('No Person entity in schema (authors/experts not marked up)')
      : na('Person entities not required for this page type')
  r['aiSeo.1.4'] = hasType(ldTypes, 'SpeakableSpecification')
    ? pass('Speakable schema present')
    : na('Speakable schema is optional (limited search-engine support)')
  r['localSeo.1.2'] = hasType(ldTypes, 'LocalBusiness', 'MedicalClinic', 'Hospital', 'MedicalOrganization')
    ? pass('LocalBusiness-type schema present')
    : localSignals
      ? warn('Local-business signals found but no LocalBusiness schema')
      : na('No local-business signals on this page — LocalBusiness schema not required')

  // ── Breadcrumbs ──
  const breadcrumbVisible = /aria-label=["']breadcrumb["']/i.test(html) ||
    /class=["'][^"']*breadcrumb/i.test(html)
  r['breadcrumbs.0.0'] = breadcrumbVisible
    ? pass('Breadcrumb navigation markup detected')
    : isHome
      ? na('Breadcrumbs are not needed on the homepage')
      : warn('No visible breadcrumb navigation detected')
  r['breadcrumbs.0.2'] = hasType(ldTypes, 'BreadcrumbList')
    ? pass('BreadcrumbList schema present')
    : isHome
      ? na('BreadcrumbList schema not needed on the homepage')
      : warn('BreadcrumbList schema missing')
  const breadcrumbSchemaCount = ldTopTypes.filter(t => t.toLowerCase() === 'breadcrumblist').length
  r['breadcrumbs.0.5'] = breadcrumbSchemaCount > 1
    ? warn(`${breadcrumbSchemaCount} BreadcrumbList schemas — keep only one`)
    : pass('At most one BreadcrumbList schema')

  // ── International / hreflang ──
  const hreflangs = links.filter(l => l.rel.includes('alternate') && l.hreflang)
  if (hreflangs.length > 0) {
    r['international.0.0'] = pass(`${hreflangs.length} hreflang tags present`)
    const badCodes = hreflangs.filter(l => l.hreflang !== 'x-default' && !/^[a-z]{2}(-[a-zA-Z]{2})?$/.test(l.hreflang))
    r['international.0.1'] = badCodes.length > 0
      ? warn(`Invalid hreflang code(s): ${badCodes.map(b => b.hreflang).join(', ')}`)
      : pass('hreflang language codes look valid')
    r['international.0.4'] = hreflangs.some(l => l.hreflang === 'x-default')
      ? pass('x-default hreflang is set')
      : warn('No x-default hreflang set')
  } else {
    r['international.0.0'] = pass('No hreflang tags — not required for single-language sites')
  }

  // ── JavaScript / renderability heuristics ──
  const emptyRoot = /<div[^>]+id=["'](root|app|__next)["'][^>]*>\s*<\/div>/i.test(html)
  const jsHeavy = wordCount < 150 && scripts.filter(s => s.src).length > 5
  r['javascript.0.0'] = emptyRoot || jsHeavy
    ? warn('Little server-rendered text with heavy JS — critical content may require JS execution')
    : pass('Meaningful content is present in the initial HTML')
  r['renderability.0.0'] = r['javascript.0.0']
  r['javascript.0.1'] = emptyRoot
    ? warn('Empty app root element detected — appears to be a client-rendered SPA without SSR')
    : pass('Content is server-rendered')
  const hiddenText = /style=["'][^"']*display:\s*none[^"']*["'][^>]*>[^<]{80,}/i.test(html)
  r['javascript.0.4'] = hiddenText
    ? warn('Substantial text inside display:none containers — may hide content from indexing')
    : pass('No large hidden text blocks detected')
  const iframes = (getBody(html).match(/<iframe\b/gi) ?? []).length
  r['renderability.0.2'] = iframes > 2
    ? warn(`${iframes} iframes — content inside iframes is not attributed to this page`)
    : pass(`${iframes} iframes`)

  // ── Images / accessibility ──
  const imgsNoAlt = imgs.filter(i => i.alt === null || i.alt.trim() === '')
  r['images.0.0'] = imgsNoAlt.length > 0
    ? warn(`${imgsNoAlt.length} of ${imgs.length} images are missing alt text`)
    : pass(imgs.length ? 'All images have alt text' : 'No images on the page')
  r['accessibility.0.0'] = r['images.0.0']
  r['images.0.3'] = r['cwv.3.0']
  r['images.0.6'] = r['cwv.2.0']
  r['images.0.7'] = r['cwv.3.7']

  // heading hierarchy
  const headings = [...getBody(html).matchAll(/<h([1-6])\b/gi)].map(m => Number(m[1]))
  let skipped = false
  for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) skipped = true
  const h1Count = headings.filter(h => h === 1).length
  r['accessibility.0.1'] = skipped || h1Count !== 1
    ? warn(`Heading hierarchy issue (${h1Count} H1s${skipped ? ', levels skipped' : ''}) — use one H1 and no skipped levels`)
    : pass('Heading hierarchy is well-structured')
  r['accessibility.0.2'] = genericAnchors.length > 0
    ? warn(`${genericAnchors.length} links use non-descriptive text ("click here", "read more")`)
    : pass('Links use descriptive text')
  const tables = [...getBody(html).matchAll(/<table\b[\s\S]*?<\/table>/gi)]
  const tablesNoTh = tables.filter(t => !/<th\b/i.test(t[0]))
  if (tables.length > 0) {
    r['accessibility.0.4'] = tablesNoTh.length > 0
      ? warn(`${tablesNoTh.length} of ${tables.length} tables have no <th> header cells`)
      : pass('Tables use <th> header cells')
  }

  // ── Social / Open Graph ──
  const og = (p: string) => metas.find(m => m.property === `og:${p}`)?.content ?? ''
  const ogTitle = og('title'), ogDesc = og('description'), ogImage = og('image'), ogType = og('type')
  const missingOg = [!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image'].filter(Boolean)
  r['social.0.0'] = missingOg.length > 0
    ? warn(`Missing Open Graph tags: ${missingOg.join(', ')}`)
    : pass('og:title, og:description and og:image are all set')
  // 0.3: specifically checks article/blog pages — these must have OG article type + tags
  if (isArticlePage) {
    r['social.0.3'] = missingOg.length > 0
      ? fail(`Article page is missing Open Graph tags: ${missingOg.join(', ')} — required for social sharing of blog content`)
      : pass('Article/blog page has all required OG tags')
  } else {
    r['social.0.3'] = na('Not an article/blog page — OG article tags not required')
  }
  const twitterCard = metas.find(m => m.name === 'twitter:card')?.content ?? ''
  r['social.0.2'] = twitterCard
    ? pass(`twitter:card set (${twitterCard})`)
    : warn('No twitter:card tag')
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''
  r['social.0.4'] = ogTitle && titleTag && ogTitle.trim() === titleTag
    ? warn('og:title is identical to the <title> — differentiate it for social sharing')
    : pass('og:title differs from the page title (or is unset)')
  r['social.0.5'] = ogType
    ? pass(`og:type set (${ogType})`)
    : warn('No og:type set (e.g. article, website)')

  // ── WordPress signals ──
  const descMetas = metas.filter(m => m.name === 'description')
  r['wordpress.0.1'] = descMetas.length > 1
    ? warn(`${descMetas.length} meta description tags — likely a theme + plugin conflict`)
    : pass('Single meta description tag')
  if (urlKnown) {
    r['wordpress.2.1'] = /\/category\//i.test(pathname)
      ? warn('URL contains /category/ base — consider removing it for cleaner permalinks')
      : pass('No /category/ base in the URL')
  }

  // ── WordPress technical fetches (only present when the page looked like WordPress) ──
  // xmlrpc.php/readme.html "exist" if the server answers at all without a hard block —
  // WordPress typically returns 405 (Method Not Allowed) for a GET to xmlrpc.php, which
  // still confirms the endpoint is live and postable, not a safe "not found".
  if (ctx.wpXmlrpcStatus != null) {
    const blocked = ctx.wpXmlrpcStatus === 403 || ctx.wpXmlrpcStatus === 404
    r['wordpress.2.3'] = !blocked
      ? warn('xmlrpc.php is publicly accessible — consider blocking it (security + crawl risk)')
      : pass('xmlrpc.php is blocked or not found')
  }
  if (ctx.wpReadmeStatus != null) {
    const blocked = ctx.wpReadmeStatus === 403 || ctx.wpReadmeStatus === 404
    r['wordpress.2.4'] = !blocked
      ? warn('readme.html is publicly accessible — it can leak your WordPress version to attackers')
      : pass('readme.html is blocked or not found')
  }
  // Fetched with redirect:'manual' — a 3xx means it correctly redirects to the real
  // permalink (good); a 200 means it served content directly without redirecting (bad).
  if (ctx.wpDefaultUrlStatus != null) {
    const servesDirectly = ctx.wpDefaultUrlStatus >= 200 && ctx.wpDefaultUrlStatus < 300
    r['wordpress.2.2'] = servesDirectly
      ? warn('Default WordPress URL (?p=1) serves content directly instead of redirecting to the permalink')
      : pass('Default WordPress URL (?p=1) does not serve content directly')
  }

  // ── Content-judgeable checks (regex/heuristic — no AI call needed) ──
  const hasPrivacyOrTerms = /\/(privacy|privacy-policy|terms|tos|terms-of-service)(\/|\.|$|["'?])/i.test(html) ||
    links_a.some(a => /privacy policy|terms of service|terms\s*&\s*conditions/i.test(a.text))
  r['eeat.3.1'] = hasPrivacyOrTerms
    ? pass('Privacy policy or terms of service link found')
    : warn('No privacy policy or terms of service link found on this page')

  const hasContactSignal = /href=["']tel:/i.test(html) || /href=["']mailto:/i.test(html) ||
    /\/contact(-us)?(\/|\.|$|["'?])/i.test(html) ||
    links_a.some(a => /contact us|^contact$/i.test(a.text))
  r['eeat.3.2'] = hasContactSignal
    ? pass('Contact information (phone, email, or contact link) found')
    : warn('No clear contact information (phone, email, or contact link) found on this page')

  r['aiSeo.1.0'] = faqSignals
    ? pass('FAQ-style content detected on the page')
    : warn('No FAQ content detected — add a common-questions section for AI/voice search visibility')

  const hasReviewedDate = /\b(last reviewed|last updated|reviewed on|updated on)\b[^.\n]{0,40}(19|20)\d{2}/i.test(text) ||
    /(19|20)\d{2}[^.\n]{0,20}\b(last reviewed|last updated)\b/i.test(text)
  r['aiSeo.3.1'] = hasReviewedDate
    ? pass("A 'last reviewed/updated' date was found in the content")
    : warn("No 'last reviewed' or 'last updated' date found — add one for freshness and citation signals")

  r['aiSeo.3.3'] = wordCount >= 300
    ? pass(`~${wordCount} words — long enough to be a useful citation source`)
    : warn(`Only ~${wordCount} words — likely too short to be cited as a source`)

  // ── Sitemap ──
  if (ctx.sitemapStatus != null) {
    const found = ctx.sitemapStatus >= 200 && ctx.sitemapStatus < 300 && !!ctx.sitemapXml
    r['sitemap.0.0'] = found
      ? pass('XML sitemap found')
      : fail('No XML sitemap found (checked /sitemap.xml, the robots.txt Sitemap: directive, and /sitemap_index.xml)')
    if (found && ctx.sitemapXml) {
      const locs = (ctx.sitemapXml.match(/<loc>/gi) ?? []).length
      r['sitemap.0.5'] = locs > 50000
        ? warn(`Sitemap lists ${locs} URLs — split into multiple sitemaps (50k max each)`)
        : pass(`Sitemap lists ${locs} URLs`)
    }

    // ── Index bloat — low-value URL patterns visible directly in the sitemap, no
    // extra fetches needed. Skipped for sitemap INDEX files (<sitemapindex>), whose
    // <loc> entries point at other sitemap files, not real pages.
    if (found && ctx.sitemapXml && !/<sitemapindex[\s>]/i.test(ctx.sitemapXml)) {
      const sitemapLocs = [...ctx.sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim())
      const matchAny = (re: RegExp) => sitemapLocs.filter(u => re.test(u))

      const tagArchives = matchAny(/\/tag\//i)
      r['indexBloat.0.0'] = tagArchives.length > 0
        ? warn(`${tagArchives.length} WordPress tag archive URL(s) in the sitemap — usually low-value, thin pages`)
        : pass('No WordPress tag archive URLs found in the sitemap')

      const authorArchives = matchAny(/\/author\//i)
      r['indexBloat.0.1'] = authorArchives.length > 0
        ? warn(`${authorArchives.length} author archive URL(s) in the sitemap — usually low-value on single-author sites`)
        : pass('No author archive URLs found in the sitemap')

      const searchResults = matchAny(/[?&](s|q)=|\/search\//i)
      r['indexBloat.0.3'] = searchResults.length > 0
        ? warn(`${searchResults.length} internal search result URL(s) in the sitemap — these should not be indexed`)
        : pass('No internal search result URLs found in the sitemap')

      const deepPagination = sitemapLocs.filter(u => {
        const m = u.match(/\/page\/(\d+)\/?(?:$|[?#])/i) ?? u.match(/[?&]paged=(\d+)/i)
        const n = m ? parseInt(m[1], 10) : null
        return n != null && n >= 4
      })
      r['indexBloat.0.5'] = deepPagination.length > 0
        ? warn(`${deepPagination.length} paginated URL(s) beyond page 3 in the sitemap — consider noindexing deep archive pages`)
        : pass('No deep-pagination URLs (page 4+) found in the sitemap')

      const trackingParams = matchAny(/[?&](utm_[a-z]+|fbclid|gclid|msclkid)=/i)
      r['indexBloat.0.7'] = trackingParams.length > 0
        ? warn(`${trackingParams.length} URL(s) with tracking parameters in the sitemap — these create duplicate-content risk`)
        : pass('No tracking-parameter URLs found in the sitemap')
    }
  }

  // ── Backlinks / Domain Authority ──
  // Only score backlink checks when the OPR lookup actually succeeded — a missing
  // API key, failed fetch, or pasted-HTML audit must not penalise the site.
  if (ctx.oprScore != null) {
    r['backlinks.0.0'] = ctx.oprScore >= 3
      ? pass(`Domain has established page rank (OPR score: ${ctx.oprScore.toFixed(1)}/10)`)
      : ctx.oprScore >= 1
        ? warn(`Domain has low page rank (OPR score: ${ctx.oprScore.toFixed(1)}/10 — target ≥ 3)`)
        : fail('Domain has no established page rank (OPR score: 0)')
    r['backlinks.0.1'] = ctx.domainRank != null && ctx.domainRank > 0
      ? ctx.domainRank < 1_000_000
        ? pass(`Domain is globally ranked (#${ctx.domainRank.toLocaleString()})`)
        : ctx.domainRank < 5_000_000
          ? warn(`Domain rank is outside top 1M (#${ctx.domainRank.toLocaleString()})`)
          : fail(`Domain rank is very low (#${ctx.domainRank.toLocaleString()})`)
      : fail('Domain has no global rank (not indexed by OpenPageRank)')
  }

  return r
}
