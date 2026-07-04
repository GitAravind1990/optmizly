import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { validateUrl } from '@/lib/ssrf-guard'
import { runAutoChecks, type AutoCheckContext, type RedirectHop, type AutoCheckResult } from '@/lib/seo-audit/auto-checks'
import { AUDIT_FRAMEWORK, AI_CATEGORY_KEYS, TOTAL_CHECKS, type CheckStatus } from '@/lib/seo-audit/framework'
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

function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STATUS_SCORE: Record<CheckStatus, number | null> = { pass: 100, warn: 50, fail: 0, na: null }

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

    if (pastedHtml && typeof pastedHtml === 'string' && pastedHtml.length > 100) {
      // Paste-HTML fallback: no outbound fetch
      auditUrl = (url && typeof url === 'string' ? url : 'pasted-html').trim()
      page = { finalUrl: auditUrl.startsWith('http') ? auditUrl : 'https://example.com/', html: pastedHtml, status: 200, headers: {}, redirects: [] }
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

      page = await fetchWithRedirects(auditUrl)
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
      if (opr) {
        oprScore = opr.page_rank_decimal ?? null
        domainRank = opr.rank ? parseInt(opr.rank, 10) : null
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
        `Audit this web page for four SEO dimensions and score each 0-100 (higher = better).

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

Return JSON exactly:
{
  "eeat":            { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "aiSeo":           { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "cannibalization": { "score": 0-100, "issues": ["..."], "fixes": ["..."] },
  "localSeo":        { "score": 0-100, "issues": ["..."], "fixes": ["..."] }
}
Each issues/fixes array: 2-4 concise, specific items grounded in the actual page content.`,
        1800,
        'claude-haiku-4-5-20251001'
      )
      const parsed = extractJSON<Record<string, AICategoryResult>>(raw)
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
    } catch (e) {
      console.error('SEO audit AI scoring failed:', e)
      aiResults = {}
    }

    // ── Category + overall scoring ──
    const categoryScores: Record<string, number> = {}
    let passedChecks = 0, failedChecks = 0, warnChecks = 0
    // Track globally-counted IDs to avoid double-counting cross-category aliases
    const globalCounted = new Set<string>()

    for (const cat of AUDIT_FRAMEWORK) {
      const checkIds = cat.subCategories.flatMap(s => s.checks.map(c => c.id))
      const scores: number[] = []
      for (const id of checkIds) {
        const res = autoResults[id]
        if (!res) continue
        if (!globalCounted.has(id)) {
          globalCounted.add(id)
          if (res.status === 'pass') passedChecks++
          else if (res.status === 'fail') failedChecks++
          else if (res.status === 'warn') warnChecks++
        }
        const s = STATUS_SCORE[res.status]
        if (s !== null) scores.push(s)
      }
      const autoAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      const aiScore = aiResults[cat.key]?.score ?? null

      let final: number | null = null
      if (autoAvg !== null && aiScore !== null) {
        // AI categories: Claude's holistic score carries more weight than 1-2 auto signals
        const aiWeight = cat.ai ? 0.75 : 0.5
        final = Math.round(autoAvg * (1 - aiWeight) + aiScore * aiWeight)
      } else if (autoAvg !== null) {
        final = Math.round(autoAvg)
      } else if (aiScore !== null) {
        final = aiScore
      }
      if (final !== null) categoryScores[cat.key] = final
    }

    const scored = Object.values(categoryScores)
    const overallScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0

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

