// Layer 2 of the AI Regex tool: applying a pattern to data.
//
// The split matters. Layer 1 (src/lib/ai-regex.ts) asks Claude to *write* a pattern
// and explain it in English. Nothing here asks a model what matches — a real regex
// engine decides that, deterministically, so the same pattern and the same data always
// produce the same rows. Same division as the grounded SEO tools: the model explains,
// the code decides.
//
// The pattern is attacker-controlled in the sense that matters: it arrives from a user
// prompt via an LLM, so it can be malformed or pathological without anyone intending
// harm. Everything below assumes that.

import RE2 from 're2'

/** Refuse oversized input rather than trying to be clever about it. 500KB of
 *  one-per-line SEO data is roughly 15-25k queries — far past any paste a person makes,
 *  and small enough that a linear scan is never the slow part of a request. */
export const MAX_INPUT_BYTES = 500_000
export const MAX_LINES = 50_000

/** Patterns longer than this are not hand-written filters; they are either generated
 *  junk or an attempt to find an engine limit. */
export const MAX_PATTERN_LENGTH = 1_000

/** Flags we accept. RE2 supports the same letters as JS for these. `g` is deliberately
 *  absent from per-line testing (see matchLines) but allowed here because callers may
 *  legitimately pass it through from a generated pattern. */
const ALLOWED_FLAGS = new Set(['g', 'i', 'm', 's', 'u'])

export interface PatternValidation {
  safe: boolean
  reason?: string
  /** True when the pattern uses syntax RE2 cannot compile — lookaround or
   *  backreferences. Distinct from unsafe: the pattern may be perfectly reasonable,
   *  it just cannot run on a backtracking-free engine. Callers use this to ask the
   *  model to re-express the intent rather than reporting a hard failure. */
  needsBacktracking?: boolean
}

/**
 * Is this pattern safe to run, and can our engine run it at all?
 *
 * The decisive check is simply whether RE2 compiles it. RE2 is a finite-automaton
 * engine with no backtracking, so a pattern it accepts cannot exhibit catastrophic
 * behaviour — the guarantee is structural rather than a heuristic that hopes to
 * recognise every dangerous shape. Measured on this machine: `(a+)+$` against 40 a's
 * returns in 1ms under RE2, while V8's engine takes 16 seconds on just 26 a's and
 * roughly doubles per additional character.
 *
 * The heuristics below therefore exist only to produce a *better message* than
 * "compile failed", and to reject inputs that are abusive before we hand them to a
 * native addon.
 */
export function validatePattern(pattern: string): PatternValidation {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return { safe: false, reason: 'Pattern is empty.' }
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { safe: false, reason: `Pattern is too long (${pattern.length} characters, limit ${MAX_PATTERN_LENGTH}).` }
  }

  // Named for the user, before RE2's own error text reaches them. These are the four
  // constructs RE2 rejects, and the ones a language model reaches for most readily:
  // "queries that do NOT mention the brand" invites a negative lookahead.
  if (/\(\?<?[=!]/.test(pattern)) {
    return {
      safe: false,
      needsBacktracking: true,
      reason: 'Lookahead and lookbehind cannot be evaluated safely. Match the thing itself and invert the result instead.',
    }
  }
  if (/\\[1-9]/.test(pattern)) {
    return {
      safe: false,
      needsBacktracking: true,
      reason: 'Backreferences cannot be evaluated safely.',
    }
  }

  try {
    new RE2(pattern)
  } catch (e) {
    // RE2's messages are terse but accurate ("missing closing )"), and far more useful
    // than a generic failure. They describe the pattern, never our internals.
    return { safe: false, reason: e instanceof Error ? e.message.split('\n')[0] : 'Pattern is not valid.' }
  }

  return { safe: true }
}

/** Keeps only flags we recognise, so a malformed flag string cannot throw at
 *  construction time. Order is normalised, duplicates dropped. */
export function sanitiseFlags(flags: string | undefined): string {
  if (!flags) return ''
  return [...new Set(flags.split(''))].filter(f => ALLOWED_FLAGS.has(f)).join('')
}

