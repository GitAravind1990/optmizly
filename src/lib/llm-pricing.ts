// Token pricing for the admin cost panels.
//
// Kept beside the rates it prices rather than inline in a route, because the previous
// version was a literal in /api/admin/stats computing Anthropic Haiku rates while
// production ran Groq — the panel was labelled "Groq haiku rates" in the UI and billed
// at roughly sixteen times the real input rate. One place to change means the label and
// the arithmetic cannot drift apart again.
//
// Published rates as of 2026-08-12. These are on-demand prices; Groq's batch API and
// prompt caching each halve them, so a real invoice can be lower than anything here.

/** Per million tokens, in USD. */
export interface TokenRate {
  input: number
  output: number
}

/** The two models llm.ts maps its tiers onto under LLM_PROVIDER=groq, matching the
 *  GROQ_HAIKU_MODEL / GROQ_SONNET_MODEL defaults. Production sets neither override, so
 *  these are what actually runs. */
export const GROQ_RATES: Record<'small' | 'large', TokenRate> = {
  small: { input: 0.05, output: 0.08 },  // llama-3.1-8b-instant
  large: { input: 0.59, output: 0.79 },  // llama-3.3-70b-versatile
}

/** Kept for the day LLM_PROVIDER flips back. Not used while production is on Groq. */
export const ANTHROPIC_RATES: Record<'small' | 'large', TokenRate> = {
  small: { input: 0.80, output: 4.00 },  // claude-haiku-4-5
  large: { input: 3.00, output: 15.00 }, // claude-sonnet-4-6
}

function cost(inputTokens: number, outputTokens: number, rate: TokenRate): number {
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
}

export interface CostRange {
  /** Everything billed at the small tier. */
  min: number
  /** Everything billed at the large tier. */
  max: number
  /** Midpoint, for a single headline figure. */
  mid: number
}

/**
 * A range, not a number, because we cannot do better honestly.
 *
 * Token totals are stored per user in aggregate, with no record of which tier produced
 * them. Five routes (ranking-engine, rewrite, serp, content-optimizer, ai-regex) use the
 * large tier and the other thirty call sites use the small one, so the true figure sits
 * somewhere between "all small" and "all large" — an order of magnitude apart.
 *
 * Reporting the midpoint alone would be the same false precision the old constant had.
 * Narrowing this properly means recording the model alongside the token counts, which is
 * a schema change; until then the range is the honest answer.
 */
export function estimateCostRange(
  inputTokens: number,
  outputTokens: number,
  rates: Record<'small' | 'large', TokenRate> = GROQ_RATES
): CostRange {
  const min = cost(inputTokens, outputTokens, rates.small)
  const max = cost(inputTokens, outputTokens, rates.large)
  return { min, max, mid: (min + max) / 2 }
}

/** Which rate card applies, following the same env var llm.ts reads. */
export function activeRates(): Record<'small' | 'large', TokenRate> {
  return process.env.LLM_PROVIDER === 'groq' ? GROQ_RATES : ANTHROPIC_RATES
}
