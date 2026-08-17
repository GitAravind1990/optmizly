// The E-E-A-T analysis engine, shared by the signed-in tool (/api/eeat) and the public
// no-signup one (/api/public/eeat).
//
// Extracted rather than copied for the same reason src/lib/ai-regex.ts exists: two doors
// onto one engine. A duplicated prompt drifts, and then the free tool and the paid tool
// quietly disagree about what a score means — which is worse than having no free tool.

import { callLLM, extractJSON } from './llm'

/** How much of the submitted content reaches the model. Matches the signed-in tool
 *  exactly: the free version must not be a *better* analysis than the paid one, and this
 *  figure is disclosed on the public page rather than silently truncating. */
export const EEAT_ANALYSED_CHARS = 3_000

export interface EeatDimension {
  score: number
  finding: string
}

export interface EeatResult {
  overall: number
  summary: string
  dimensions: {
    experience: EeatDimension
    expertise: EeatDimension
    authoritativeness: EeatDimension
    trustworthiness: EeatDimension
  }
  recommendations: string[]
}

const SYSTEM = `You are an E-E-A-T specialist. Analyse the content and return ONLY valid JSON:
{"overall":0,"summary":"","dimensions":{"experience":{"score":0,"finding":""},"expertise":{"score":0,"finding":""},"authoritativeness":{"score":0,"finding":""},"trustworthiness":{"score":0,"finding":""}},"recommendations":[""]}
Rules: all scores 0-100. recommendations: 5 specific E-E-A-T improvements. All strings concise.`

/**
 * Scores content against Google's four E-E-A-T dimensions.
 *
 * Throws on an unreachable provider or an unparseable response — deliberately. The caller
 * decides what that costs: the public route hands the visitor's daily unit back, because
 * charging someone for our own failure is the bug this codebase keeps re-learning.
 */
export async function analyseEeat(content: string, summary?: string): Promise<EeatResult> {
  const raw = await callLLM(
    SYSTEM,
    `Analyse for E-E-A-T.\n<topic>${summary ?? ''}</topic>\n\n<content>\n${content.slice(0, EEAT_ANALYSED_CHARS)}\n</content>`,
    1200
  )
  return extractJSON(raw) as EeatResult
}
