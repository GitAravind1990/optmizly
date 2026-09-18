import { describe, expect, it } from 'vitest'
import { MIN_ANSWERS_FOR_SCORE, SCORE_WEIGHTS } from '../config'
import { comparePeriods, computePresenceScore } from '../score'
import type { QueryObservation } from '../derive'

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

/** n answers, all of which name and cite the target. A flawless account. */
function perfect(n: number): QueryObservation[] {
  return Array.from({ length: n }, (_, i) =>
    obs({ query: `q${i}`, mentions: 1, cited: true, citedDomains: ['optmizly.com'] })
  )
}

describe('the data floor', () => {
  it('produces no score at all below the minimum, rather than a number from noise', () => {
    const score = computePresenceScore(perfect(MIN_ANSWERS_FOR_SCORE - 1), 'optmizly.com', 1)
    expect(score.totalScore).toBeNull()
    expect(score.insufficientReason).toContain(String(MIN_ANSWERS_FOR_SCORE))
  })

  it('tells a brand-new account to scan rather than reporting a shortfall', () => {
    const score = computePresenceScore([], 'optmizly.com', 0)
    expect(score.totalScore).toBeNull()
    expect(score.insufficientReason).toBe('No AI visibility scans yet.')
  })

  it('scores once the floor is met', () => {
    expect(computePresenceScore(perfect(MIN_ANSWERS_FOR_SCORE), 'optmizly.com', 1).totalScore).not.toBeNull()
  })
})

describe('components with no data', () => {
  it('excludes discovery and reweights, so a flawless account reaches 100', () => {
    // Scoring an unmeasured component as zero would cap a customer doing everything right
    // at 90 because of a feature that has not been built.
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    expect(score.totalScore).toBe(100)
  })

  it('marks discovery unavailable and says why', () => {
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    const discovery = score.components.find(c => c.key === 'discovery')
    expect(discovery).toMatchObject({ available: false, score: null, effectiveWeight: 0 })
    expect(discovery?.detail).toMatch(/not measured/i)
  })

  it('does not tell the user discovery is something they can connect', () => {
    // This app uses "not connected" for Search Console, which has a real connect flow.
    // Reusing it here would send people hunting for a button that does not exist.
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    const discovery = score.components.find(c => c.key === 'discovery')
    expect(discovery?.detail).not.toMatch(/not connected/i)
  })

  it('carries no weight, so stating it in the model costs no score', () => {
    // The four measured weights are divided by 0.90 whether or not discovery is declared,
    // which is what makes keeping it in SCORE_WEIGHTS honest rather than a thumb on the scale.
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    const measuredWeight = score.components
      .filter(c => c.available)
      .reduce((n, c) => n + c.weight, 0)
    expect(measuredWeight).toBeCloseTo(1 - SCORE_WEIGHTS.discovery)
    expect(score.totalScore).toBe(100)
  })

  it('keeps the effective weights summing to one across what is measurable', () => {
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    const sum = score.components.reduce((n, c) => n + c.effectiveWeight, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('renormalises each weight by the available total, not by one', () => {
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    const available = 1 - SCORE_WEIGHTS.discovery
    const visibility = score.components.find(c => c.key === 'visibility')
    expect(visibility?.effectiveWeight).toBeCloseTo(SCORE_WEIGHTS.visibility / available)
  })

  it('names the excluded components in the explanation', () => {
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    expect(score.explanation.join(' ')).toContain('AI Discovery')
    expect(score.explanation.join(' ')).toMatch(/never counted as zero/i)
  })
})

describe('the arithmetic', () => {
  it('weights the measured components against the numbers it prints', () => {
    // Half the answers name the brand, none cite it, every prompt answered, no citations
    // anywhere so authority has nothing to divide and drops out too.
    const observations = [
      ...Array.from({ length: 5 }, (_, i) => obs({ query: `named${i}`, mentions: 1 })),
      ...Array.from({ length: 5 }, (_, i) => obs({ query: `quiet${i}` })),
    ]
    const score = computePresenceScore(observations, 'optmizly.com', 1)

    const usable = score.components.filter(c => c.available)
    expect(usable.map(c => c.key).sort()).toEqual(['citation', 'coverage', 'visibility'])
    const expected = Math.round(
      usable.reduce((n, c) => n + (c.score as number) * c.effectiveWeight, 0)
    )
    expect(score.totalScore).toBe(expected)
  })

  it('reports the raw counts behind each component', () => {
    const score = computePresenceScore(perfect(10), 'optmizly.com', 1)
    expect(score.components.find(c => c.key === 'visibility')?.detail).toBe(
      '10 of 10 AI answers named the brand'
    )
  })
})

describe('confidence', () => {
  it('rises with the number of answers behind the score', () => {
    expect(computePresenceScore(perfect(5), 'optmizly.com', 1).confidence).toBe('LOW')
    expect(computePresenceScore(perfect(10), 'optmizly.com', 1).confidence).toBe('MEDIUM')
    expect(computePresenceScore(perfect(20), 'optmizly.com', 1).confidence).toBe('HIGH')
  })
})

describe('comparePeriods', () => {
  it('refuses to report a delta against a period that does not exist', () => {
    // "Visibility up 62 points" on a first-ever scan is the most flattering possible lie.
    const changes = comparePeriods(perfect(10), [], 'optmizly.com')
    for (const c of changes) {
      expect(c.delta).toBeNull()
      expect(c.unavailableReason).toMatch(/not enough historical data/i)
    }
  })

  it('computes a delta once both periods have answers', () => {
    const previous = [
      ...Array.from({ length: 5 }, (_, i) => obs({ query: `p${i}`, mentions: 1, cited: true, citedDomains: ['optmizly.com'] })),
      ...Array.from({ length: 5 }, (_, i) => obs({ query: `q${i}` })),
    ]
    const visibility = comparePeriods(perfect(10), previous, 'optmizly.com').find(
      c => c.metric === 'AI Visibility'
    )
    expect(visibility).toMatchObject({ current: 100, previous: 50, delta: 50, unavailableReason: null })
  })

  it('leaves a delta null when one side had no answers at all', () => {
    const silent = [obs({ answerPresent: false })]
    const rate = comparePeriods(perfect(10), silent, 'optmizly.com').find(c => c.metric === 'Citation Rate')
    expect(rate?.delta).toBeNull()
    expect(rate?.unavailableReason).toMatch(/no ai answers/i)
  })
})
