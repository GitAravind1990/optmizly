import { describe, expect, it } from 'vitest'
import { contentOpportunities } from '../opportunities'
import type { CitationGap, QueryObservation } from '../derive'

const AT = new Date('2026-09-01T00:00:00Z')

function gap(over: Partial<CitationGap> = {}): CitationGap {
  return {
    query: 'best seo tools',
    provider: 'AI Overviews',
    competitorDomain: 'rival.com',
    competitorUrl: null,
    competitorTitle: null,
    targetCited: false,
    observedAt: AT,
    runId: 'run1',
    sourceType: 'OBSERVED',
    ...over,
  }
}

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

describe('contentOpportunities', () => {
  it('suggests nothing when there is no evidence, rather than filling a quota', () => {
    // No floor of "always show at least N", which is how generic filler gets in.
    expect(contentOpportunities([], [obs()], 'Optmizly', [])).toEqual([])
  })

  it('collapses several gaps on one query into one thing to act on', () => {
    const gaps = [gap({ provider: 'AI Overviews' }), gap({ provider: 'AI Mode', competitorDomain: 'other.com' })]
    const [opp] = contentOpportunities(gaps, [obs()], 'Optmizly', [])
    expect(opp.competitorCitationCount).toBe(2)
    expect(opp.competitors.sort()).toEqual(['other.com', 'rival.com'])
    expect(opp.evidence).toHaveLength(2)
  })

  it('names the rivals in the recommendation and asks rather than asserts', () => {
    const [opp] = contentOpportunities([gap()], [obs()], 'Optmizly', [])
    expect(opp.recommendation).toContain('rival.com')
    expect(opp.recommendation).toMatch(/review whether/i)
  })

  it('counts the target citations for the query instead of assuming zero', () => {
    // Cited on the other surface means a weaker opportunity, and the number should say so.
    const observations = [obs({ provider: 'AI Mode', cited: true }), obs()]
    const [opp] = contentOpportunities([gap()], observations, 'Optmizly', [])
    expect(opp.targetCitationCount).toBe(1)
  })

  it('ranks a repeated loss on a winnable query highest', () => {
    const repeated = [gap(), gap(), gap()]
    const [opp] = contentOpportunities(repeated, [obs()], 'Optmizly', [])
    expect(opp.queryType).toBe('CATEGORY')
    expect(opp.priority).toBe('HIGH')
  })

  it('separates worth acting on from sure it is real', () => {
    // Priority turns HIGH at three sightings, confidence at four. They answer different
    // questions, so they are allowed to disagree: three losses are worth looking at while
    // still being a thin base to call settled.
    const three = contentOpportunities([gap(), gap(), gap()], [obs()], 'Optmizly', [])
    expect(three[0]).toMatchObject({ priority: 'HIGH', confidence: 'MEDIUM' })

    const four = contentOpportunities([gap(), gap(), gap(), gap()], [obs()], 'Optmizly', [])
    expect(four[0]).toMatchObject({ priority: 'HIGH', confidence: 'HIGH' })
  })

  it('does not call a one-off citation on a branded query a priority', () => {
    const branded = gap({ query: 'Optmizly reviews' })
    const [opp] = contentOpportunities([branded], [obs({ query: 'Optmizly reviews' })], 'Optmizly', [])
    expect(opp.queryType).toBe('BRANDED')
    expect(opp.priority).toBe('LOW')
    expect(opp.confidence).toBe('LOW')
  })

  it('sorts higher priorities before lower ones', () => {
    const gaps = [
      gap({ query: 'Optmizly reviews' }),
      gap({ query: 'best seo tools' }),
      gap({ query: 'best seo tools' }),
      gap({ query: 'best seo tools' }),
    ]
    const ranked = contentOpportunities(gaps, [obs()], 'Optmizly', [])
    expect(ranked.map(o => o.priority)).toEqual(['HIGH', 'LOW'])
  })

  it('carries the rival pages through when the runs captured URLs', () => {
    const withUrl = gap({ competitorUrl: 'https://rival.com/guide', competitorTitle: 'Guide' })
    const [opp] = contentOpportunities([withUrl], [obs()], 'Optmizly', [])
    expect(opp.competitorUrls).toEqual([
      { domain: 'rival.com', url: 'https://rival.com/guide', title: 'Guide' },
    ])
  })

  it('omits a rival page entirely on runs that predate URL capture', () => {
    const [opp] = contentOpportunities([gap()], [obs()], 'Optmizly', [])
    expect(opp.competitorUrls).toEqual([])
  })
})
