// CompetitorAnalysis.dataQuality moved from a single string ('high' | 'partial-real' |
// 'estimated') to a per-field JSON object so each metric can carry its own real/
// estimated flag as more fields get real data sources over time. Old rows still hold
// the legacy string values — this falls back to "only authority might be real" for
// those instead of throwing on JSON.parse.
export type DataQuality = {
  authority?: boolean
  traffic?: boolean
  /** Aggregate total from /backlinks/summary — distinct from `backlinksDetail`
   *  (the individual referring-domains list), which is a separate endpoint. */
  backlinks?: boolean
  backlinksDetail?: boolean
  keywords?: boolean
  pages?: boolean
  gaps?: boolean
}

export function parseDataQuality(raw: string): DataQuality {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}
  return { authority: raw === 'partial-real' }
}
