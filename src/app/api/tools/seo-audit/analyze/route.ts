import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { validateUrl } from '@/lib/ssrf-guard'
import { runAutoChecks, type AutoCheckContext, type RedirectHop } from '@/lib/seo-audit/auto-checks'
import { AI_CATEGORY_KEYS, TOTAL_CHECKS, computeAuditScores } from '@/lib/seo-audit/framework'
import { aiCheckPromptLines, mergeAICheckVerdicts } from '@/lib/seo-audit/ai-checks'
import { fetchOPRScore } from '@/lib/openpagerank'
import { prisma } from '@/lib/prisma'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const UA = 'Mozilla/5.0 (compatible; Optmizly-Audit/1.0; +https://Optmizly.com)'

interface FetchedPage {
  finalUrl: string
  html: string
  status: number
  headers: Record<string, string>
  redirects: RedirectHop[]
}

async function fetchWithRedirects(url: string, timeoutMs = 12000): Promise<FetchedPage> {
  const redirects: RedirectHop[] = []
  let current = url
  let res: Response | null = null

  for (let i = 0; i < 6; i++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      res = await fetch(current, { redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': UA } })
    } finally {
      clearTimeout(t)
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      redirects.push({ status: res.status, url: current })
      if (!loc) break
      current = new URL(loc, current).toString()
      await validateUrl(current)  // block redirects to internal/private addresses
      continue
    }
    break
  }
  if (!res) throw new Error('No response from URL')

  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => { headers[k] = v })
  const html = await res.text()
  return { finalUrl: current, html, status: res.status, headers, redirects }
}

async function fetchText(url: string, timeoutMs = 8000): Promise<{ status: number; body: string } | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA } })
    const body = await res.text()
    return { status: res.status, body }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// Uses redirect:'manual' so a 3xx status is visible to the caller, unlike fetchText()
