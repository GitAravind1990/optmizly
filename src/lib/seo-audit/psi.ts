// Real Core Web Vitals via the Google PageSpeed Insights (Lighthouse) API — upgrades a
// handful of CWV checks from static HTML heuristics to real, measured lab data when
// available. Same API and env var (GOOGLE_API_KEY) as the Performance Fixer tool.
//
// Design: never let PSI block or break an audit. fetchPSIMetrics() always resolves
// (never throws) and returns null on any failure, timeout, or missing API key.
// applyPSIOverrides() is a pure function — when metrics are missing or a specific
// sub-score isn't present, the existing regex-derived autoResults entry is left as-is.

import type { AutoCheckResult } from './auto-checks'

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export interface PSIMetrics {
  performanceScore: number | null
  lcpSeconds: number | null
  prioritizeLcpScore: number | null
  clsValue: number | null
  unsizedImagesScore: number | null
  ttfbMs: number | null
  modernFormatsScore: number | null
  renderBlockingScore: number | null
  cacheScore: number | null
  domSize: number | null
}

/** Checks whose regex/heuristic result is upgraded to real PSI data when available;
 *  they always have a producer either way, so they're never left fully unevaluated. */
export const PSI_UPGRADE_CHECK_IDS = [
  'cwv.0.0', 'cwv.2.0', 'cwv.3.0', 'cwv.3.2', 'cwv.3.4', 'cwvRootCause.2.2',
] as const

/** Checks with NO regex fallback — only populated when PSI succeeds; otherwise they
 *  correctly fall back to the manual checklist, same as the WordPress-only checks. */
export const PSI_ONLY_CHECK_IDS = ['cwv.3.6'] as const

function numericValue(audits: Record<string, { score?: number | null; numericValue?: number | null } | undefined>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = audits[k]?.numericValue
    if (typeof v === 'number') return v
  }
  return null
}

function auditScore(audits: Record<string, { score?: number | null; numericValue?: number | null } | undefined>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = audits[k]?.score
    if (typeof v === 'number') return v
  }
  return null
}

export async function fetchPSIMetrics(url: string, timeoutMs = 45000): Promise<PSIMetrics | null> {
  const apiKey = process.env.GOOGLE_API_KEY
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const psiUrl = new URL(PSI_ENDPOINT)
    psiUrl.searchParams.set('url', url)
    psiUrl.searchParams.set('category', 'performance')
    if (apiKey) psiUrl.searchParams.set('key', apiKey)

    const res = await fetch(psiUrl.toString(), { signal: controller.signal })
    const data = await res.json()
    const audits = data?.lighthouseResult?.audits
    if (!audits) return null

    return {
      performanceScore: typeof data.lighthouseResult?.categories?.performance?.score === 'number'
        ? Math.round(data.lighthouseResult.categories.performance.score * 100)
        : null,
      lcpSeconds: (() => { const v = numericValue(audits, 'largest-contentful-paint'); return v != null ? v / 1000 : null })(),
      prioritizeLcpScore: auditScore(audits, 'prioritize-lcp-image'),
      clsValue: numericValue(audits, 'cumulative-layout-shift'),
      unsizedImagesScore: auditScore(audits, 'unsized-images'),
      ttfbMs: numericValue(audits, 'server-response-time'),
      modernFormatsScore: auditScore(audits, 'modern-image-formats'),
      renderBlockingScore: auditScore(audits, 'render-blocking-resources', 'render-blocking-insight'),
      cacheScore: auditScore(audits, 'uses-long-cache-ttl', 'uses-long-cache-ttl-insight'),
      domSize: numericValue(audits, 'dom-size', 'dom-size-insight'),
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

const pass = (detail: string): AutoCheckResult => ({ status: 'pass', detail })
const warn = (detail: string): AutoCheckResult => ({ status: 'warn', detail })

/** Overwrites specific autoResults entries with real PSI-derived verdicts wherever a
 *  sub-score is present. Anything missing (null metrics, or a specific score absent
 *  from this particular Lighthouse run) leaves the existing entry untouched. */
export function applyPSIOverrides(autoResults: Record<string, AutoCheckResult>, metrics: PSIMetrics | null): void {
  if (!metrics) return

  if (metrics.prioritizeLcpScore != null) {
    const lcpNote = metrics.lcpSeconds != null ? ` Real LCP: ${metrics.lcpSeconds.toFixed(1)}s.` : ''
    autoResults['cwv.0.0'] = metrics.prioritizeLcpScore >= 0.9
      ? pass(`LCP image is prioritized (PageSpeed Insights).${lcpNote}`)
      : warn(`LCP image is not prioritized — add fetchpriority="high" or a preload link.${lcpNote}`)
  }

  if (metrics.unsizedImagesScore != null) {
    const clsNote = metrics.clsValue != null ? ` Real CLS: ${metrics.clsValue.toFixed(3)}.` : ''
    autoResults['cwv.2.0'] = metrics.unsizedImagesScore >= 0.9
      ? pass(`Images have explicit dimensions (PageSpeed Insights).${clsNote}`)
      : warn(`Some images are missing explicit width/height, contributing to layout shift.${clsNote}`)
  }

  if (metrics.modernFormatsScore != null) {
    autoResults['cwv.3.0'] = metrics.modernFormatsScore >= 0.9
      ? pass('Images are served in modern formats (PageSpeed Insights)')
      : warn('Some images are not served in modern formats (WebP/AVIF) — real measurement from PageSpeed Insights')
  }

  if (metrics.renderBlockingScore != null) {
    autoResults['cwv.3.2'] = metrics.renderBlockingScore >= 0.9
      ? pass('No significant render-blocking resources (PageSpeed Insights)')
      : warn('Render-blocking resources are delaying first paint — real measurement from PageSpeed Insights')
  }

  if (metrics.cacheScore != null) {
    autoResults['cwv.3.4'] = metrics.cacheScore >= 0.9
      ? pass('Static assets use long cache lifetimes (PageSpeed Insights)')
      : warn('Static assets have short cache lifetimes — real measurement from PageSpeed Insights')
  }

  if (metrics.ttfbMs != null) {
    autoResults['cwv.3.6'] = metrics.ttfbMs < 600
      ? pass(`Real TTFB: ${Math.round(metrics.ttfbMs)}ms (PageSpeed Insights)`)
      : warn(`Real TTFB: ${Math.round(metrics.ttfbMs)}ms — over the 600ms threshold (PageSpeed Insights)`)
  }

  if (metrics.domSize != null) {
    autoResults['cwvRootCause.2.2'] = metrics.domSize <= 1500
      ? pass(`~${metrics.domSize} DOM elements (PageSpeed Insights) — within a healthy range`)
      : warn(`~${metrics.domSize} DOM elements (PageSpeed Insights) — large DOM slows style recalculation and hurts INP`)
  }
}
