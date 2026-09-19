import { describe, expect, it } from 'vitest'
import { capSurface } from '@/lib/ai-visibility'

/**
 * The rebuilder that runs on every stored scan.
 *
 * It silently dropped `citedUrls` for the whole life of the field: it is optional on
 * `SurfaceOutcome`, so leaving it out of a rebuilt object is valid TypeScript and nothing —
 * not tsc, not lint, not a passing build, not a green live scan — reported anything. The UI
 * just said the URLs were never captured, on every run, forever. These tests exist so that
 * cannot happen quietly a second time.
 */
describe('capSurface', () => {
  const surface = {
    answerPresent: true,
    mentions: 2,
    cited: true,
    citedDomains: ['semrush.com', 'ahrefs.com'],
    citedUrls: [
      { domain: 'semrush.com', url: 'https://semrush.com/blog/backlink-audit', title: 'Backlink Audit' },
    ],
  }

  it('carries cited URLs through to storage', () => {
    expect(capSurface(surface)?.citedUrls).toEqual([
      { domain: 'semrush.com', url: 'https://semrush.com/blog/backlink-audit', title: 'Backlink Audit' },
    ])
  })

  it('keeps an empty array distinct from a run that never recorded pages', () => {
    // [] means "recorded, cited nothing"; absent means "this run captured no URLs at all".
    // Defaulting the missing case to [] would assert the stronger claim on every old run.
    expect(capSurface({ ...surface, citedUrls: [] })?.citedUrls).toEqual([])
    expect(capSurface({ answerPresent: true, mentions: 0, cited: false, citedDomains: [] }))
      .not.toHaveProperty('citedUrls')
  })

  it('drops malformed entries rather than storing junk', () => {
    const result = capSurface({
      ...surface,
      citedUrls: [
        null,
        'nope',
        { domain: 'a.com' },
        { url: 'https://b.com' },
        { domain: 'c.com', url: 'https://c.com/x', title: 'C' },
      ],
    })
    expect(result?.citedUrls).toEqual([{ domain: 'c.com', url: 'https://c.com/x', title: 'C' }])
  })

  it('defaults a missing title rather than rejecting the citation', () => {
    const result = capSurface({ ...surface, citedUrls: [{ domain: 'a.com', url: 'https://a.com/p' }] })
    expect(result?.citedUrls).toEqual([{ domain: 'a.com', url: 'https://a.com/p', title: '' }])
  })

  it('caps the list, because this payload comes from the client', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      domain: `d${i}.com`, url: `https://d${i}.com/p`, title: `T${i}`,
    }))
    expect(capSurface({ ...surface, citedUrls: many })?.citedUrls).toHaveLength(30)
  })

  it('truncates a hostile url and title instead of storing them whole', () => {
    const result = capSurface({
      ...surface,
      citedUrls: [{ domain: 'a.com', url: 'https://a.com/' + 'x'.repeat(5000), title: 'y'.repeat(5000) }],
    })
    expect(result!.citedUrls![0].url.length).toBe(2048)
    expect(result!.citedUrls![0].title.length).toBe(300)
  })

  it('still rebuilds the fields it always did', () => {
    const result = capSurface({ ...surface, mentions: 9999 })
    expect(result).toMatchObject({ answerPresent: true, mentions: 500, cited: true })
    expect(result?.citedDomains).toEqual(['semrush.com', 'ahrefs.com'])
  })

  it('treats an unreadable surface as a failed lookup, not an empty answer', () => {
    // null and "no answer" mean different things downstream and must not collapse.
    expect(capSurface(null)).toBeNull()
    expect(capSurface({ mentions: 1 })).toBeNull()
  })
})