// which follows redirects — needed to tell "redirects to the permalink" (good) apart
// from "serves content directly" (bad) for the ?p=1 default-URL check.
async function fetchStatusOnly(url: string, timeoutMs = 6000): Promise<number | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA }, redirect: 'manual' })
    return res.status
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface AICategoryResult { score: number; issues: string[]; fixes: string[] }

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('seo-audit')
    clerkId = user.clerkId
    const { url, html: pastedHtml } = await req.json()

    let auditUrl = ''
    let page: FetchedPage
    let robotsTxt: string | null = null
    let sitemapXml: string | null = null
    let sitemapStatus: number | null = null
    let oprScore: number | null = null
    let domainRank: number | null = null
    let fetched = true
    let urlKnown = true
    let wpXmlrpcStatus: number | null = null
    let wpReadmeStatus: number | null = null
    let wpDefaultUrlStatus: number | null = null

    if (pastedHtml && typeof pastedHtml === 'string' && pastedHtml.length > 100) {
      // Paste-HTML fallback: no outbound fetch
      fetched = false
      let normalized = url && typeof url === 'string' ? url.trim() : ''
      if (normalized && !/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized
      try { if (normalized) new URL(normalized) } catch { normalized = '' }
      urlKnown = !!normalized
      auditUrl = normalized || 'pasted-html'
      page = { finalUrl: normalized || 'https://example.com/', html: pastedHtml, status: 200, headers: {}, redirects: [] }
    } else {
      if (!url || typeof url !== 'string') {
        return apiError({ message: 'A url or pasted html is required', status: 400, name: 'ValidationError' })
      }
      auditUrl = url.trim()
      if (!/^https?:\/\//i.test(auditUrl)) auditUrl = 'https://' + auditUrl
      try { new URL(auditUrl) } catch { return apiError({ message: 'Invalid URL', status: 400, name: 'ValidationError' }) }
      try { await validateUrl(auditUrl) } catch (e) {
        return apiError({ message: e instanceof Error ? e.message : 'Invalid URL', status: 400, name: 'ValidationError' })
      }

      try {
        page = await fetchWithRedirects(auditUrl)
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : ''
        const cause = fetchErr instanceof Error && fetchErr.cause instanceof Error ? fetchErr.cause.message : ''
        const full = `${msg} ${cause}`
        if (/not allowed/i.test(full)) {
          return apiError({ message: msg, status: 400, name: 'ValidationError' })
        }
        const reason = (fetchErr instanceof Error && fetchErr.name === 'AbortError') || /abort/i.test(full)
          ? 'The site took too long to respond'
          : /certificate|cert_|ssl|tls/i.test(full)
            ? 'The site has an SSL certificate problem'
            : 'Could not reach that URL'
        return apiError({ message: `${reason}. Try the paste-HTML option instead.`, status: 422, name: 'FetchError' })
      }
      if (!page.html || page.html.length < 50) {
        return apiError({ message: 'Could not retrieve HTML from that URL. Try the paste-HTML option.', status: 422, name: 'FetchError' })
      }

      const origin = new URL(page.finalUrl).origin
      const hostname = new URL(page.finalUrl).hostname
      const [robots, sitemap, opr] = await Promise.all([
        fetchText(`${origin}/robots.txt`),
        fetchText(`${origin}/sitemap.xml`),
        fetchOPRScore(hostname).catch(() => null),
      ])
      robotsTxt = robots && robots.status < 400 ? robots.body : (robots ? '' : null)
      if (sitemap) { sitemapStatus = sitemap.status; sitemapXml = sitemap.status < 400 ? sitemap.body : null }
      if (!sitemapXml) {
        // Fall back to the robots.txt Sitemap: directive, then /sitemap_index.xml (Yoast et al.)
        const robotsSitemap = robotsTxt?.match(/^\s*sitemap:\s*(\S+)/im)?.[1] ?? null
        const candidates = [robotsSitemap, `${origin}/sitemap_index.xml`]
          .filter((u): u is string => !!u && u !== `${origin}/sitemap.xml`)
        for (const candidate of candidates) {
          try { await validateUrl(candidate) } catch { continue }
          const alt = await fetchText(candidate)
          if (alt && alt.status < 400 && alt.body) {
            sitemapStatus = alt.status
            sitemapXml = alt.body
            break
          }
        }
        if (sitemapStatus == null) sitemapStatus = 404
      }
      if (opr) {
        oprScore = opr.page_rank_decimal ?? null
        domainRank = opr.rank ? parseInt(opr.rank, 10) : null
      }

      // WordPress-specific technical checks — only fire the extra fetches when the
      // page actually looks like WordPress, so other sites don't pay for 3 wasted calls.
      if (/wp-content\/|wp-includes\//i.test(page.html)) {
        const [xmlrpcStatus, readmeStatus, defaultUrlStatus] = await Promise.all([
          fetchStatusOnly(`${origin}/xmlrpc.php`),
          fetchStatusOnly(`${origin}/readme.html`),
          fetchStatusOnly(`${origin}/?p=1`),
        ])
        wpXmlrpcStatus = xmlrpcStatus
        wpReadmeStatus = readmeStatus
        wpDefaultUrlStatus = defaultUrlStatus
      }
    }

    // ── Automated checks ──
    const ctx: AutoCheckContext = {
      url: auditUrl,
      finalUrl: page.finalUrl,
      html: page.html,
      status: page.status,
      headers: page.headers,
      robotsTxt,
      sitemapXml,
      sitemapStatus,
      redirects: page.redirects,
      oprScore,
      domainRank,
      fetched,
      urlKnown,
      wpXmlrpcStatus,
      wpReadmeStatus,
      wpDefaultUrlStatus,
    }
    const autoResults = runAutoChecks(ctx)

    const pageTitle = page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()?.slice(0, 300) ?? null
    const bodyText = plainText(page.html)
    const wordCount = bodyText ? bodyText.split(/\s+/).length : 0

    // ── AI scoring for judgement categories ──
    let aiResults: Record<string, AICategoryResult> = {}
    try {
      const schemaTypes = [...page.html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m => m[1])
      const raw = await callClaude(
        'You are an expert enterprise SEO auditor. Return ONLY valid JSON — no markdown, no backticks.',
        `Audit this web page for four SEO dimensions (score 0-100, higher = better) AND a specific checklist.

URL: ${page.finalUrl}
Title: ${pageTitle ?? '(none)'}
Word count: ${wordCount}
Detected schema types: ${schemaTypes.length ? [...new Set(schemaTypes)].join(', ') : 'none'}

Page text (first 4000 chars):
<page_content>
${bodyText.slice(0, 4000)}
</page_content>

Score these dimensions:
- "eeat": Experience, Expertise, Authoritativeness, Trust (author bios, credentials, citations, disclaimers, trust signals)
- "aiSeo": AI Search / GEO readiness (entity markup, FAQs, citable stats, structured answers, topical authority)
- "cannibalization": keyword cannibalization risk for this page (intent clarity, focus, title/H1 uniqueness)
- "localSeo": local SEO technical factors (NAP signals, location targeting, LocalBusiness signals) — score "na" as 100 if clearly not a local business page

Also judge these specific checklist items strictly from the page content above — no assumptions or external knowledge. For each, return "pass" if clearly satisfied, "fail" if it's a real, specific gap, or "na" if the item genuinely does not apply to this page's topic or type (e.g. a disclaimer isn't needed on content with no medical/financial/legal claims):
${aiCheckPromptLines()}

Return JSON exactly:
{
  "eeat":            { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "aiSeo":           { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "cannibalization": { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "localSeo":        { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "checks": { "<id>": { "status": "pass|fail|na", "detail": "one specific sentence grounded in the page content" }, ... one entry for every id listed above }
}
Each issues/fixes array: 2-4 concise, specific items grounded in the actual page content.`,
        2600,
        'claude-haiku-4-5-20251001'
      )
      const parsed = extractJSON<Record<string, AICategoryResult> & { checks?: unknown }>(raw)
      for (const key of AI_CATEGORY_KEYS) {
        const v = parsed?.[key]
        if (v && typeof v.score === 'number') {
          aiResults[key] = {
            score: Math.max(0, Math.min(100, Math.round(v.score))),
            issues: Array.isArray(v.issues) ? v.issues.slice(0, 5) : [],
            fixes: Array.isArray(v.fixes) ? v.fixes.slice(0, 5) : [],
          }
        }
      }
      mergeAICheckVerdicts(autoResults, parsed?.checks)
    } catch (e) {
      console.error('SEO audit AI scoring failed:', e)
      aiResults = {}
    }

    // ── Category + overall scoring (shared with the PATCH recompute) ──
    const { categoryScores, overallScore, passedChecks, failedChecks, warnChecks } =
      computeAuditScores({ autoResults, aiResults, checklistState: {} })

    // ── Persist ──
    const audit = await prisma.seoAudit.create({
      data: {
        userId: user.userId,
        url: page.finalUrl,
        pageTitle,
        overallScore,
        totalChecks: TOTAL_CHECKS,
        passedChecks,
        failedChecks,
        warnChecks,
        categoryScores: JSON.stringify(categoryScores),
        autoResults: JSON.stringify(autoResults),
        aiResults: JSON.stringify(aiResults),
        checklistState: JSON.stringify({}),
        backlinkData: JSON.stringify({ oprScore, domainRank }),
      },
    })

    return apiSuccess({
      data: {
        id: audit.id,
        url: audit.url,
        pageTitle: audit.pageTitle,
        overallScore,
        totalChecks: TOTAL_CHECKS,
        passedChecks,
        failedChecks,
        warnChecks,
        categoryScores,
        autoResults,
        aiResults,
        checklistState: {},
        backlinkData: { oprScore, domainRank },
        createdAt: audit.createdAt,
      },
    }, 201)
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/seo-audit/analyze' })
    return apiError(e)
  }
}

