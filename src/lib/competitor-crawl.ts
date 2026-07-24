// Lightweight, bounded crawl of real competitor ranking pages — shared by Ranking
// Engine and the content-grounding helper (Content Gap / Citation). Same philosophy
// as seo-audit/crawler.ts's crawlSitemapSample (concurrent, deadline-bound, silently
// skips what doesn't complete rather than blocking or failing the whole request),
// but fetches page content instead of just checking HTTP status. Every URL is
// untrusted external input (arbitrary competitor domains from a live SERP), so it
// goes through the same SSRF guard as the audit crawler before fetching.

import { plainText, jsonLdTypes } from './seo-audit/auto-checks'
import { validateUrl } from './ssrf-guard'

const UA = 'Mozilla/5.0 (compatible; Optmizly-Bot/1.0; +https://optmizly.com)'

export interface CompetitorPageStats {
  words: number
  schemaTypes: string[]
  /** ISO date string if a real datePublished/dateModified/article:*_time was found,
   *  else null — never guessed. */
  lastUpdated: string | null
  /** First N chars of plain-text body — only populated when a caller opts in via
   *  includeTextExcerpt (Content Gap/Citation feed this into a Claude prompt).
   *  Ranking Engine's existing callers don't need it and shouldn't pay to retain
   *  full page text for nothing. */
  textExcerpt?: string
}

function extractFreshness(html: string): string | null {
  // JSON-LD dateModified/datePublished (whichever is more recent if both present).
  const ldBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  let latest: string | null = null
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block[1])
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of nodes) {
        for (const key of ['dateModified', 'datePublished']) {
          const v = node?.[key]
          if (typeof v === 'string' && !isNaN(Date.parse(v))) {
            if (!latest || Date.parse(v) > Date.parse(latest)) latest = v
          }
        }
      }
    } catch { /* malformed JSON-LD on a competitor's page — not our problem to fix, just skip */ }
  }
  if (latest) return latest

  // Fall back to Open Graph article meta tags.
  const metaMatch = html.match(/<meta\b[^>]*property=["']article:modified_time["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta\b[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)
  if (metaMatch && !isNaN(Date.parse(metaMatch[1]))) return metaMatch[1]

  return null
}

async function fetchOne(
  url: string,
  timeoutMs: number,
  includeTextExcerpt: boolean,
  textExcerptChars: number
): Promise<CompetitorPageStats | null> {
  try {
    await validateUrl(url)
  } catch {
    return null // disallowed target (private/internal) — skip, don't fetch
  }
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const html = await res.text()
    const text = plainText(html)
    const { types } = jsonLdTypes(html)
    return {
      words: text ? text.split(/\s+/).filter(Boolean).length : 0,
      schemaTypes: [...new Set(types)],
      lastUpdated: extractFreshness(html),
      ...(includeTextExcerpt && text ? { textExcerpt: text.slice(0, textExcerptChars) } : {}),
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export interface CrawlCompetitorsOptions {
  perRequestTimeoutMs?: number
  overallTimeoutMs?: number
  concurrency?: number
  /** Off by default — set true to also capture textExcerpt (Content Gap/Citation). */
  includeTextExcerpt?: boolean
  /** Cap in characters when includeTextExcerpt is true. Default 1500. */
  textExcerptChars?: number
}

/** Best-effort real word count / schema types / freshness for a bounded set of
 *  competitor URLs. A domain that fails, times out, or exceeds the overall budget
 *  is simply absent from the returned Map — callers treat that the same as any
 *  other "couldn't get real data for this one" case (fall back to the AI estimate),
 *  never a hard failure for the whole request. */
export async function crawlCompetitorPages(
  urls: string[],
  opts: CrawlCompetitorsOptions = {}
): Promise<Map<string, CompetitorPageStats>> {
  const { perRequestTimeoutMs = 6000, overallTimeoutMs = 15000, concurrency = 5, includeTextExcerpt = false, textExcerptChars = 1500 } = opts
  const result = new Map<string, CompetitorPageStats>()
  const deadline = Date.now() + overallTimeoutMs

  for (let i = 0; i < urls.length; i += concurrency) {
    if (Date.now() > deadline) break
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(url => fetchOne(url, perRequestTimeoutMs, includeTextExcerpt, textExcerptChars)))
    batch.forEach((url, j) => {
      const r = batchResults[j]
      if (r.status === 'fulfilled' && r.value) result.set(url, r.value)
    })
  }
  return result
}
