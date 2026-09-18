import { prisma } from '@/lib/prisma'
import { requireToolAccess, type AuthedUser } from '@/lib/auth'
import {
  observationsFrom,
  parseOutcomes,
  toHost,
  type QueryObservation,
  type StoredRun,
} from './derive'

/**
 * Loading AI Presence data, in one place.
 *
 * Every endpoint goes through here so the tenant scope is written once. Each query is keyed
 * on the `userId` resolved from the Clerk session — never on an id supplied by the caller —
 * which is what keeps a crafted request from reading another account's scans. A brand or
 * domain in the query string only *narrows* that set; it can never widen it.
 *
 * Read-only, and gated with `requireToolAccess` rather than `requireAuth`: opening a
 * dashboard must not spend a monthly credit. The scan that produced this data was already
 * charged when it ran.
 */

/** The tool key AI Presence is gated behind. Reuses AI Visibility's entitlement. */
export const AI_PRESENCE_TOOL = 'ai-visibility'

/** One brand with runs behind it. The MVP's unit of scope. */
export type PresenceScope = {
  brand: string
  domain: string | null
  host: string | null
  runCount: number
  lastRunAt: Date
}

export async function authorise(): Promise<AuthedUser> {
  return requireToolAccess(AI_PRESENCE_TOOL)
}

/**
 * The brands this account has actually scanned.
 *
 * Derived from stored runs rather than a Project table. There is no project entity in this
 * codebase, and inventing one for the MVP would mean a migration plus reworking the AI
 * Visibility tool's inputs — for a selector that this reproduces exactly from data already
 * present. Post-MVP extension point: a real Project model, backfilled from these pairs.
 */
export async function listScopes(userId: string): Promise<PresenceScope[]> {
  const runs = await prisma.aiVisibilityRun.findMany({
    where: { userId },
    select: { brand: true, domain: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Keyed on brand alone, deliberately, because that is the only key `loadPresence` filters
  // runs by. Keying on (brand, domain) would list the same brand twice as soon as one scan
  // was run with the domain field changed or left blank, and each entry would advertise a
  // run count smaller than the set of runs actually loaded behind it.
  const byBrand = new Map<string, PresenceScope>()
  for (const r of runs) {
    const existing = byBrand.get(r.brand)
    if (existing) {
      existing.runCount++
      // A later scan run without a domain must not erase the host that makes "cited"
      // measurable at all, so only fill a gap here — never overwrite.
      if (!existing.domain && r.domain) {
        existing.domain = r.domain
        existing.host = toHost(r.domain)
      }
      continue
    }
    byBrand.set(r.brand, {
      brand: r.brand,
      domain: r.domain,
      host: toHost(r.domain),
      runCount: 1,
      // findMany is ordered newest first, so the first row seen is the latest.
      lastRunAt: r.createdAt,
    })
  }
  return [...byBrand.values()]
}

export type LoadedPresence = {
  scope: PresenceScope | null
  runs: StoredRun[]
  observations: QueryObservation[]
  /** Observations from the window immediately before, for period comparison. */
  previousObservations: QueryObservation[]
  competitorHosts: string[]
  /** Every non-target domain cited, so the UI can offer them for marking. */
  citedDomains: Array<{ domain: string; count: number }>
}

function toStoredRun(r: {
  id: string; brand: string; domain: string | null; aliases: string; promptSource: string
  promptCount: number; totalMentions: number; totalCitations: number; answersFound: number
  lookupsFailed: number; createdAt: Date; detail: string
}): StoredRun {
  let aliases: string[] = []
  try {
    const parsed = JSON.parse(r.aliases)
    if (Array.isArray(parsed)) aliases = parsed.filter((a): a is string => typeof a === 'string')
  } catch {
    // A malformed aliases blob costs alias matching, not the whole run.
  }
  return { ...r, aliases, outcomes: parseOutcomes(r.detail) }
}

/**
 * Everything a dashboard request needs, for one brand and one window.
 *
 * `days` defines the current window; the same length immediately before it is loaded as the
 * comparison period. Loading both here rather than in each endpoint means the two windows
 * cannot drift apart between the score and the change indicators beside it.
 */
export async function loadPresence(
  userId: string,
  opts: { brand?: string | null; days?: number } = {}
): Promise<LoadedPresence> {
  const scopes = await listScopes(userId)
  const scope = opts.brand
    ? scopes.find(s => s.brand === opts.brand) ?? null
    : scopes[0] ?? null

  if (!scope) {
    return { scope: null, runs: [], observations: [], previousObservations: [], competitorHosts: [], citedDomains: [] }
  }

  const days = opts.days ?? 30
  const now = Date.now()
  const windowStart = new Date(now - days * 864e5)
  const previousStart = new Date(now - 2 * days * 864e5)

  const [rows, competitors] = await Promise.all([
    prisma.aiVisibilityRun.findMany({
      where: { userId, brand: scope.brand, createdAt: { gte: previousStart } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aiPresenceCompetitor.findMany({
      where: { userId, brand: scope.brand },
      select: { competitorDomain: true },
    }),
  ])

  const current = rows.filter(r => r.createdAt >= windowStart).map(toStoredRun)
  const previous = rows.filter(r => r.createdAt < windowStart).map(toStoredRun)

  const observations = observationsFrom(current)

  // Offered for marking, not presented as competitors. The target's own domain is excluded
  // because being cited yourself is the opposite of a rival being cited instead of you.
  const counts = new Map<string, number>()
  for (const o of observations) {
    if (!o.answerPresent) continue
    for (const d of o.citedDomains) {
      const host = toHost(d)
      if (!host || host === scope.host) continue
      counts.set(host, (counts.get(host) ?? 0) + 1)
    }
  }

  return {
    scope,
    runs: current,
    observations,
    previousObservations: observationsFrom(previous),
    competitorHosts: competitors.map(c => c.competitorDomain),
    citedDomains: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count })),
  }
}
