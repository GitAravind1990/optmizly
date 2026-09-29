/**
 * The dates the legal pages print, in one place because they kept stopping.
 *
 * /terms said "August 2026" while its section 3 had been rewritten three times in
 * September — the Starter toolset on the 7th, AI Visibility's credit weight on the 12th,
 * Multi-Location SEO on the 28th. /refund-policy said August while its last change was
 * 2026-09-06. A customer reading a date that old concludes the terms they agreed to are
 * unchanged, which is the one thing the line exists to tell them.
 *
 * Bump the page's date here in the same commit as the page's text. This is the same rule
 * as PRICING_UPDATED in src/lib/pricing-faq.ts, and it is on the checklist in CLAUDE.md
 * alongside the pages themselves: a freshness signal that stops moving is worse than none.
 *
 * Dates, not month strings, so the day is visible and the value can feed a dateModified.
 */
export const TERMS_UPDATED = '2026-09-28'
export const PRIVACY_UPDATED = '2026-09-28'
export const REFUND_UPDATED = '2026-09-06'

/**
 * /extension-privacy, which the Chrome Web Store listing links to as the extension's privacy
 * policy. It describes a different product from PRIVACY_UPDATED above — the extension collects
 * nothing — so it moves on its own, when the extension changes rather than when the platform
 * does.
 */
export const EXTENSION_PRIVACY_UPDATED = '2026-09-29'

/** "28 September 2026". Fixed to UTC so the rendered day cannot shift with the reader. */
export function legalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}
