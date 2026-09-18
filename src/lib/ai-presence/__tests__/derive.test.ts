import { describe, expect, it } from 'vitest'
import type { PromptOutcome } from '@/lib/ai-visibility'
import {
  authorityShare,
  citationGaps,
  citationMetrics,
  observationsFrom,
  parseOutcomes,
  queryCoverage,
  toHost,
  topQueries,
  visibilityRate,
  type QueryObservation,
  type StoredRun,
} from '../derive'

const AT = new Date('2026-09-01T00:00:00Z')

function obs(over: Partial<QueryObservation> = {}): QueryObservation {
  return {
    runId: 'run1',
    query: 'best seo tools',
    provider: 'AI Overviews',
    answerPresent: true,
    mentions: 0,
    cited: false,
    citedDomains: [],
    citedUrls: null,
    observedAt: AT,
    sourceType: 'OBSERVED',
    ...over,
  }
}

function run(outcomes: PromptOutcome[], over: Partial<StoredRun> = {}): StoredRun {
  return {
    id: 'run1',
    brand: 'Optmizly',
    domain: 'optmizly.com',
    aliases: [],
    promptSource: 'keywords',
    promptCount: outcomes.length,
    totalMentions: 0,
    totalCitations: 0,
    answersFound: 0,
    lookupsFailed: 0,
    createdAt: AT,
    outcomes,
    ...over,
  }
}

describe('toHost', () => {
  it('reduces any stored form of a domain to the bare lowercase host', () => {
    expect(toHost('https://WWW.Example.com/pricing')).toBe('example.com')
    expect(toHost('example.com')).toBe('example.com')
  })

  it('returns null for nothing rather than an empty string that would match', () => {
    expect(toHost(null)).toBeNull()
    expect(toHost('')).toBeNull()
  })
})

describe('parseOutcomes', () => {
  it('degrades an unreadable blob to no observations instead of throwing', () => {
    // One bad row must not take the dashboard down for every other run the customer has.
    expect(parseOutcomes('not json')).toEqual([])
    expect(parseOutcomes('{"outcomes":"nope"}')).toEqual([])
    expect(parseOutcomes('{}')).toEqual([])
  })

  it('drops entries that are not shaped like an outcome', () => {
    const parsed = parseOutcomes(JSON.stringify({ outcomes: [{ prompt: 'a' }, null, { nope: 1 }] }))
    expect(parsed).toHaveLength(1)
    expect(parsed[0].prompt).toBe('a')
  })
})

describe('observationsFrom', () => {
  it('skips a failed lookup rather than scoring it as a miss', () => {
    // null is "we never got an answer to read", which is neither a hit nor a miss.
    expect(observationsFrom([run([{ prompt: 'q', aiOverview: null, aiMode: null }])])).toEqual([])
  })

  it('emits one observation per surface that answered', () => {
    const surface = { answerPresent: true, mentions: 1, cited: false, citedDomains: [] }
    const o = observationsFrom([run([{ prompt: 'q', aiOverview: surface, aiMode: surface }])])
    expect(o.map(x => x.provider)).toEqual(['AI Overviews', 'AI Mode'])
  })

  it('keeps "URLs not captured" distinct from "cited nothing"', () => {
    const [noUrls] = observationsFrom([
      run([
        {
          prompt: 'q',
          aiOverview: { answerPresent: true, mentions: 0, cited: false, citedDomains: ['a.com'] },
          aiMode: null,
        },
      ]),
    ])
    const [emptyUrls] = observationsFrom([
      run([
        {
          prompt: 'q',
          aiOverview: { answerPresent: true, mentions: 0, cited: false, citedDomains: [], citedUrls: [] },
          aiMode: null,
        },
      ]),
    ])
    expect(noUrls.citedUrls).toBeNull()
    expect(emptyUrls.citedUrls).toEqual([])
  })
})

describe('citationMetrics', () => {
  it('uses answers that existed as the denominator, not prompts attempted', () => {
    const m = citationMetrics(
      [obs({ cited: true }), obs({ cited: false }), obs({ answerPresent: false })],
      'optmizly.com'
    )
    expect(m).toMatchObject({ citationCount: 1, opportunities: 2, citationRate: 0.5 })
  })

  it('returns a null rate rather than zero when nothing answered', () => {
    expect(citationMetrics([obs({ answerPresent: false })], 'optmizly.com').citationRate).toBeNull()
  })

  it('counts only the target domain among the cited pages', () => {
    const m = citationMetrics(
      [
        obs({
          cited: true,
          citedUrls: [
            { domain: 'optmizly.com', url: 'https://optmizly.com/a', title: 'A' },
            { domain: 'rival.com', url: 'https://rival.com/b', title: 'B' },
          ],
        }),
        obs({
          cited: true,
          citedUrls: [{ domain: 'www.optmizly.com', url: 'https://optmizly.com/a', title: 'A' }],
        }),
      ],
      'optmizly.com'
    )
    expect(m.citedPages).toEqual([{ url: 'https://optmizly.com/a', title: 'A', count: 2 }])
    expect(m.pagesUnavailable).toBe(false)
  })

  it('flags pages as unavailable when no run in range captured URLs', () => {
    // Otherwise an older scan reads as a total failure to be cited at page level.
    const m = citationMetrics([obs({ cited: true, citedUrls: null })], 'optmizly.com')
    expect(m.pagesUnavailable).toBe(true)
    expect(m.citedPages).toEqual([])
  })
})

