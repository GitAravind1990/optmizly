/**
 * AI Presence: the tuning knobs, in one file.
 *
 * The weights live here and nowhere else. Scattering them through the scoring code is how a
 * number quoted in the UI comes to disagree with the number being enforced, which this
 * repository has already fixed twice — in the plan allowance and in the tool counts.
 */

/** Where a fact came from. Never inferred silently; see `SOURCE_LABEL`. */
export type SourceType =
  /** Optmizly composed the query and ran it against the engine. */
  | 'TESTED'
  /** Read directly out of an engine's answer — a citation, a mention. */
  | 'OBSERVED'
  /** Handed to us by a provider API as its own data. Nothing supplies this yet. */
  | 'PROVIDER_DATA'
  /** Optmizly worked it out. A judgement, not a measurement. */
  | 'INFERRED'

/** What the UI prints. Deliberately plain: a user should not need a glossary. */
export const SOURCE_LABEL: Record<SourceType, string> = {
  TESTED: 'Optmizly test query',
  OBSERVED: 'Observed in AI answer',
  PROVIDER_DATA: 'Provider data',
  INFERRED: 'Inferred by Optmizly',
}

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * Score component weights.
 *
 * DISCOVERY and REFERRAL are declared but have no data source in the MVP — no log ingestion,
 * no analytics integration. They are kept here rather than deleted so the renormalisation
 * below is visibly doing something, and so adding the source later is a config change rather
 * than a scoring rewrite. A component with no data is *excluded and the rest renormalised*,
 * never counted as zero: scoring an unmeasured thing as nothing punishes the customer for a
 * feature we have not built.
 */
export const SCORE_WEIGHTS = {
  visibility: 0.30,
  citation: 0.25,
  authority: 0.20,
  coverage: 0.15,
  discovery: 0.10,
} as const

export type ScoreComponent = keyof typeof SCORE_WEIGHTS

/** Components the MVP can actually measure. The rest render as "Not connected". */
export const AVAILABLE_COMPONENTS: ScoreComponent[] = [
  'visibility',
  'citation',
  'authority',
  'coverage',
]

/**
 * Below this many answered prompts, no score is produced at all.
 *
 * A citation rate over three prompts is noise presented as a metric, and the instruction is
 * explicit: prefer "not enough data" to fake intelligence. Five is low enough that a first
 * real scan clears it and high enough that one lucky answer cannot set the headline number.
 */
export const MIN_ANSWERS_FOR_SCORE = 5

/** Prompts below this make a *component* unreliable rather than the whole score. */
export const MIN_ANSWERS_FOR_CONFIDENCE: Record<Confidence, number> = {
  HIGH: 20,
  MEDIUM: 10,
  LOW: 0,
}

/**
 * Domains that are never a competitor, whatever an answer cites.
 *
 * Only used to keep the "mark as competitor" list clean of things nobody would mark. It does
 * not classify anything *as* a competitor — that stays a human decision, because calling an
 * arbitrary cited domain a rival is inference dressed as observation.
 */
export const NEVER_COMPETITOR = new Set([
  'wikipedia.org',
  'en.wikipedia.org',
  'reddit.com',
  'quora.com',
  'youtube.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
])
