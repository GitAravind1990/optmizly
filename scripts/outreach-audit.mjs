/**
 * Outreach audits for SEO agencies: one real AI-visibility gap per agency, found on one of
 * the agency's own clients.
 *
 *   node --env-file=.env.local scripts/outreach-audit.mjs <agencies.csv> [options]
 *
 *   --limit N        agencies to process (default 5 -- check quality and cost before scaling)
 *   --offset N       skip the first N rows, to continue a run in slices (default 0)
 *   --prompts N      queries per client, 3-5 (default 5)
 *   --max-spend USD  stop before starting an agency that could take the run past this (default 1)
 *   --out DIR        output directory (default outreach/, which is gitignored)
 *   --dry            find each agency's client and stop: no DataForSEO calls, no spend
 *
 * Input: a CSV with "Agency" and "Website" columns. Output, in --out:
 *
 *   audits.csv     Agency | Client | Query | Competitor named | Engine | One-line finding
 *   failures.csv   every agency that produced no row, with the stage and the reason, for doing
 *                  by hand. "No gap found" is listed here too: it is a real result, not a fault,
 *                  but it is still an agency with nothing to send.
 *   details.jsonl  the full evidence per agency -- where the client was found, every query, every
 *                  engine's cited domains -- so any row in audits.csv can be checked before it is
 *                  sent to anyone.
 *
 * WHAT IS REUSED, AND WHAT THAT MEANS FOR THE OUTPUT
 *
 * The checker is the AI Visibility tool's own code, loaded from src/lib, not a copy of it:
 *  - queries:  `getRankedKeywords(domain, 25, { maxPosition: 10 })`, the call the tool's
 *              /prompts route makes for a domain with no Search Console connection, which is
 *              every client here. Branded queries are dropped (a query containing the client's
 *              name cannot show a gap) and commercial ones are taken first.
 *  - engines:  `runPrompt`, the function /batch runs. It covers **Google AI Overviews and
 *              Google AI Mode**. It does not query ChatGPT or Perplexity -- the tool was scoped
 *              to Google's two surfaces on cost -- so neither appears in the Engine column.
 *  - mentions: `countBrandMentions` via runPrompt, the tool's own matcher.
 *
 * "Competitor named" is a domain the engine **cited as a source** in an answer that neither
 * names nor cites the client. That is what the checker records about other brands; it does not
 * extract competitor names from the answer prose, and inventing that here would be a second
 * checker. The finding line says "cites" for that reason.
 *
 * NOTHING IS INFERRED
 *
 *  - The client's domain is one the agency's own case-study / portfolio pages actually link to,
 *    and that answers with a real page. No model guesses a domain from a name. An agency whose
 *    pages name clients without linking them is logged as "no client found" for manual work.
 *  - A gap needs an AI answer that exists, with zero mentions of the client, the client's domain
 *    absent from its citations, and a business domain cited. Directories, encyclopaedias and
 *    publishers (Wikipedia, Yelp, Forbes...) do not count as competitors.
 *  - A failed lookup is a failed lookup, never a "not mentioned".
 *
 * COST (DataForSEO, measured rates from src/lib/dataforseo.ts)
 *
 *   ranked keywords   ~$0.015 per client (one Labs task, 25 rows)
 *   AI Overview        $0.0035 per query
 *   AI Mode            $0.0040 per query
 *   ---------------------------------------------------------------
 *   ~$0.053 per agency at 5 queries (measured: $0.051, $0.053); $0 for an agency that fails
 *   before the client is found.
 *   100 agencies ~ $5.
 *
 * The account balance is read before and after the run, so the summary reports what was
 * actually spent rather than only this estimate. Page fetches to agency and client sites cost
 * nothing. No LLM is called.
 *
 * RATE LIMITING
 *
 * Agencies run one at a time. Fetches to any one site are spaced SITE_DELAY_MS apart, with a
 * pause between agencies. Each client's queries run like one /batch request: up to five prompts
 * concurrently, two surfaces each, so at most ten DataForSEO calls in flight.
 */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const ROOT = resolve(import.meta.dirname, '..')
const jiti = require('jiti')(import.meta.filename, { alias: { '@': join(ROOT, 'src') } })
const { runPrompt } = jiti('../src/lib/ai-visibility.ts')
const { getRankedKeywords, isDataForSEOConfigured } = jiti('../src/lib/dataforseo.ts')