describe('authorityShare', () => {
  it('divides the target citations by every citation in the same answer set', () => {
    const a = authorityShare(
      [obs({ citedDomains: ['optmizly.com', 'rival.com', 'wikipedia.org'] })],
      'optmizly.com'
    )
    expect(a).toMatchObject({ targetCitations: 1, totalCitations: 3 })
    expect(a.share).toBeCloseTo(1 / 3)
  })

  it('leaves the target out of the other-domains list', () => {
    const a = authorityShare([obs({ citedDomains: ['optmizly.com', 'rival.com'] })], 'optmizly.com')
    expect(a.topDomains.map(d => d.domain)).toEqual(['rival.com'])
  })

  it('returns a null share when nothing was cited at all', () => {
    expect(authorityShare([obs({})], 'optmizly.com').share).toBeNull()
  })
})

describe('citationGaps', () => {
  const cited = obs({ citedDomains: ['rival.com', 'wikipedia.org'] })

  it('yields nothing when no competitor has been marked', () => {
    // The honest result: an unmarked cited domain is a source, not a rival.
    expect(citationGaps([cited], 'optmizly.com', [])).toEqual([])
  })

  it('reports a gap only for a domain the user marked', () => {
    const gaps = citationGaps([cited], 'optmizly.com', ['rival.com'])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({ competitorDomain: 'rival.com', targetCited: false })
  })

  it('is not a gap when the target was cited in the same answer', () => {
    const both = obs({ cited: true, citedDomains: ['optmizly.com', 'rival.com'] })
    expect(citationGaps([both], 'optmizly.com', ['rival.com'])).toEqual([])
  })

  it('ignores an answer that does not exist', () => {
    const none = obs({ answerPresent: false, citedDomains: ['rival.com'] })
    expect(citationGaps([none], 'optmizly.com', ['rival.com'])).toEqual([])
  })

  it('carries the rival page through when the run captured URLs', () => {
    const withUrl = obs({
      citedDomains: ['rival.com'],
      citedUrls: [{ domain: 'rival.com', url: 'https://rival.com/guide', title: 'Guide' }],
    })
    const [gap] = citationGaps([withUrl], 'optmizly.com', ['rival.com'])
    expect(gap.competitorUrl).toBe('https://rival.com/guide')
    expect(gap.competitorTitle).toBe('Guide')
  })

  it('leaves the page null on a run that predates URL capture', () => {
    const [gap] = citationGaps([cited], 'optmizly.com', ['rival.com'])
    expect(gap.competitorUrl).toBeNull()
  })

  it('normalises a marked domain typed with scheme or www', () => {
    const [gap] = citationGaps([cited], 'optmizly.com', ['https://www.rival.com/'])
    expect(gap.competitorDomain).toBe('rival.com')
  })
})

describe('visibilityRate and queryCoverage', () => {
  it('counts an answer as visible when the brand is named at all', () => {
    const v = visibilityRate([obs({ mentions: 3 }), obs({ mentions: 0 }), obs({ answerPresent: false })])
    expect(v).toEqual({ named: 1, answers: 2, rate: 0.5 })
  })

  it('measures coverage against every prompt that reached an engine', () => {
    expect(queryCoverage([obs({}), obs({ answerPresent: false })])).toEqual({
      answered: 1,
      attempted: 2,
      rate: 0.5,
    })
  })

  it('returns null rather than zero when there is nothing to divide', () => {
    expect(visibilityRate([]).rate).toBeNull()
    expect(queryCoverage([]).rate).toBeNull()
  })
})

describe('topQueries', () => {
  it('groups both surfaces of a query into one row', () => {
    const rows = topQueries(
      [obs({ mentions: 1, cited: true }), obs({ provider: 'AI Mode', mentions: 2 })],
      'Optmizly',
      []
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ answers: 2, mentions: 3, citations: 1, visibility: 1 })
  })

  it('opens on the queries that are working', () => {
    const rows = topQueries(
      [obs({ query: 'quiet', mentions: 1 }), obs({ query: 'winning', cited: true, mentions: 1 })],
      'Optmizly',
      []
    )
    expect(rows.map(r => r.query)).toEqual(['winning', 'quiet'])
  })

  it('invents no queries that were never run', () => {
    expect(topQueries([], 'Optmizly', [])).toEqual([])
  })
})
