// Layer 1 of the AI Regex tool: turning a plain-English description into a pattern.
//
// This module asks Claude for a *pattern* and never for an answer. It has no access to
// the user's data beyond a handful of sample lines used as context, and nothing it
// returns is trusted until src/lib/regex-safety.ts has validated it. Matching happens
// there, in a real engine, deterministically.
//
// SERVER ONLY — imports the Anthropic client transitively.

import { callClaude, extractJSON } from '@/lib/anthropic'
import { validatePattern, sanitiseFlags } from '@/lib/regex-safety'

/** What the lines are, so the prompt can carry the right domain hints. Deliberately a
 *  description of the *content*, not of where it came from: 'gsc_queries' means "search
 *  queries", whether they were pasted by hand or, later, pulled from a connected Search
 *  Console property. Nothing downstream needs to know the source. */
export type RegexDataType = 'gsc_queries' | 'keywords' | 'page_content' | 'generic'

export interface GeneratedRegex {
  pattern: string
  flags: string
  /** Whether the intent was exclusion. RE2 has no negative lookahead, so "queries that
   *  do not mention the brand" is expressed as a positive pattern plus this flag, and
   *  the inversion happens in code. Clearer for the user than `(?!...)` either way. */
  negate: boolean
  /** Plain English, shown to the user beside the pattern. */
  explanation: string
  /** The model's own guesses at matching strings, shown only as illustration. Never
   *  presented as results — the real matches come from running the pattern. */
  exampleMatches: string[]
}

/** Sample lines sent as context. Enough to show the model the shape of the data
 *  (casing, whether URLs or queries, language) without shipping the user's whole
 *  dataset to a third party for a job that does not need it. */
const SAMPLE_LINES = 15
const SAMPLE_LINE_MAX = 120

const DATA_TYPE_HINTS: Record<RegexDataType, string> = {
  gsc_queries: `The lines are search queries people typed into Google. Common requests and how to read them:
- "question queries" -> lines starting with how/what/why/when/where/who/is/are/can/does/do/should
- "branded" -> queries containing the site's brand name; "non-branded" is the same pattern with negate=true
- "long-tail" -> four or more words
- "comparison" -> vs, versus, "compared to", "alternative to", "or"
- "location-based" -> "near me", "in <place>", a city or country name
- "transactional" -> buy, price, pricing, cost, cheap, deal, discount, free
Queries are lowercase far more often than not, so prefer the i flag.`,

  keywords: `The lines are SEO keywords or keyphrases. Word-count filters ("long-tail", "head terms") are common, as are modifier filters (best, top, review, alternative, template, example) and intent filters. Prefer the i flag.`,

  page_content: `The lines are extracted page content, headings or URLs. Requests often concern structure rather than wording: URLs containing a date, URLs at a given depth, headings in question form, lines containing a year, lines over a certain length.`,

  generic: `The lines are arbitrary text data. Make no assumptions about their shape beyond what the samples show.`,
}

const SYSTEM_PROMPT = `You write a single regular expression that selects lines from a list of SEO data. You never decide which lines match — a regex engine does that. Your only job is the pattern, its flags, and an explanation a non-technical person can read.

The engine is RE2, which does NOT support:
- lookahead or lookbehind: (?=...) (?!...) (?<=...) (?<!...)
- backreferences: \\1 \\2
- atomic groups or possessive quantifiers

To express exclusion ("does not contain", "everything except", "non-branded"), write the POSITIVE pattern for the thing being excluded and set "negate": true. The caller inverts the result. Never attempt a negative lookahead.

Return ONLY a JSON object, no markdown fences, no commentary:
{
  "pattern": "the regex, as a JSON string with backslashes escaped",
  "flags": "any of i m s (never g)",
  "negate": false,
  "explanation": "one or two plain sentences describing what this selects. Mention the negation explicitly if negate is true.",
  "exampleMatches": ["up to 3 short strings this would select"]
}

Rules:
- Anchor with ^ and $ only when the request is genuinely about the whole line.
- Prefer \\b word boundaries over bare substrings, so "art" does not match "start".
- Keep the pattern as simple as the request allows; a reader should be able to check it.
- Never use nested quantifiers such as (a+)+ or (.*)*.
- The explanation describes the pattern, not the data. Do not claim how many lines will match.`