// ---------- configuration ----------

const COST = { rankedKeywords: 0.015, perPrompt: 0.0035 + 0.004 }
const SITE_DELAY_MS = 1500
const AGENCY_DELAY_MS = 3000
const FETCH_TIMEOUT_MS = 15000
const MAX_LISTING_PAGES = 4
const MAX_DETAIL_PAGES = 6
const MAX_CLIENT_CANDIDATES = 4
const USER_AGENT = 'Mozilla/5.0 (compatible; OptmizlyAudit/1.0; +https://optmizly.com)'

/** Paths that hold a client list or case studies, matched against a link's path or its text. */
const WORK_RE = /case[-_ ]?stud|portfolio|our[-_ ]?work|^\/work\b|\bwork\b|clients|success[-_ ]?stor|results|testimonials/i
const GUESSED_PATHS = ['/case-studies', '/portfolio', '/clients', '/work', '/our-work', '/results']

/** Commercial modifiers, taken first when choosing which ranked queries to ask about. */
const COMMERCIAL_RE = /\b(best|top|near me|cost|costs|price|prices|pricing|cheap|affordable|buy|hire|services?|company|companies|agency|contractor|provider|vs|versus|review|reviews|quote|rates?|installer|repair|clinic|lawyer|attorney|dentist|shop|store|for sale|rental|software|tool)\b/i

/**
 * Links that are never a client: the agency's tooling, platforms, social profiles, review
 * sites and badges. An agency's case-study page links to these far more often than to clients.
 */
const NOT_A_CLIENT = new Set([
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'youtu.be',
  'tiktok.com', 'pinterest.com', 'threads.net', 'whatsapp.com', 'wa.me', 'vimeo.com', 'behance.net',
  'dribbble.com', 'medium.com', 'github.com', 'google.com', 'goo.gl', 'g.page', 'apple.com',
  'microsoft.com', 'bing.com', 'clutch.co', 'goodfirms.co', 'designrush.com', 'sortlist.com',
  'upcity.com', 'trustpilot.com', 'g2.com', 'capterra.com', 'semrush.com', 'ahrefs.com', 'moz.com',
  'hubspot.com', 'hubspot.net', 'hs-sites.com', 'wordpress.org', 'wordpress.com', 'wix.com', 'squarespace.com',
  'webflow.io', 'webflow.com', 'shopify.com', 'myshopify.com', 'calendly.com', 'typeform.com', 'cloudflare.com',
  'gstatic.com', 'googleapis.com', 'googletagmanager.com', 'google-analytics.com', 'doubleclick.net',
  'w3.org', 'schema.org', 'gravatar.com', 'yelp.com', 'bbb.org', 'glassdoor.com', 'indeed.com',
  'mailchimp.com', 'list-manage.com', 'zoom.us', 'canva.com', 'elementor.com', 'wpengine.com',
  'godaddy.com', 'bit.ly', 'linktr.ee', 'spotify.com', 'apps.apple.com', 'play.google.com', 'amazon.com',
])

/**
 * Cited domains that are not anyone's competitor: reference sites, directories, marketplaces,
 * publishers. "Google cites Wikipedia instead of you" is not a pitch.
 */
const NOT_A_COMPETITOR = new Set([
  ...NOT_A_CLIENT,
  'wikipedia.org', 'reddit.com', 'quora.com', 'wikihow.com', 'britannica.com', 'merriam-webster.com',
  'dictionary.com', 'forbes.com', 'nytimes.com', 'cnn.com', 'bbc.com', 'bbc.co.uk', 'theguardian.com',
  'usnews.com', 'investopedia.com', 'nerdwallet.com', 'healthline.com', 'webmd.com', 'mayoclinic.org',
  'clevelandclinic.org', 'consumerreports.org', 'tripadvisor.com', 'angi.com', 'homeadvisor.com',
  'thumbtack.com', 'houzz.com', 'yellowpages.com', 'mapquest.com', 'nextdoor.com', 'crunchbase.com',
  'zillow.com', 'realtor.com', 'ebay.com', 'walmart.com', 'etsy.com', 'bestbuy.com', 'target.com',
  'homedepot.com', 'lowes.com', 'businessinsider.com', 'cnet.com', 'pcmag.com', 'techradar.com',
  'zapier.com', 'stackoverflow.com', 'quizlet.com', 'scribd.com', 'slideshare.net', 'issuu.com',
  'indeed.com', 'ziprecruiter.com', 'expertise.com', 'yelp.ca', 'yelp.co.uk',
])
const NON_COMMERCIAL_TLD = /\.(gov|edu|mil|int)(\.[a-z]{2})?$|\.(gov|ac|nhs|sch)\.uk$/

