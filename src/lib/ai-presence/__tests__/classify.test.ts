import { describe, expect, it } from 'vitest'
import { classifyQuery, mentionsBrand, tallyTypes } from '../classify'

describe('mentionsBrand', () => {
  it('matches a multi-word brand however it is spaced', () => {
    for (const q of ['agency analytics pricing', 'AgencyAnalytics pricing', 'agency-analytics pricing']) {
      expect(mentionsBrand(q, 'Agency Analytics')).toBe(true)
    }
  })

  it('respects word boundaries rather than matching inside a longer word', () => {
    expect(mentionsBrand('optmizlyzer review', 'Optmizly')).toBe(false)
    expect(mentionsBrand('is optmizly any good', 'Optmizly')).toBe(true)
  })

  it('matches aliases as well as the brand', () => {
    expect(mentionsBrand('optmize tools', 'Optmizly', ['Optmize'])).toBe(true)
  })

  it('ignores empty and whitespace-only names instead of matching everything', () => {
    expect(mentionsBrand('anything at all', '', ['  '])).toBe(false)
  })
})

describe('classifyQuery precedence', () => {
  it('counts a branded comparison as branded, not as a comparison', () => {
    // Otherwise the brand's own name disappears from branded coverage on exactly the
    // queries most likely to carry it.
    expect(classifyQuery('Optmizly vs Ahrefs', 'Optmizly').type).toBe('BRANDED')
  })

  it('classifies an unbranded comparison as a comparison', () => {
    expect(classifyQuery('ahrefs versus semrush', 'Optmizly').type).toBe('COMPARISON')
  })

  it('classifies explicit locality wording as local', () => {
    expect(classifyQuery('seo agency near me', 'Optmizly').type).toBe('LOCAL')
  })

  it('reads a capitalised place after a preposition as local, with no gazetteer', () => {
    expect(classifyQuery('seo consultant in Chennai', 'Optmizly').type).toBe('LOCAL')
  })

  it('puts locality ahead of a category superlative', () => {
    // Encoded precedence: the more specific shape wins.
    expect(classifyQuery('best seo agency in Chennai', 'Optmizly').type).toBe('LOCAL')
  })

  it('classifies a superlative with no place as a category query', () => {
    expect(classifyQuery('best seo tools', 'Optmizly').type).toBe('CATEGORY')
  })

  it('falls back to non-branded when no rule fires', () => {
    const c = classifyQuery('how do ai overviews pick sources', 'Optmizly')
    expect(c.type).toBe('NON_BRANDED')
    expect(c.reason).toMatch(/no brand/i)
  })

  it('is always labelled inferred, never observed', () => {
    expect(classifyQuery('best seo tools', 'Optmizly').sourceType).toBe('INFERRED')
  })

  it('returns the same answer for the same query every time', () => {
    // The whole reason this is rules and not a model: a classifier that changes its mind
    // makes a trend unreadable.
    const runs = Array.from({ length: 5 }, () => classifyQuery('best seo tools', 'Optmizly').type)
    expect(new Set(runs).size).toBe(1)
  })
})

describe('tallyTypes', () => {
  it('reports every bucket, including the empty ones', () => {
    const tally = tallyTypes([
      classifyQuery('Optmizly pricing', 'Optmizly'),
      classifyQuery('best seo tools', 'Optmizly'),
    ])
    expect(tally).toEqual({ BRANDED: 1, NON_BRANDED: 0, CATEGORY: 1, LOCAL: 0, COMPARISON: 0 })
  })
})