export type RegexGenerationFailure =
  | { ok: false; error: string }

export type RegexGenerationResult =
  | { ok: true; result: GeneratedRegex; retried: boolean }
  | RegexGenerationFailure

function buildSample(sampleData: string | undefined): string {
  if (!sampleData?.trim()) return 'No sample provided.'
  const lines = sampleData
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, SAMPLE_LINES)
    .map(l => (l.length > SAMPLE_LINE_MAX ? l.slice(0, SAMPLE_LINE_MAX) + '…' : l))
  return lines.length ? lines.join('\n') : 'No sample provided.'
}

function coerce(raw: Record<string, unknown>): GeneratedRegex | null {
  const pattern = typeof raw.pattern === 'string' ? raw.pattern.trim() : ''
  if (!pattern) return null
  return {
    pattern,
    // `g` is stripped here rather than in the engine: a global pattern means nothing
    // for line selection and only introduces lastIndex statefulness.
    flags: sanitiseFlags(typeof raw.flags === 'string' ? raw.flags : '').replace('g', ''),
    negate: raw.negate === true,
    explanation: typeof raw.explanation === 'string' && raw.explanation.trim()
      ? raw.explanation.trim()
      : 'Selects the lines matching this pattern.',
    exampleMatches: Array.isArray(raw.exampleMatches)
      ? raw.exampleMatches.filter((m): m is string => typeof m === 'string').slice(0, 3)
      : [],
  }
}

/**
 * Asks Claude for a pattern, then refuses to return it unless our own validator agrees
 * it is safe to run.
 *
 * One retry, and only for a pattern that failed validation — the retry names the exact
 * problem, because the common failure is a negative lookahead the model reached for out
 * of habit, and that is trivially fixable by telling it to use negate instead. A second
 * failure returns an error rather than looping: the model has already been told twice.
 */
export async function generateRegex(
  description: string,
  dataType: RegexDataType = 'generic',
  sampleData?: string
): Promise<RegexGenerationResult> {
  const trimmed = description.trim()
  if (!trimmed) return { ok: false, error: 'Describe what you want to match.' }
  if (trimmed.length > 500) return { ok: false, error: 'Description is too long. Keep it under 500 characters.' }

  const basePrompt = `${DATA_TYPE_HINTS[dataType]}

Sample of the user's data:
${buildSample(sampleData)}

The user wants to select: ${trimmed}`

  const attempt = async (extra?: string): Promise<{ parsed: GeneratedRegex | null; reason?: string }> => {
    let text: string
    try {
      text = await callClaude(SYSTEM_PROMPT, extra ? `${basePrompt}\n\n${extra}` : basePrompt, 700)
    } catch {
      return { parsed: null, reason: 'The pattern generator is unavailable right now. Please try again.' }
    }

    let raw: Record<string, unknown>
    try {
      raw = extractJSON<Record<string, unknown>>(text)
    } catch {
      return { parsed: null, reason: 'Could not read the generated pattern. Please try rephrasing.' }
    }

    const parsed = coerce(raw)
    if (!parsed) return { parsed: null, reason: 'No pattern was generated. Please try rephrasing.' }

    const check = validatePattern(parsed.pattern)
    if (!check.safe) return { parsed: null, reason: check.reason ?? 'The generated pattern was not safe to run.' }

    return { parsed }
  }

  const first = await attempt()
  if (first.parsed) return { ok: true, result: first.parsed, retried: false }

  const second = await attempt(
    `Your previous attempt was rejected: ${first.reason} Return a pattern the RE2 engine accepts. If the request is about excluding something, match the thing itself and set "negate": true.`
  )
  if (second.parsed) return { ok: true, result: second.parsed, retried: true }

  return { ok: false, error: second.reason ?? 'Could not generate a usable pattern. Try describing it differently.' }
}
