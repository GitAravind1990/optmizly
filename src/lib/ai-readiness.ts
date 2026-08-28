/**
 * AI Search Readiness — the free, no-signup audit behind the homepage and
 * /tools/ai-search-readiness.
 *
 * Three rules shaped this module, and they are the reason it looks the way it does:
 *
 * 1. **It costs nothing to run.** Every check is deterministic parsing of pages we fetch
 *    ourselves. No DataForSEO, no model call, no vendor of any kind. That is what makes it
 *    safe to hand to anonymous visitors five times a day: the only spend is bandwidth.
 *    It is also why the result is instant, which matters more for a landing page than
 *    depth does.
 *
 * 2. **Nothing is estimated, inferred or invented.** Every point in the score traces to
 *    something measured on the page. Where a thing could not be measured — robots.txt did
 *    not load, say — the category says so rather than scoring it as a pass or a fail. A
 *    free audit that guesses is worth less than no audit, because the first thing a
 *    visitor does is check it against a site they know.
 *
 * 3. **The HTML is untrusted and does not leave here as raw text.** Only the structured
 *    signals and findings below travel onward, and the two site-authored strings that do
 *    travel — the page title and the detected site name — are length-capped. This is a
 *    public endpoint: whatever it returns, a stranger chose the input for.
 *
 * Polarity note, because this repo already has a score pointing the other way:
 * `scoreOpportunity` in opportunity-score.ts measures the *share of checks failed* — high
 * means a good sales prospect. This one measures readiness — high means a healthy site.
 * They are deliberately separate functions over separate signals; do not merge them.
 */

import { validateUrl } from './ssrf-guard'
import { fetchHomepage, analyzeHomepage, type SEOFinding, type SEOSignals } from './homepage-seo-check'

/** Budget for the two small side files. The page fetch has its own inside fetchHomepage. */
const SIDE_FILE_TIMEOUT_MS = 4_000

/** robots.txt and llms.txt are text files. Anything past this is not one. */
const SIDE_FILE_MAX_BYTES = 256 * 1024

const UA = 'Mozilla/5.0 (compatible; Optmizly-Readiness/1.0; +https://optmizly.com)'

/** Site-authored strings are echoed to the browser, so they are capped like the ones in
 *  homepage-seo-check. Nothing here reaches a prompt, but the cap costs nothing. */
const MAX_ECHOED_CHARS = 200

/**
 * The crawlers that actually decide whether a page can appear in an AI answer.
 *
 * Split by what blocking one costs you, because they are not interchangeable and a single
 * "blocks AI crawlers: yes/no" verdict would be wrong for most sites:
 *
 *   - `answer` agents fetch a page live to answer a question a user is asking right now.
 *     Blocking them removes you from that answer.
 *   - `training` agents collect corpora. Blocking them is a legitimate, common editorial
 *     choice with no effect on live retrieval, so it is reported, never scored against.
 */
const AI_CRAWLERS: Array<{ token: string; label: string; kind: 'answer' | 'training' }> = [
  { token: 'gptbot', label: 'GPTBot (OpenAI)', kind: 'training' },
  { token: 'chatgpt-user', label: 'ChatGPT-User (live answers)', kind: 'answer' },
  { token: 'oai-searchbot', label: 'OAI-SearchBot (ChatGPT Search)', kind: 'answer' },
  { token: 'perplexitybot', label: 'PerplexityBot', kind: 'answer' },
  { token: 'claudebot', label: 'ClaudeBot (Anthropic)', kind: 'training' },
  { token: 'claude-web', label: 'Claude-Web (live answers)', kind: 'answer' },
  { token: 'google-extended', label: 'Google-Extended (Gemini / AI Overviews)', kind: 'training' },
  { token: 'ccbot', label: 'CCBot (Common Crawl)', kind: 'training' },
  { token: 'bingbot', label: 'Bingbot (Copilot)', kind: 'answer' },
]