// ---------- args ----------

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback
}
const inputPath = args.find((a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && args[i - 1] !== '--dry'))
const LIMIT = Number(flag('limit', 5))
const OFFSET = Number(flag('offset', 0))
const PROMPTS = Math.min(5, Math.max(3, Number(flag('prompts', 5))))
const MAX_SPEND = Number(flag('max-spend', 1))
const OUT = resolve(flag('out', join(ROOT, 'outreach')))
const DRY = args.includes('--dry')

if (!inputPath) {
  console.error('Usage: node --env-file=.env.local scripts/outreach-audit.mjs <agencies.csv> [--limit 5] [--offset 0] [--prompts 5] [--max-spend 1] [--out outreach]')
  process.exit(1)
}
if (!isDataForSEOConfigured()) {
  console.error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set. Run with --env-file=.env.local.')
  process.exit(1)
}

// ---------- CSV ----------

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim())) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(f => f.trim())) rows.push(row)
  return rows
}

const csvCell = v => {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csvLine = cells => cells.map(csvCell).join(',') + '\n'

function readAgencies(path) {
  const rows = parseCsv(readFileSync(path, 'utf8').replace(/^﻿/, ''))
  const header = rows.shift()?.map(h => h.trim().toLowerCase()) ?? []
  const ai = header.indexOf('agency'), wi = header.indexOf('website')
  if (ai < 0 || wi < 0) throw new Error(`Expected "Agency" and "Website" columns; found: ${header.join(', ')}`)
  return rows.map(r => ({ agency: (r[ai] ?? '').trim(), website: (r[wi] ?? '').trim() }))
}

// ---------- domains ----------

const MULTI_PART_SUFFIX = /\.(co|com|org|net|ac|gov|edu)\.(uk|au|nz|in|za|br|sg|jp|mx|my|ph|pk|ng|ke)$/

/** example.co.uk from https://www.shop.example.co.uk/x. Good enough for comparing sites. */
function registrable(hostOrUrl) {
  let host = String(hostOrUrl).toLowerCase().trim()
  try { if (/^https?:\/\//.test(host)) host = new URL(host).hostname } catch { return '' }
  host = host.replace(/^www\./, '').replace(/\.$/, '')
  const parts = host.split('.')
  const keep = MULTI_PART_SUFFIX.test(host) ? 3 : 2
  return parts.slice(-keep).join('.')
}

/** The brand-ish label of a domain: "acmeplumbing" from acmeplumbing.co.uk. */
const domainStem = d => registrable(d).split('.')[0]

const blocked = (domain, set) => {
  const reg = registrable(domain)
  return set.has(reg) || set.has(domain) || NON_COMMERCIAL_TLD.test(domain)
}

// ---------- fetching and HTML ----------

const sleep = ms => new Promise(r => setTimeout(r, ms))
let lastFetchByHost = new Map()

async function fetchPage(url) {
  const host = registrable(url)
  const wait = (lastFetchByHost.get(host) ?? 0) + SITE_DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastFetchByHost.set(host, Date.now())

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('html')) throw new Error(`Not HTML (${type || 'no content-type'}) at ${url}`)
  return { url: res.url, html: await res.text() }
}

const decode = s => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;|&rsquo;|&lsquo;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
const textOf = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** Every <a href> on a page, absolute, with its visible text or its image's alt text. */
function linksOf(page) {
  const out = []
  const re = /<a\b[^>]*?\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const m of page.html.matchAll(re)) {
    let abs
    try { abs = new URL(decode(m[1]), page.url) } catch { continue }
    if (!/^https?:$/.test(abs.protocol)) continue
    const alt = m[2].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''
    out.push({ url: abs.href.replace(/#.*$/, ''), host: abs.hostname.toLowerCase(), path: abs.pathname, text: textOf(m[2]) || decode(alt).trim() })
  }
  return out
}

const metaContent = (html, attr, value) =>
  html.match(new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1]
  ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`, 'i'))?.[1]

/**
 * The client's brand as the client's own site states it, for mention matching.
 *
 * og:site_name first; otherwise the <title> segment most like the domain. The brand matters
 * because mention counting uses it: a wrong one would report "not named" for a brand that was.
 * Aliases (the domain stem, the agency's anchor text) widen the match, which can only make a
 * gap less likely to be claimed, never more.
 */
function brandOf(html, domain, anchorText) {
  const stem = domainStem(domain)
  const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const site = metaContent(html, 'property', 'og:site_name')
  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const segments = title.split(/\s+[|\-–—:·•]\s+/).map(s => s.trim()).filter(s => s && s.length <= 60)
  const overlap = s => { const q = squash(s); return q && (stem.includes(q) || q.includes(stem)) ? 2 : (q.slice(0, 4) === stem.slice(0, 4) ? 1 : 0) }
  const best = segments.map(s => [s, overlap(s)]).sort((a, b) => b[1] - a[1])[0]

  const generic = /^(visit|view|see|website|site|link|click|here|read more|learn more|case study|home)\b/i
  // Only when it looks like the brand. Case studies link deep into a client's site with the
  // article's own title as the text ("Kahoot! alternatives" -> mentimeter.com), which is not a
  // name for the client.
  const anchor = anchorText && anchorText.length <= 40 && !generic.test(anchorText) && !/^https?:/i.test(anchorText)
    && overlap(anchorText) > 0 ? anchorText : null
  const brand = (site && decode(site).trim())
    || (best && best[1] > 0 ? best[0] : null)
    || anchor
    || stem.charAt(0).toUpperCase() + stem.slice(1)
  const aliases = [...new Set([stem, anchor, site && decode(site).trim()].filter(a => a && squash(a) !== squash(brand)))].slice(0, 4)
  return { brand: brand.slice(0, 120), aliases, title }
}

// ---------- step 1: find a client ----------

async function findClient(website, agencyDomain) {
  const home = await fetchPage(website)
  const homeLinks = linksOf(home)
  // A domain linked from the homepage too is site-wide chrome -- a footer partner badge, the
  // parent company, a "website by" credit -- not a client the case studies are about.
  const onHome = new Set(homeLinks.map(l => registrable(l.host)).filter(d => d !== agencyDomain))

  const sameSite = l => registrable(l.host) === agencyDomain
  const listingUrls = [...new Set(homeLinks
    .filter(l => sameSite(l) && l.path !== '/' && (WORK_RE.test(l.path) || WORK_RE.test(l.text)))
    .map(l => l.url))].slice(0, MAX_LISTING_PAGES)
  if (!listingUrls.length) {
    for (const p of GUESSED_PATHS) listingUrls.push(new URL(p, home.url).href)
  }

  const candidates = new Map() // domain -> { domain, url, anchor, source, strength }
  const consider = (links, source, strength) => {
    for (const l of links) {
      const d = registrable(l.host)
      if (!d || d === agencyDomain || blocked(l.host, NOT_A_CLIENT) || onHome.has(d)) continue
      const prev = candidates.get(d)
      if (!prev || prev.strength < strength) candidates.set(d, { domain: d, url: l.url, anchor: l.text, source, strength })
    }
  }

  const pagesTried = []
  let detailBudget = MAX_DETAIL_PAGES
  for (const listingUrl of listingUrls) {
    let listing
    try { listing = await fetchPage(listingUrl) } catch { continue }
    pagesTried.push(listing.url)
    const links = linksOf(listing)
    consider(links, listing.url, 1)

    // Individual case studies under the listing. A case study linking out to a site is the
    // strongest evidence that site is the client it describes.
    const base = new URL(listing.url).pathname.replace(/\/$/, '')
    const details = [...new Set(links
      .filter(l => sameSite(l) && base && l.path.startsWith(base + '/') && l.path.length > base.length + 2)
      .map(l => l.url))]
    for (const d of details) {
      if (detailBudget-- <= 0) break
      try {
        const page = await fetchPage(d)
        pagesTried.push(page.url)
        consider(linksOf(page), page.url, 2)
      } catch { /* one unreachable case study is not a failed agency */ }
    }
    if ([...candidates.values()].some(c => c.strength === 2)) break
  }

  if (!pagesTried.length) return { client: null, reason: 'no case studies / portfolio / clients page found', pagesTried }

  // Strongest evidence first; each candidate must be a live site before it is believed.
  const ordered = [...candidates.values()].sort((a, b) => b.strength - a.strength).slice(0, MAX_CLIENT_CANDIDATES)
  for (const c of ordered) {
    try {
      const site = await fetchPage(`https://${c.domain}/`)
      if (/domain (is )?for sale|parked (free|domain)|buy this domain|this domain may be for sale/i.test(site.html.slice(0, 20000))) continue
      const domain = registrable(new URL(site.url).hostname)
      if (domain !== c.domain && (blocked(domain, NOT_A_CLIENT) || domain === agencyDomain)) continue
      return { client: { ...c, domain, ...brandOf(site.html, domain, c.anchor) }, pagesTried }
    } catch { /* dead link: try the next one */ }
  }
  return {
    client: null,
    reason: candidates.size
      ? `${candidates.size} outbound link(s) on work pages, none a live client site`
      : 'work pages found, but they link to no client sites',
    pagesTried,
  }
}

// ---------- step 2: queries ----------

/**
 * The tool's own query source for a domain without Search Console: what it ranks top-10 for.
 * Same call and same parameters as /api/tools/ai-visibility/prompts.
 */
async function queriesFor(client) {
  const ranked = await getRankedKeywords(client.domain, 25, { maxPosition: 10 })
  if (ranked === null) throw new Error('ranked-keywords lookup failed')
  const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const names = [client.brand, ...client.aliases].map(squash).filter(n => n.length >= 3)
  const unbranded = ranked.items
    .filter((r, i, all) => r.keyword.length > 2 && r.keyword.length <= 200 && all.findIndex(x => x.keyword === r.keyword) === i)
    .filter(r => !names.some(n => squash(r.keyword).includes(n)))
  // One query per idea. Ranked keywords arrive as clusters of variants -- measured on
  // mentimeter.com, the top five were all "multiple answer question(s)" reworded, which asks the
  // engines the same thing five times and counts one answer as a recurring competitor.
  const seen = new Set()
  const distinct = unbranded.filter(r => {
    const key = ideaKey(r.keyword)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const commercial = distinct.filter(r => COMMERCIAL_RE.test(r.keyword))
  const rest = distinct.filter(r => !COMMERCIAL_RE.test(r.keyword))
  return { picked: [...commercial, ...rest].slice(0, PROMPTS), rankedTotal: ranked.items.length, brandedDropped: ranked.items.length - unbranded.length }
}

const STOPWORDS = new Set(['a', 'an', 'the', 'with', 'for', 'of', 'to', 'in', 'on', 'and', 'or', 'how', 'what', 'is', 'are', 'do', 'does', 'my', 'your'])

/** Words cut to five letters, sorted: "question with multiple answers" == "multi answer questions". */
const ideaKey = keyword => keyword.toLowerCase().split(/[^a-z0-9]+/)
  .filter(w => w && !STOPWORDS.has(w)).map(w => w.slice(0, 5)).sort().join(' ')

// ---------- step 3: the gap ----------

const ENGINE_LABEL = { aiMode: 'Google AI Mode', aiOverview: 'Google AI Overview' }
const SUPPORT_HOST = /^(community|help|support|docs|forum|forums|kb|answers|academy|learn|knowledge|teaching-resources)\./

function strongestGap(outcomes, picked, client, agencyDomain) {
  const isClient = d => registrable(d) === client.domain
  const gaps = []
  for (const o of outcomes) {
    for (const surface of ['aiMode', 'aiOverview']) {
      const r = o[surface]
      // null = the lookup failed. Never read as "not mentioned".
      if (!r || !r.answerPresent) continue
      if (r.mentions > 0 || r.cited || r.citedDomains.some(isClient)) continue
      const eligible = r.citedDomains
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => !isClient(d) && registrable(d) !== agencyDomain && !blocked(d, NOT_A_COMPETITOR))
      if (!eligible.length) continue
      // A company's main site over its help centre or forum: community.instructure.com
      // answering a how-to is Canvas's documentation, not Canvas out-marketing the client.
      const pick = eligible.find(({ d }) => !SUPPORT_HOST.test(d)) ?? eligible[0]
      const competitor = registrable(pick.d)
      const ranked = picked.find(p => p.keyword === o.prompt)
      gaps.push({
        query: o.prompt, surface, engine: ENGINE_LABEL[surface], competitor, citeIndex: pick.i,
        supportPage: SUPPORT_HOST.test(pick.d),
        competitorUrl: r.citedUrls?.find(u => registrable(u.domain) === competitor)?.url ?? null,
        clientPosition: ranked?.position ?? null, volume: ranked?.volume ?? 0,
      })
    }
  }
  if (!gaps.length) return null
  // Strongest: a competitor that keeps winning across this client's queries, then the query
  // with the most searches, then the competitor the engine listed earliest.
  const recurrence = new Map()
  for (const g of gaps) recurrence.set(g.competitor, (recurrence.get(g.competitor) ?? 0) + 1)
  gaps.sort((a, b) =>
    a.supportPage - b.supportPage
    || recurrence.get(b.competitor) - recurrence.get(a.competitor) || b.volume - a.volume || a.citeIndex - b.citeIndex)
  return { ...gaps[0], recurrence: recurrence.get(gaps[0].competitor), allGaps: gaps.length }
}

function findingLine(client, gap) {
  const rank = gap.clientPosition ? `ranks #${gap.clientPosition} on Google for "${gap.query}", but ` : `For "${gap.query}", `
  const lead = gap.clientPosition ? `${client.brand} ${rank}` : rank
  const extra = gap.recurrence > 1 ? ` (${gap.recurrence} times across ${client.brand}'s queries)` : ''
  return `${lead}${gap.engine} cites ${gap.competitor}${extra} and never mentions ${client.brand}.`
}

// ---------- DataForSEO balance, for measured spend ----------

async function dfsBalance() {
  try {
    const auth = 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', { headers: { Authorization: auth } })
    const json = await res.json()
    const b = json?.tasks?.[0]?.result?.[0]?.money?.balance
    return typeof b === 'number' ? b : null
  } catch { return null }
}

// ---------- run ----------

mkdirSync(OUT, { recursive: true })
const auditsPath = join(OUT, 'audits.csv')
const failuresPath = join(OUT, 'failures.csv')
const detailsPath = join(OUT, 'details.jsonl')
if (!existsSync(auditsPath)) writeFileSync(auditsPath, csvLine(['Agency', 'Client', 'Query', 'Competitor named', 'Engine', 'One-line finding']))
if (!existsSync(failuresPath)) writeFileSync(failuresPath, csvLine(['Agency', 'Website', 'Stage', 'Reason', 'Client', 'Logged at']))

const agencies = readAgencies(inputPath).slice(OFFSET, OFFSET + LIMIT)
const perAgency = COST.rankedKeywords + PROMPTS * COST.perPrompt
console.log(`${agencies.length} agencies (rows ${OFFSET + 1}-${OFFSET + agencies.length}), ${PROMPTS} queries each.`)
console.log(`Estimated ceiling: $${(agencies.length * perAgency).toFixed(3)} ($${perAgency.toFixed(4)}/agency). Spend cap: $${MAX_SPEND.toFixed(2)}.\n`)

const balanceBefore = await dfsBalance()
let estimatedSpend = 0
const tally = { audits: 0, failed: 0, noGap: 0 }

const fail = (a, stage, reason, client = '', detail = {}) => {
  tally[stage === 'no gap' ? 'noGap' : 'failed']++
  appendFileSync(failuresPath, csvLine([a.agency, a.website, stage, reason, client, new Date().toISOString()]))
  appendFileSync(detailsPath, JSON.stringify({ agency: a.agency, website: a.website, status: stage, reason, ...detail }) + '\n')
  console.log(`  ✗ ${stage}: ${reason}`)
}

for (const [i, a] of agencies.entries()) {
  if (i > 0) await sleep(AGENCY_DELAY_MS)
  console.log(`[${i + 1}/${agencies.length}] ${a.agency || '(no name)'} — ${a.website || '(no website)'}`)

  if (!a.website) { fail(a, 'input', 'no website in CSV'); continue }
  const website = /^https?:\/\//i.test(a.website) ? a.website : `https://${a.website}`
  const agencyDomain = registrable(website)
  if (!agencyDomain) { fail(a, 'input', `unreadable website "${a.website}"`); continue }

  let found
  try { found = await findClient(website, agencyDomain) }
  catch (e) { fail(a, 'client', `agency site unreachable: ${e.message}`); continue }
  if (!found.client) { fail(a, 'client', `no client found — ${found.reason}`, '', { pagesTried: found.pagesTried }); continue }
  const client = found.client
  console.log(`  client: ${client.brand} (${client.domain}) via ${client.source}${client.aliases.length ? ` [also matches: ${client.aliases.join(', ')}]` : ''}`)
  if (DRY) continue

  if (estimatedSpend + perAgency > MAX_SPEND) {
    fail(a, 'budget', `stopped: next agency could pass the $${MAX_SPEND} cap`, client.domain)
    console.log('\nSpend cap reached; stopping. Continue with --offset to pick up from here.')
    break
  }

  let q
  try { q = await queriesFor(client) }
  catch (e) { estimatedSpend += COST.rankedKeywords; fail(a, 'queries', e.message, client.domain, { client }); continue }
  estimatedSpend += COST.rankedKeywords
  if (q.picked.length < 3) {
    fail(a, 'queries', `only ${q.picked.length} unbranded top-10 queries for ${client.domain} (${q.rankedTotal} ranked, ${q.brandedDropped} branded)`, client.domain, { client })
    continue
  }
  console.log(`  queries: ${q.picked.map(p => p.keyword).join(' | ')}`)

  const outcomes = await Promise.all(q.picked.map(p =>
    runPrompt(p.keyword, client.brand, client.domain, client.aliases)
      .catch(() => ({ prompt: p.keyword, aiOverview: null, aiMode: null }))))
  estimatedSpend += q.picked.length * COST.perPrompt

  const detail = {
    client: { name: client.brand, aliases: client.aliases, domain: client.domain, foundOn: client.source, linkedAs: client.anchor, homepageTitle: client.title },
    queries: q.picked,
    outcomes: outcomes.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) =>
      [k, v && typeof v === 'object' ? { answerPresent: v.answerPresent, mentions: v.mentions, cited: v.cited, citedDomains: v.citedDomains } : v]))),
  }

  const failedLookups = outcomes.reduce((n, o) => n + (o.aiMode === null) + (o.aiOverview === null), 0)
  if (failedLookups === outcomes.length * 2) { fail(a, 'checker', 'every AI lookup failed', client.domain, detail); continue }

  const gap = strongestGap(outcomes, q.picked, client, agencyDomain)
  if (!gap) {
    const answers = outcomes.reduce((n, o) => n + !!o.aiMode?.answerPresent + !!o.aiOverview?.answerPresent, 0)
    const named = outcomes.reduce((n, o) => n + ['aiMode', 'aiOverview'].filter(s => o[s]?.answerPresent && (o[s].mentions > 0 || o[s].cited)).length, 0)
    fail(a, 'no gap', `${answers} AI answers across ${q.picked.length} queries; ${client.brand} named or cited in ${named}; no business competitor cited where it was absent${failedLookups ? `; ${failedLookups} lookups failed` : ''}`, client.domain, detail)
    continue
  }

  const line = findingLine(client, gap)
  appendFileSync(auditsPath, csvLine([a.agency, `${client.brand} (${client.domain})`, gap.query, gap.competitor, gap.engine, line]))
  appendFileSync(detailsPath, JSON.stringify({ agency: a.agency, website: a.website, status: 'audit', gap, ...detail }) + '\n')
  tally.audits++
  console.log(`  ✓ ${line}`)
}

const balanceAfter = await dfsBalance()
console.log(`\nDone: ${tally.audits} audits, ${tally.noGap} with no gap, ${tally.failed} failed.`)
console.log(`Estimated DataForSEO spend: $${estimatedSpend.toFixed(4)}`)
if (balanceBefore !== null && balanceAfter !== null) {
  console.log(`Measured from account balance: $${(balanceBefore - balanceAfter).toFixed(4)} ($${balanceBefore.toFixed(2)} → $${balanceAfter.toFixed(2)})`)
}
console.log(`Output: ${OUT}`)
await jiti('../src/lib/prisma.ts').prisma.$disconnect().catch(() => {})
