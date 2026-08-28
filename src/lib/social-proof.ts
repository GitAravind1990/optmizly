/**
 * Social proof data — the single place to add real customer evidence.
 *
 * Everything here starts empty on purpose. Optmizly has no customer testimonials, no
 * customer logos and no usage numbers worth publishing yet, and inventing any of them
 * would be the one thing this site cannot recover from: the first visitor who checks a
 * fabricated logo is gone, and so is every claim next to it.
 *
 * So the rule this file enforces is simple. **A slot renders only when it holds something
 * real.** An empty array renders nothing at all in production, and the surrounding section
 * falls back to what can actually be proven — see `<SocialProof />`.
 *
 * ── Adding real proof ────────────────────────────────────────────────────────────────
 * Drop an object into the array below. No component changes, no layout work.
 *
 *   TESTIMONIALS.push({
 *     quote: 'What they actually said, verbatim.',
 *     name: 'Their name',
 *     role: 'Head of Growth',
 *     company: 'Their company',
 *     permission: 'email 2026-09-14',   // how you know you may publish it
 *   })
 *
 * Two things to keep honest when you do:
 *   - `permission` is not decorative. Publishing a customer's name and words needs their
 *     say-so, and this field is where you record that you have it.
 *   - Usage stats must be countable from the database or a provider dashboard. If you
 *     cannot point at where the number comes from, it does not go here.
 *
 * To preview the empty slots while designing, set NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=1
 * locally. Placeholders never render in production without it.
 */

export interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  /** How you know you are allowed to publish this. Free text, e.g. "email 2026-09-14". */
  permission: string
  /** Optional path in /public. Leave unset rather than using a stock photo. */
  avatarUrl?: string
}

export interface CustomerLogo {
  name: string
  /** Path in /public. Only a logo you have been given permission to display. */
  src: string
  /** Optional link to the customer's site. */
  href?: string
}

export interface UsageStat {
  /** The number itself, pre-formatted. "1,284" not 1284. */
  value: string
  label: string
  /** Where this number comes from, so it can be re-checked. Not rendered. */
  source: string
}

/** Real customer quotes. Empty until someone has actually said something. */
export const TESTIMONIALS: Testimonial[] = []

/** Real customer logos, used with permission. */
export const CUSTOMER_LOGOS: CustomerLogo[] = []

/**
 * Real, countable usage numbers.
 *
 * Deliberately empty. The honest figures today — a handful of signups, two test
 * subscriptions — are worse than no figures, and rounding them up is how "10,000+ users"
 * gets written. Add these when they are both true and worth stating.
 */
export const USAGE_STATS: UsageStat[] = []

export const hasTestimonials = TESTIMONIALS.length > 0
export const hasLogos = CUSTOMER_LOGOS.length > 0
export const hasStats = USAGE_STATS.length > 0
export const hasAnyProof = hasTestimonials || hasLogos || hasStats

/** Placeholders are a design aid, never something a visitor should see. */
export const showPlaceholders = process.env.NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS === '1'