const QUESTION_STARTERS = /^(how|what|why|when|where|who|which|can|do|does|is|are|should|will)\b/i

export type ReadinessLevel = 'strong' | 'moderate' | 'weak' | 'unknown'

export interface ReadinessCategory {
  id: string
  label: string
  /** What this category is measuring, in the visitor's language. */
  blurb: string
  /** 0-100, or null when nothing could be measured. Null never scores as zero. */
  score: number | null
  weight: number
  level: ReadinessLevel
  /** One line stating what was actually found. */
  detail: string
}

export interface ReadinessAction {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  /** What was measured. */
  detail: string
  /** What to do about it. */
  fix: string
}

export interface ReadinessReport {
  url: string
  finalUrl: string
  /** 0-100 across the categories that could be measured. */
  score: number
  level: ReadinessLevel
  categories: ReadinessCategory[]
  actions: ReadinessAction[]
  /** Plain-language notes about what the audit could and could not see. */
  limits: string[]
  measuredAt: string
}

/** Everything the parsers found. Kept separate from the scoring so the score stays a pure
 *  function of measurements, the same discipline opportunity-score.ts uses. */
interface AiSignals {
  faqSchema: boolean
  howToSchema: boolean
  organizationSchema: boolean
  articleSchema: boolean
  breadcrumbSchema: boolean
  sameAsPresent: boolean
  authorPresent: boolean
  datePresent: boolean
  questionHeadings: number
  totalHeadings: number
  listCount: number
  tableCount: number
  paragraphCount: number
  textLength: number
  htmlLength: number
  scriptCount: number
  ogTitlePresent: boolean
  siteName: string | null
  /** null when robots.txt could not be read at all. */
  robots: RobotsVerdict | null
  llmsTxt: boolean
}

