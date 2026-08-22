/**
 * The seven Content Optimizer sections, and nothing else.
 *
 * Separate from `content-optimizer.ts` on purpose: that module imports `llm.ts`, which
 * pulls in the Groq SDK and reads server-only env. The dashboard needs the section list to
 * drive the run and label its progress, so the list has to live somewhere a client
 * component can import without dragging the provider into the browser bundle.
 */

/**
 * The order the client walks the sections in.
 *
 * Sequential, not parallel, and that is the whole point: seven concurrent calls share one
 * 8,000 tokens/min Groq bucket and 429 each other, which is what made the original
 * single-request version 502. One at a time, each request also stays far inside Clerk's
 * 61-second session token — see CLAUDE.md, "Giving a signed-in route a maxDuration over 60".
 */
export const SECTION_ORDER = [
  'intent', 'entities', 'lsi', 'schema', 'topic', 'eeat', 'improvements',
] as const

export type SectionKey = typeof SECTION_ORDER[number]

/** Shown while each section runs, so a two-minute run reads as progress rather than a hang. */
export const SECTION_LABELS: Record<SectionKey, string> = {
  intent:       'Search intent',
  entities:     'Entities',
  lsi:          'LSI keywords',
  schema:       'Schema markup',
  topic:        'Topic coverage',
  eeat:         'E-E-A-T',
  improvements: 'Improvements',
}

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === 'string' && (SECTION_ORDER as readonly string[]).includes(v)
}
