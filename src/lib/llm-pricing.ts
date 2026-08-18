// Token pricing for the admin cost panels.
//
// Kept beside the rates it prices rather than inline in a route, because the previous
// version was a literal in /api/admin/stats computing Anthropic Haiku rates while
// production ran Groq — the panel was labelled "Groq haiku rates" in the UI and billed
// at roughly sixteen times the real input rate. One place to change means the label and
// the arithmetic cannot drift apart again.
//
// These are on-demand prices; Groq's batch API and prompt caching each halve them, so a
// real invoice can be lower than anything here.

/** Per million tokens, in USD. */
export interface TokenRate {
  input: number
  output: number
}

/**
 * The two models llm.ts maps its tiers onto under LLM_PROVIDER=groq.
 *
 * Verified 2026-08-18 against Groq's own model catalogue (console.groq.com/docs/models),
 * replacing the retired Llama rates that stood here from 2026-08-12. Those were left
 * deliberately wrong-but-labelled for a day rather than guessed at; these are the
 * published figures for the models actually in use.
 *
 * The 120b is exactly twice the 20b on both input and output, which is why the range
 * estimateCostRange returns is now narrow — see the note there.
 *
 * One thing that does not show up in the per-token rate: the gpt-oss models bill
 * reasoning tokens as output, and they reason before writing a visible character.
 * Confirmed by measurement, not by documentation — a trivial "reply OK" call reported
 * completion_tokens 49 with reasoning_tokens 39 inside it. So the output volume per call
 * is several times what the visible answer suggests. Nothing to correct for here: Groq
 * returns reasoning inside usage.completion_tokens, which is the field llm.ts records,
 * so the token counts these rates are applied to already include it.
 */
export const GROQ_RATES: Record<'small' | 'large', TokenRate> = {
  small: { input: 0.075, output: 0.30 }, // openai/gpt-oss-20b
  large: { input: 0.15,  output: 0.60 }, // openai/gpt-oss-120b
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
 * them. Seven call sites across five files (ranking-engine, rewrite, serp,
 * content-optimizer, ai-regex) use the large tier and the other twenty-seven use the
 * small one, so the true figure sits somewhere between "all small" and "all large".
 *
 * On the Llama rates that gap was an order of magnitude and the midpoint was close to
 * meaningless. On the gpt-oss pair the large tier is exactly 2x the small one on both
 * input and output, so max is always exactly 2x min and the midpoint is within 33% of
 * either end whatever the real mix. The range is still the honest output — narrowing it
 * properly means recording the model alongside the token counts, which is a schema
 * change — but it is no longer wide enough to be useless.
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