export interface MatchOptions {
  /** Return the lines that do NOT match. This is how "non-branded queries" and every
   *  other exclusion is expressed: match the brand, invert the result. It replaces the
   *  negative lookahead RE2 cannot run, it is exact rather than approximate, and it is
   *  easier to explain to a user than `(?!...)` would be. */
  negate?: boolean
  /** Wall-clock budget for the whole scan. RE2 is linear, so this is a guard against a
   *  huge input rather than against a pathological pattern — but a caller should never
   *  be able to hold a request open indefinitely regardless of the reason. */
  timeoutMs?: number
  /** Cap on returned lines, so a pattern matching everything cannot return a 500KB
   *  response. matchCount still reports the true total. */
  maxMatches?: number
}

export interface MatchResult {
  /** The lines that matched (or did not, when negated), capped by maxMatches. */
  matches: string[]
  /** True number of matching lines, unaffected by maxMatches. */
  matchCount: number
  /** Lines actually scanned, after input caps were applied. */
  totalLines: number
  /** The scan hit its time budget and stopped early; counts are partial. */
  timedOut: boolean
  /** Input was cut down by MAX_INPUT_BYTES or MAX_LINES before scanning. */
  truncated: boolean
  /** Distinct matched substrings from the first few hits, for showing the user what the
   *  pattern actually caught rather than only which lines it caught. */
  sampleMatches: string[]
}

export class UnsafePatternError extends Error {}

/**
 * Applies a pattern to text, one line at a time.
 *
 * Line-oriented because that is the unit of SEO data here: one query, keyword or URL per
 * line, and the question is always "which of these does this describe". A caller wanting
 * to extract substrings from prose can pass the whole text as a single line.
 *
 * Throws UnsafePatternError if the pattern fails validation — callers must not be able
 * to skip that check by calling this directly.
 */
export function safeMatch(
  pattern: string,
  flags: string | undefined,
  text: string,
  { negate = false, timeoutMs = 1_000, maxMatches = 1_000 }: MatchOptions = {}
): MatchResult {
  const validation = validatePattern(pattern)
  if (!validation.safe) throw new UnsafePatternError(validation.reason ?? 'Unsafe pattern.')

  let truncated = false
  let body = text ?? ''
  if (body.length > MAX_INPUT_BYTES) {
    body = body.slice(0, MAX_INPUT_BYTES)
    truncated = true
  }

  let lines = body.split(/\r?\n/)
  if (lines.length > MAX_LINES) {
    lines = lines.slice(0, MAX_LINES)
    truncated = true
  }

  const clean = sanitiseFlags(flags)
  // `g` is stripped for the test pass on purpose. A global regex carries lastIndex
  // between calls, so reusing one across lines silently skips matches — the classic
  // footgun. A separate global instance is built below only for pulling sample text.
  const tester = new RE2(pattern, clean.replace('g', ''))
  const sampler = new RE2(pattern, clean.includes('g') ? clean : clean + 'g')

  const matches: string[] = []
  const sampleMatches: string[] = []
  const deadline = Date.now() + timeoutMs
  let matchCount = 0
  let timedOut = false
  let scanned = 0

  for (const line of lines) {
    // Checked every 256 lines rather than every line: Date.now() in a tight loop is
    // itself measurable, and 256 lines of linear matching cannot overshoot meaningfully.
    if ((scanned & 0xff) === 0 && Date.now() > deadline) {
      timedOut = true
      break
    }
    scanned++

    const hit = tester.test(line)
    if (hit === negate) continue

    matchCount++
    if (matches.length < maxMatches) matches.push(line)

    // Only meaningful for positive matches — there is no matched substring to show for
    // a line that was kept because it failed to match.
    if (!negate && sampleMatches.length < 5) {
      const found = line.match(sampler)
      if (found) {
        for (const m of found) {
          if (m && !sampleMatches.includes(m) && sampleMatches.length < 5) sampleMatches.push(m)
        }
      }
    }
  }

  return { matches, matchCount, totalLines: scanned, timedOut, truncated, sampleMatches }
}