interface RobotsVerdict {
  reachable: boolean
  /** Crawlers explicitly disallowed from the whole site. */
  blocked: Array<{ label: string; kind: 'answer' | 'training' }>
  /** True when `User-agent: *` disallows everything. */
  blocksEveryone: boolean
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetch a small text file from the same origin.
 *
 * Same SSRF rules as the page fetch — the origin came from a stranger's input, and being
 * "the same host we already fetched" is not a reason to skip the check, since a redirect
 * could have moved us. Returns null on anything unexpected; a missing robots.txt is a
 * normal, common state and never an error.
 */
async function fetchSideFile(origin: string, path: string): Promise<string | null> {
  let target: string
  try {
    target = new URL(path, origin).toString()
    await validateUrl(target)
  } catch {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SIDE_FILE_TIMEOUT_MS)
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/plain,*/*' },
    })
    if (!res.ok) return null

    // Some hosts answer every path with the HTML app shell. A robots.txt that is actually
    // a web page would otherwise parse as "no rules", which reads as "everything allowed".
    const type = res.headers.get('content-type') ?? ''
    if (/text\/html/i.test(type)) return null

    const body = await res.text()
    return body.length > SIDE_FILE_MAX_BYTES ? body.slice(0, SIDE_FILE_MAX_BYTES) : body
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ─── robots.txt ───────────────────────────────────────────────────────────────

/**
 * Which of the AI crawlers a robots.txt shuts out of the whole site.
 *
 * Deliberately narrow: it answers "is this agent disallowed from `/`", not "can this agent
 * reach page X". Path-level matching is a real robots.txt parser's job and this audit
 * looks at one page. A site that blocks only /admin correctly reports as not blocking.
 */
function parseRobots(txt: string): RobotsVerdict {
  const lines = txt.split(/\r?\n/).map(l => l.replace(/#.*$/, '').trim()).filter(Boolean)

  // A group is one or more consecutive User-agent lines followed by its rules.
  const groups: Array<{ agents: string[]; disallowAll: boolean }> = []
  let current: { agents: string[]; disallowAll: boolean } | null = null
  let readingAgents = false

  for (const line of lines) {
    const [rawField, ...rest] = line.split(':')
    const field = rawField.trim().toLowerCase()
    const value = rest.join(':').trim()

    if (field === 'user-agent') {
      if (!current || !readingAgents) {
        current = { agents: [], disallowAll: false }
        groups.push(current)
        readingAgents = true
      }
      current.agents.push(value.toLowerCase())
      continue
    }

    if (!current) continue
    readingAgents = false

    // "Disallow: /" bars the whole site. "Disallow:" with no value is the explicit
    // opposite — it allows everything — so the empty case must not match.
    if (field === 'disallow' && value === '/') current.disallowAll = true
    // An explicit "Allow: /" after a blanket disallow re-opens the site for that agent.
    if (field === 'allow' && value === '/') current.disallowAll = false
  }

  const blocked: RobotsVerdict['blocked'] = []
  for (const crawler of AI_CRAWLERS) {
    const named = groups.find(g => g.agents.includes(crawler.token))
    const wildcard = groups.find(g => g.agents.includes('*'))
    // A named group wins outright over the wildcard, which is how robots.txt precedence
    // works: the most specific matching group applies and the others are ignored.
    const applicable = named ?? wildcard
    if (applicable?.disallowAll) blocked.push({ label: crawler.label, kind: crawler.kind })
  }

  const wildcardGroup = groups.find(g => g.agents.includes('*'))
  return { reachable: true, blocked, blocksEveryone: !!wildcardGroup?.disallowAll }
}

// ─── HTML parsing ─────────────────────────────────────────────────────────────

/** Strip scripts, styles and tags to get at the text a crawler without a JS engine sees. */
function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectJsonLd(html: string): unknown[] {
  const out: unknown[] = []
  const blocks = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? []
  for (const block of blocks.slice(0, 20)) {
    const body = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '')
    try {
      out.push(JSON.parse(body))
    } catch {
      // Malformed JSON-LD is common and is not worth failing the audit over. It is
      // reported through schemaPresent being false rather than as a parse error.
    }
  }
  return out
}

/** Walk a JSON-LD graph collecting @type values and noting a few keys we care about. */
function walkJsonLd(node: unknown, seen: { types: Set<string>; keys: Set<string> }, depth = 0): void {
  if (depth > 8 || node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 60)) walkJsonLd(item, seen, depth + 1)
    return
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    if (lowerKey === '@type') {
      const types = Array.isArray(value) ? value : [value]
      for (const t of types) if (typeof t === 'string') seen.types.add(t.toLowerCase())
    } else {
      seen.keys.add(lowerKey)
    }
    walkJsonLd(value, seen, depth + 1)
  }
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`,
      'i'
    )
    const tag = html.match(pattern)?.[0]
    if (!tag) continue
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1]
    if (content?.trim()) return content.trim()
  }
  return null
}

function parseAiSignals(html: string, robots: RobotsVerdict | null, llmsTxt: boolean): AiSignals {
  const seen = { types: new Set<string>(), keys: new Set<string>() }
  for (const block of collectJsonLd(html)) walkJsonLd(block, seen)

  const headings = html.match(/<h[23][^>]*>([\s\S]{0,300}?)<\/h[23]>/gi) ?? []
  const headingTexts = headings.map(h => visibleText(h)).filter(Boolean)
  const questionHeadings = headingTexts.filter(
    t => t.trim().endsWith('?') || QUESTION_STARTERS.test(t.trim())
  ).length

  const text = visibleText(html)

  return {
    faqSchema: seen.types.has('faqpage') || seen.types.has('qapage'),
    howToSchema: seen.types.has('howto'),
    organizationSchema:
      seen.types.has('organization') || seen.types.has('localbusiness') ||
      seen.types.has('person') || seen.types.has('website'),
    articleSchema:
      seen.types.has('article') || seen.types.has('blogposting') ||
      seen.types.has('newsarticle') || seen.types.has('product'),
    breadcrumbSchema: seen.types.has('breadcrumblist'),
    sameAsPresent: seen.keys.has('sameas'),
    authorPresent:
      seen.keys.has('author') ||
      !!metaContent(html, ['author', 'article:author']) ||
      /rel=["']author["']/i.test(html),
    datePresent:
      seen.keys.has('datepublished') || seen.keys.has('datemodified') ||
      !!metaContent(html, ['article:published_time', 'article:modified_time']) ||
      /<time[^>]+datetime=/i.test(html),
    questionHeadings,
    totalHeadings: headingTexts.length,
    listCount: (html.match(/<(ul|ol)\b/gi) ?? []).length,
    tableCount: (html.match(/<table\b/gi) ?? []).length,
    paragraphCount: (html.match(/<p\b/gi) ?? []).length,
    textLength: text.length,
    htmlLength: html.length,
    scriptCount: (html.match(/<script\b/gi) ?? []).length,
    ogTitlePresent: !!metaContent(html, ['og:title']),
    siteName: metaContent(html, ['og:site_name'])?.slice(0, MAX_ECHOED_CHARS) ?? null,
    robots,
    llmsTxt,
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Sub-scores are each 0-100 over their own checks, then combined by weight.
 *
 * Weights sum to 100 and are asserted at module load, the same guard opportunity-score.ts
 * uses — a silent 95 would rescale every score without anything failing.
 *
 * A category that could not be measured scores null and is dropped from BOTH sides of the
 * average, so an unreachable robots.txt cannot quietly cost a site ten points.
 */
const WEIGHTS = {
  technical: 15,
  onpage: 20,
  structure: 20,
  schema: 15,
  aeo: 18,
  geo: 12,
} as const

const WEIGHT_TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
if (WEIGHT_TOTAL !== 100) {
  throw new Error(`AI readiness weights must sum to 100, got ${WEIGHT_TOTAL}`)
}

/** Fraction of a list of booleans that are true, as 0-100. */
function pct(checks: boolean[]): number {
  if (!checks.length) return 0
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function levelFor(score: number | null): ReadinessLevel {
  if (score === null) return 'unknown'
  if (score >= 75) return 'strong'
  if (score >= 45) return 'moderate'
  return 'weak'
}

export function scoreReadiness(seo: SEOSignals, ai: AiSignals): {
  score: number
  categories: ReadinessCategory[]
} {
  // ── Technical foundation
  const technical = pct([seo.https, seo.viewportPresent, seo.canonicalPresent])

  // ── On-page basics
  const onpage = pct([
    seo.titlePresent,
    seo.titlePresent && !seo.titleGeneric,
    seo.titleLength >= 20 && seo.titleLength <= 65,
    seo.metaDescriptionPresent,
    seo.metaDescriptionLength >= 70 && seo.metaDescriptionLength <= 165,
    ai.ogTitlePresent,
  ])

  // ── Content structure. This is the category AI answer engines lean on hardest: an
  //    extractable page with real headings and real text is one they can quote.
  const altCoverage = seo.imageCount === 0 ? 1 : seo.imagesWithAlt / seo.imageCount
  const structure = pct([
    seo.h1Count === 1,
    seo.headingHierarchySane,
    ai.totalHeadings >= 2,
    seo.wordCount >= 300,
    ai.paragraphCount >= 3,
    altCoverage >= 0.8,
    seo.internalLinkCount >= 5,
    // Word count in the *initial* HTML, which is what a crawler without a JS engine gets.
    // Measured 2026-08-28 against stripe.com, vercel.com and nytimes.com: all three are
    // server-rendered and all three sit at 1-2% text-to-HTML, because modern frameworks
    // inline a large hydration payload. So the ratio measures framework choice, not
    // readability, and scoring on it marked three healthy sites as broken. The amount of
    // text present is the thing that actually answers the question.
    seo.wordCount >= 150,
  ])

  // ── Structured data
  const schema = pct([
    seo.schemaPresent,
    ai.organizationSchema,
    ai.articleSchema || ai.faqSchema || ai.howToSchema,
    ai.breadcrumbSchema,
  ])

  // ── AEO: can an answer engine lift a direct answer off this page?
  const aeo = pct([
    ai.faqSchema,
    ai.questionHeadings >= 1,
    ai.questionHeadings >= 3,
    ai.listCount >= 2 || ai.tableCount >= 1,
    ai.howToSchema || ai.articleSchema,
    seo.wordCount >= 600,
  ])

  // ── GEO: can generative engines reach, attribute and trust the page?
  //    Only `answer` crawlers count against the score. Blocking a training crawler is an
  //    editorial choice, reported in the detail line but never scored as a fault.
  const answerBlocked = ai.robots?.blocked.some(b => b.kind === 'answer') ?? false
  const geoChecks = [
    !answerBlocked,
    ai.authorPresent,
    ai.datePresent,
    ai.sameAsPresent,
    ai.organizationSchema,
  ]
  // robots.txt unreachable is not the same as robots.txt permissive, so that one check
  // drops out rather than being assumed either way.
  const geoRaw = ai.robots === null ? pct(geoChecks.slice(1)) : pct(geoChecks)
  // Being disallowed from live answer crawlers is not one missing signal among five — it
  // is the category failing outright, because everything else in it only matters once an
  // engine can fetch the page. A site with perfect attribution that no answer engine may
  // read is not GEO-ready, so the cap says so rather than averaging it away.
  const geo = answerBlocked ? Math.min(geoRaw, 35) : geoRaw

  const trainingBlocked = ai.robots?.blocked.filter(b => b.kind === 'training') ?? []
  const answerBlockedList = ai.robots?.blocked.filter(b => b.kind === 'answer') ?? []

  const categories: ReadinessCategory[] = [
    {
      id: 'technical',
      label: 'Technical foundation',
      blurb: 'HTTPS, mobile viewport and a canonical URL — the basics every crawler checks first.',
      score: technical,
      weight: WEIGHTS.technical,
      level: levelFor(technical),
      detail: [
        seo.https ? 'HTTPS' : 'no HTTPS',
        seo.viewportPresent ? 'mobile viewport set' : 'no mobile viewport',
        seo.canonicalPresent ? 'canonical tag present' : 'no canonical tag',
      ].join(', '),
    },
    {
      id: 'onpage',
      label: 'On-page signals',
      blurb: 'The title and description that decide how you appear in a result or a citation.',
      score: onpage,
      weight: WEIGHTS.onpage,
      level: levelFor(onpage),
      detail: seo.titlePresent
        ? `Title ${seo.titleLength} characters${seo.titleGeneric ? ' (generic)' : ''}, ` +
          (seo.metaDescriptionPresent
            ? `meta description ${seo.metaDescriptionLength} characters`
            : 'no meta description')
        : 'No page title found',
    },
    {
      id: 'structure',
      label: 'Content & extractability',
      blurb: 'Whether an AI crawler that does not run JavaScript can actually read your content.',
      score: structure,
      weight: WEIGHTS.structure,
      level: levelFor(structure),
      detail:
        `${seo.wordCount.toLocaleString()} words readable without JavaScript, ` +
        `${seo.h1Count} H1, ${ai.totalHeadings} sub-headings`,
    },
    {
      id: 'schema',
      label: 'Structured data',
      blurb: 'Schema markup is how you tell an engine what you are, rather than hoping it guesses.',
      score: schema,
      weight: WEIGHTS.schema,
      level: levelFor(schema),
      detail: seo.schemaPresent
        ? `Found: ${seo.schemaTypes.slice(0, 6).join(', ') || 'unnamed types'}`
        : 'No schema markup found',
    },
    {
      id: 'aeo',
      label: 'AEO readiness',
      blurb: 'Answer engines quote pages that answer a question directly. This is whether yours does.',
      score: aeo,
      weight: WEIGHTS.aeo,
      level: levelFor(aeo),
      detail:
        `${ai.questionHeadings} question-style heading${ai.questionHeadings === 1 ? '' : 's'}, ` +
        `${ai.faqSchema ? 'FAQ schema present' : 'no FAQ schema'}, ` +
        `${ai.listCount} list${ai.listCount === 1 ? '' : 's'}`,
    },
    {
      id: 'geo',
      label: 'GEO readiness',
      blurb: 'Whether generative engines can reach your pages, and know who is behind them.',
      score: geo,
      weight: WEIGHTS.geo,
      level: levelFor(geo),
      detail:
        ai.robots === null
          ? 'robots.txt could not be read — crawler access not assessed. ' +
            `${ai.authorPresent ? 'Author present' : 'No author attribution'}, ` +
            `${ai.datePresent ? 'dates present' : 'no dates'}`
          : answerBlockedList.length
            ? `Blocked from live answers: ${answerBlockedList.map(b => b.label).join(', ')}`
            : `Live answer crawlers allowed` +
              (trainingBlocked.length
                ? `; training crawlers blocked by choice: ${trainingBlocked.map(b => b.label).join(', ')}`
                : '') +
              `. ${ai.authorPresent ? 'Author present' : 'No author attribution'}`,
    },
  ]

  const measured = categories.filter(c => c.score !== null)
  const weightSum = measured.reduce((a, c) => a + c.weight, 0)
  const score = weightSum === 0
    ? 0
    : Math.round(measured.reduce((a, c) => a + (c.score as number) * c.weight, 0) / weightSum)

  return { score, categories }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * The fixes, ordered worst-first.
 *
 * Reuses the SEO findings the Client Finder engine already produces rather than restating
 * them — one description of "no meta description" in the codebase, not two — and adds the
 * AI-search-specific ones that engine has no reason to look for.
 */
function buildActions(seoFindings: SEOFinding[], ai: AiSignals, seo: SEOSignals): ReadinessAction[] {
  const actions: ReadinessAction[] = seoFindings.map(f => ({
    category: f.category,
    severity: f.severity,
    title: f.title,
    detail: f.description,
    fix: f.recommendation,
  }))

  const add = (
    category: string, severity: ReadinessAction['severity'],
    title: string, detail: string, fix: string
  ) => actions.push({ category, severity, title, detail, fix })

  const answerBlocked = ai.robots?.blocked.filter(b => b.kind === 'answer') ?? []
  if (answerBlocked.length) {
    add('GEO', 'critical', 'Blocked from live AI answers',
      `Your robots.txt disallows ${answerBlocked.map(b => b.label).join(', ')} from the whole site. These fetch pages live to answer questions, so your content cannot appear in those answers.`,
      'If that block was not deliberate, remove those User-agent rules from robots.txt. Blocking training crawlers is a separate decision and does not affect live answers.')
  }

  if (ai.robots?.blocksEveryone) {
    add('Technical', 'critical', 'robots.txt blocks all crawlers',
      'Your robots.txt has "User-agent: * / Disallow: /", which asks every well-behaved crawler to stay out of the entire site.',
      'This is usually a staging configuration that shipped by accident. Remove the blanket disallow unless the site is genuinely meant to be unlisted.')
  }

  if (!ai.faqSchema) {
    add('AEO', 'high', 'No FAQ schema',
      'The page has no FAQPage or QAPage markup. Answer engines use it to lift a question and its answer as a unit.',
      'Add FAQPage JSON-LD covering the questions customers actually ask you. Mark up questions already answered on the page rather than inventing new ones.')
  }

  if (ai.questionHeadings === 0 && ai.totalHeadings > 0) {
    add('AEO', 'medium', 'No question-style headings',
      `None of the ${ai.totalHeadings} sub-headings are phrased as a question. AI answers are assembled from content that matches how people ask.`,
      'Rewrite two or three headings into the question a reader would type, and answer each one in the first sentence beneath it.')
  }

  // Deliberately keyed on how much text is actually in the initial HTML, not on the
  // text-to-HTML ratio. A low ratio is normal for any server-rendered site that inlines a
  // hydration payload — it fired on stripe.com, vercel.com and nytimes.com, all of which
  // render their content server-side. Too little text next to a lot of script is the
  // signal that means what it says.
  if (seo.wordCount < 150 && ai.scriptCount > 5) {
    add('GEO', 'critical', 'Content may not be visible without JavaScript',
      `Only ${seo.wordCount} words are present in the HTML across ${ai.scriptCount} scripts, which usually means the page renders client-side. Most AI crawlers do not run JavaScript, so they would see close to an empty page.`,
      'Server-render or pre-render the main content so it is present in the initial HTML response.')
  }

  if (!ai.authorPresent) {
    add('GEO', 'medium', 'No author attribution',
      'No author is declared in the markup. Generative engines weigh who is behind a claim when deciding what to cite.',
      'Add an author to your schema markup and a visible byline on content pages.')
  }

  if (!ai.datePresent) {
    add('GEO', 'low', 'No published or modified date',
      'No date is exposed in the markup. Freshness is one of the few signals an engine can check cheaply.',
      'Expose datePublished and dateModified in your schema, and show a last-updated date on the page.')
  }

  if (!ai.sameAsPresent && ai.organizationSchema) {
    add('GEO', 'low', 'No sameAs entity links',
      'Your Organization markup does not link out to profiles that identify you elsewhere.',
      'Add a sameAs array pointing at your LinkedIn, Crunchbase, Wikipedia or other canonical profiles, so engines can resolve you to a known entity.')
  }

  if (!ai.llmsTxt) {
    add('GEO', 'low', 'No llms.txt',
      'No /llms.txt was found. It is an emerging convention, not a ranking factor, for telling AI agents which pages matter and how to use them.',
      'Optional, and cheap: publish an llms.txt listing your key pages. Treat it as an early bet rather than a requirement.')
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const
  return actions.sort((a, b) => order[a.severity] - order[b.severity])
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export class ReadinessFetchError extends Error {}

/**
 * Run the whole audit for one URL.
 *
 * Throws ReadinessFetchError when the page cannot be read — the caller turns that into a
 * 422 with the message shown to the visitor. Everything else is measured or reported as
 * unmeasured; there is no path here that guesses.
 */
export async function auditReadiness(rawUrl: string): Promise<ReadinessReport> {
  const page = await fetchHomepage(rawUrl)
  if (!page) {
    throw new ReadinessFetchError(
      'We could not load that page. Check the address is public and reachable, then try again.'
    )
  }

  const { findings, signals } = analyzeHomepage(page.html, page.finalUrl)

  const origin = new URL(page.finalUrl).origin
  // Both side files in parallel: they are independent and each has its own timeout.
  const [robotsTxt, llmsTxt] = await Promise.all([
    fetchSideFile(origin, '/robots.txt'),
    fetchSideFile(origin, '/llms.txt'),
  ])

  const ai = parseAiSignals(page.html, robotsTxt === null ? null : parseRobots(robotsTxt), llmsTxt !== null)
  const { score, categories } = scoreReadiness(signals, ai)

  const limits = [
    'This audit reads one page — the URL you gave us — not your whole site.',
    'Every check is measured on that page. Nothing here is estimated.',
  ]
  if (robotsTxt === null) {
    limits.push('Your robots.txt could not be read, so AI crawler access was not assessed.')
  }

  return {
    url: rawUrl,
    finalUrl: page.finalUrl,
    score,
    level: levelFor(score),
    categories,
    actions: buildActions(findings, ai, signals),
    limits,
    measuredAt: new Date().toISOString(),
  }
}
