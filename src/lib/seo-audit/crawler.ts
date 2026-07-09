// Mini-crawler — samples a bounded set of URLs FROM THE SITEMAP (not the whole site)
// to verify they actually resolve. Deliberately narrow in scope: cross-page checks
// like "orphan pages" or "duplicate content" need either a full-site crawl or a
// sample large enough to trust, and a partial sample would risk false positives —
// exactly the kind of inaccuracy this whole audit-quality effort exists to remove.
// Sitemap URL health (does it 404? does it redirect?) has no such risk: if a URL
// listed in the sitemap is broken, that's true regardless of how small the sample is.
//
// Every sampled URL goes through the same SSRF guard as the rest of the audit before
// being fetched — a malicious/compromised site's sitemap is untrusted input.

import type { AutoCheckResult } from './auto-checks'
import { validateUrl } from '@/lib/ssrf-guard'

const UA = 'Mozilla/5.0 (compatible; Optmizly-Audit/1.0; +https://Optmizly.com)'

export const CRAWL_CHECK_IDS = ['sitemap.0.3', 'sitemap.0.4'] as const

function isSitemapIndex(sitemapXml: string): boolean {
  return /<sitemapindex[\s>]/i.test(sitemapXml)
}

function extractLocs(sitemapXml: string): string[] {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map(m => m[1].trim())
    .filter(u => /^https?:\/\//i.test(u))
}

function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const step = arr.length / n
  const out: T[] = []
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)])
  return out
}

async function fetchStatus(url: string, timeoutMs: number): Promise<number | null> {
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

const pass = (detail: string): AutoCheckResult => ({ status: 'pass', detail })
const warn = (detail: string): AutoCheckResult => ({ status: 'warn', detail })
const fail = (detail: string): AutoCheckResult => ({ status: 'fail', detail })

export interface CrawlOptions {
  sampleSize?: number
  perRequestTimeoutMs?: number
  overallTimeoutMs?: number
  concurrency?: number
}

/**
 * Samples up to `sampleSize` sitemap URLs (evenly across the list, excluding the page
 * already being audited) and checks their HTTP status. Bounded by `overallTimeoutMs`
 * — if the budget runs out mid-crawl, returns results from whatever completed rather
 * than blocking; if nothing could be checked at all, returns {} (stays manual) rather
 * than claim a false "no issues found".
 */
export async function crawlSitemapSample(
  sitemapXml: string | null,
  excludeUrl: string,
  opts: CrawlOptions = {}
): Promise<Record<string, AutoCheckResult>> {
  const { sampleSize = 20, perRequestTimeoutMs = 5000, overallTimeoutMs = 20000, concurrency = 5 } = opts
  const r: Record<string, AutoCheckResult> = {}
  if (!sitemapXml || isSitemapIndex(sitemapXml)) return r

  const locs = extractLocs(sitemapXml).filter(u => u !== excludeUrl)
  if (locs.length === 0) return r

  const sample = sampleEvenly(locs, sampleSize)
  const deadline = Date.now() + overallTimeoutMs
  const checked: Array<{ url: string; status: number }> = []

  for (let i = 0; i < sample.length; i += concurrency) {
    if (Date.now() > deadline) break
    const batch = sample.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(async url => {
      try {
        await validateUrl(url)
      } catch {
        return null // disallowed target (private/internal) — silently skip, don't fetch
      }
      const status = await fetchStatus(url, perRequestTimeoutMs)
      return status != null ? { url, status } : null
    }))
    for (const br of batchResults) {
      if (br.status === 'fulfilled' && br.value) checked.push(br.value)
    }
  }

  if (checked.length === 0) return r // couldn't verify anything — leave manual, no false claim

  const redirects = checked.filter(c => c.status >= 300 && c.status < 400)
  const broken = checked.filter(c => c.status === 404 || c.status >= 500)

  r['sitemap.0.3'] = redirects.length > 0
    ? warn(`${redirects.length} of ${checked.length} sampled sitemap URLs return a redirect — sitemaps should list final canonical URLs`)
    : pass(`No redirects found in a sample of ${checked.length} sitemap URLs`)

  r['sitemap.0.4'] = broken.length > 0
    ? fail(`${broken.length} of ${checked.length} sampled sitemap URLs are broken (404/5xx) — remove them from the sitemap`)
    : pass(`No broken URLs found in a sample of ${checked.length} sitemap URLs`)

  return r
}
