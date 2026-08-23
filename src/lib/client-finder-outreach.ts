/**
 * Writes one cold outreach email for one prospect.
 *
 * Generated per prospect on demand rather than for the whole search, unlike the sales
 * angles in client-finder-ai.ts. An agency emails two or three businesses out of ten, so
 * generating all ten up front would spend tokens on eight emails nobody sends.
 *
 * The rules from the rest of this tool carry over unchanged:
 *
 * - The model gets structured findings, never page HTML. The one piece of site-authored
 *   text that reaches it is the quoted <title> inside a finding description, capped at 200
 *   characters in homepage-seo-check.ts.
 * - No promises about rankings or traffic. This email goes to a real business over the
 *   agency's name; a fabricated "we'll get you to page one" is their credibility, not ours.
 * - Strict JSON, every field validated, and a null return on anything unexpected. The UI
 *   shows an error rather than a half-written email, because a broken email that looks
 *   finished is worse than none.
 */
import { callLLM, extractJSON } from './llm'
import type { SEOFinding } from './homepage-seo-check'

export interface OutreachInput {
  businessName: string
  location?: string
  findings: SEOFinding[]
  /** Appears as the sender. Optional - the email reads fine without it. */
  agencyName?: string
  senderName?: string
}

export interface OutreachEmail {
  subject: string
  body: string
}

/** Two or three concrete problems is a cold email. Eight is a report nobody reads. */
const FINDINGS_IN_EMAIL = 3

const SYSTEM = `You write short cold outreach emails for an SEO agency contacting a local business.

You are given the business name, and specific problems found on their website by an
automated check. Write one email.

Requirements:
- Subject: under 60 characters, specific, no clickbait, no "Quick question".
- Body: 90-130 words. Plain text, no markdown, no bullet characters.
- Open by naming ONE concrete problem from the list. Be specific enough that it is obviously
  not a mass mailing.
- Say briefly why it costs them something, in plain language a non-technical owner follows.
- Close with a low-friction ask - offering to send the rest of what was found, or a short
  call. Never demand a meeting.
- Sign off with the sender details given, or a neutral sign-off if none.

Never do any of these:
- Promise a ranking position, a traffic number, or a timeframe for results.
- Invent a problem, a statistic, a competitor, or anything about their business you were
  not told.
- Claim to have done a full audit. Only their homepage was checked.
- Use hype, flattery, or fake urgency.

Return ONLY valid JSON: {"subject":"...","body":"..."}`

/** Rejects the obvious failure: an email promising an outcome nobody can promise. */
const FORBIDDEN = /\b(guarantee|guaranteed|page one|#1 on google|first page|double your|triple your|\d+% more traffic)\b/i

export async function generateOutreach(input: OutreachInput): Promise<OutreachEmail | null> {
  const problems = input.findings.slice(0, FINDINGS_IN_EMAIL).map(f => ({
    issue: f.title,
    detail: f.description,
    severity: f.severity,
  }))

  if (problems.length === 0) return null

  const prompt = [
    `Business: ${input.businessName}`,
    input.location ? `Location: ${input.location}` : null,
    input.agencyName ? `Agency (sender): ${input.agencyName}` : null,
    input.senderName ? `Sender name: ${input.senderName}` : null,
    '',
    `Problems found on their homepage:`,
    JSON.stringify(problems, null, 2),
  ].filter(v => v !== null).join('\n')

  let raw: string
  try {
    raw = await callLLM(SYSTEM, prompt, 700)
  } catch (e) {
    console.warn('[client-finder-outreach] model call failed:', e instanceof Error ? e.message : e)
    return null
  }

  let parsed: unknown
  try {
    parsed = extractJSON(raw)
  } catch {
    console.warn('[client-finder-outreach] response was not parseable JSON')
    return null
  }

  const o = parsed as Record<string, unknown>
  if (typeof o?.subject !== 'string' || typeof o?.body !== 'string') return null

  const subject = o.subject.trim().slice(0, 120)
  const body = o.body.trim().slice(0, 2_000)
  if (!subject || !body) return null

  // Checked rather than trusted. The instruction not to promise rankings is a prompt, and
  // prompts are advisory - this is the part that actually holds. An agency sending a
  // guarantee written by a machine over their own name is the one failure worth blocking
  // outright rather than showing with a warning.
  if (FORBIDDEN.test(subject) || FORBIDDEN.test(body)) {
    console.warn('[client-finder-outreach] draft promised an outcome; refusing to return it')
    return null
  }

  return { subject, body }
}
