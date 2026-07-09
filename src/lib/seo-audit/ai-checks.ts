// Per-check AI verdicts — a curated set of manual checklist items that are
// judgeable directly from a single page's content (no external data needed),
// answered by the same Claude call that scores the four AI categories.
// Anything not in this list stays a manual checklist item.

import { ALL_CHECKS, type CheckStatus } from './framework'
import type { AutoCheckResult } from './auto-checks'

export const AI_CHECK_IDS = [
  'eeat.0.0', 'eeat.0.1', 'eeat.0.2',
  'eeat.1.0', 'eeat.1.2',
  'eeat.3.0',
  'aiSeo.1.1', 'aiSeo.1.2', 'aiSeo.1.3',
  'aiSeo.3.0', 'aiSeo.3.2',
] as const

const LABEL_BY_ID = new Map(ALL_CHECKS.map(c => [c.id, c.label]))

export function aiCheckPromptLines(): string {
  return AI_CHECK_IDS.map(id => `- "${id}": ${LABEL_BY_ID.get(id) ?? id}`).join('\n')
}

const VALID_STATUSES: CheckStatus[] = ['pass', 'fail', 'warn', 'na']

/**
 * Validates and merges Claude's per-check verdicts into the auto-results map.
 * Only ids in AI_CHECK_IDS are accepted; anything malformed is silently
 * skipped so a bad AI response degrades to "manual", never to a wrong verdict.
 */
export function mergeAICheckVerdicts(
  autoResults: Record<string, AutoCheckResult>,
  parsedChecks: unknown
): void {
  if (!parsedChecks || typeof parsedChecks !== 'object') return
  const checks = parsedChecks as Record<string, unknown>
  for (const id of AI_CHECK_IDS) {
    const v = checks[id]
    if (!v || typeof v !== 'object') continue
    const vv = v as Record<string, unknown>
    const status = vv.status
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status as CheckStatus)) continue
    const detailRaw = vv.detail
    const detail = typeof detailRaw === 'string' && detailRaw.trim()
      ? detailRaw.slice(0, 300)
      : 'AI-assessed from page content'
    autoResults[id] = { status: status as CheckStatus, detail }
  }
}
