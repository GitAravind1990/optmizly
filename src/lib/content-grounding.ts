// Shared real-data grounding for the content-based ideation tools (Content Gap,
// Citation, Queries) — these previously asked Claude to compare pasted content
// against "top-ranking competitors" purely from its own training knowledge, with
// zero real data. This orchestrates the same proven DataForSEO calls Ranking Engine
// already uses (real SERP, real related keywords, real search intent) plus an
// optional real competitor-page crawl, so callers can feed genuine signals into the
// prompt instead of pure imagination — same "best-effort, never block the tool"
// contract as every other real-data integration in this codebase.

import { getTopSerpResults, getRelatedKeywords, getSearchIntent, type SerpResult, type RelatedKeyword } from './dataforseo'
import { crawlCompetitorPages, type CompetitorPageStats } from './competitor-crawl'

export interface KeywordGrounding {
  keyword: string
  serp: { items: SerpResult[]; features: string[] } | null
  related: RelatedKeyword[] | null
  intent: string | null
  /** Present only when opts.crawl was true. Keyed by competitor URL, same
   *  "missing = couldn't get it" contract as crawlCompetitorPages itself. */
  competitorPages: Map<string, CompetitorPageStats> | null
}

export interface FetchGroundingOptions {
  targetLocation?: string
  serpLimit?: number
  relatedLimit?: number
  crawl?: boolean
  crawlTextExcerpt?: boolean
  crawlTextExcerptChars?: number
}

/** Best-effort real grounding for a keyword — SERP, related keywords, and search
 *  intent always attempted in parallel; competitor page crawl only when opts.crawl
 *  is true (the expensive/slow step). Never throws — any individual DataForSEO call
 *  failing just leaves that field null (same contract every dataforseo.ts function
 *  already follows); this function additionally guarantees it itself never rejects,
 *  so callers can treat "no keyword" and "keyword given but everything failed" the
 *  same way. */
export async function fetchKeywordGrounding(
  keyword: string,
  opts: FetchGroundingOptions = {}
): Promise<KeywordGrounding> {
  const {
    targetLocation = 'US',
    serpLimit = 5,
    relatedLimit = 8,
    crawl = false,
    crawlTextExcerpt = false,
    crawlTextExcerptChars = 1500,
  } = opts

  try {
    const [serpResult, related, intentMap] = await Promise.all([
      getTopSerpResults(keyword, targetLocation, 'desktop', serpLimit),
      getRelatedKeywords(keyword, targetLocation, relatedLimit),
      getSearchIntent([keyword], targetLocation),
    ])
    const serp = serpResult && serpResult.items.length > 0 ? serpResult : null

    const competitorPages = crawl && serp
      ? await crawlCompetitorPages(serp.items.map(i => i.url), {
          includeTextExcerpt: crawlTextExcerpt,
          textExcerptChars: crawlTextExcerptChars,
        })
      : null

    return {
      keyword,
      serp,
      related: related && related.length > 0 ? related : null,
      intent: intentMap.get(keyword) ?? null,
      competitorPages,
    }
  } catch {
    return { keyword, serp: null, related: null, intent: null, competitorPages: null }
  }
}
