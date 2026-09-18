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
 * `discovery` has no data source, and it is not one this product can simply switch on. It
 * would mean counting AI crawler hits against the *customer's own site*, which live in their
 * server or CDN logs — nothing Optmizly holds or can reach. Treat it as a stated part of the
 * model rather than as work that is nearly done.
 *
 * Keeping it costs nothing arithmetically. A component with no data is *excluded and the rest
 * renormalised*, never scored as zero, so the four measured weights are divided by 0.90
 * whether or not `discovery` appears here — deleting it would change no score. Scoring an
 * unmeasured thing as nothing would punish the customer for a feature that does not exist.
 */
export const SCORE_WEIGHTS = {
  visibility: 0.30,
  citation: 0.25,
  authority: 0.20,
  coverage: 0.15,
  discovery: 0.10,
} as const

export type ScoreComponent = keyof typeof SCORE_WEIGHTS

/**
 * Whether each component has a data source behind it at all.
 *
 * A `Record` rather than a list of the measurable ones, so adding a component to
 * `SCORE_WEIGHTS` without deciding this is a compile error rather than a silent exclusion.
 * Left as a list, a new component would simply never score and nothing would say so — the
 * same failure the plan gating in this repo is keyed rather than ranked to avoid.
 *
 * Note this is only half of "available": a component also needs its source to have actually
 * produced something. `score.ts` checks both.
 */
export const COMPONENT_HAS_SOURCE: Record<ScoreComponent, boolean> = {
  visibility: true,
  citation: true,
  authority: true,
  coverage: true,
  discovery: false,
}

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
