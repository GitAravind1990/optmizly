import { describe, expect, it } from 'vitest'
import { ALL_TOOLS, TOOL_GROUPS, isToolUnlocked } from '../tools'

/**
 * The tool counts in CLAUDE.md and in every piece of upsell copy are cumulative by tier:
 * Free 2, Starter and Pro 12 (identical sets, differing only in allowance), Agency and
 * Agency Plus 24. Those numbers are typed into /login, /signup, the upgrade modal, the
 * welcome banner, both auth pages and the pricing FAQ, and they have drifted from this
 * array three times — most recently for two weeks, in the homepage metadata.
 *
 * This is the guard the copy sweep never had: if a tool is added, removed or regated, the
 * count assertions below fail with the new number, which is the reminder to sweep.
 */
const PER_PLAN: Array<[string, number]> = [
  ['FREE', 2],
  ['STARTER', 12],
  ['PRO', 12],
  ['AGENCY', 24],
  ['AGENCY_PLUS', 24],
]

describe('tool gating', () => {
  it.each(PER_PLAN)('%s sees %i tools', (plan, expected) => {
    expect(ALL_TOOLS.filter(t => isToolUnlocked(t.minPlan, plan)).length).toBe(expected)
  })

  it('Starter and Pro see the identical set, not merely the same count', () => {
    const forPlan = (p: string) => ALL_TOOLS.filter(t => isToolUnlocked(t.minPlan, p)).map(t => t.id)
    expect(forPlan('STARTER')).toEqual(forPlan('PRO'))
    expect(forPlan('AGENCY_PLUS')).toEqual(forPlan('AGENCY'))
  })

  it('denies an unknown plan rather than granting it', () => {
    expect(isToolUnlocked('PRO', 'ENTERPRISE')).toBe(false)
    expect(isToolUnlocked('SOMETHING_NEW', 'AGENCY')).toBe(false)
  })

  it('gives every tool a unique id, href and label', () => {
    for (const key of ['id', 'href', 'label'] as const) {
      const values = ALL_TOOLS.map(t => t[key])
      const dupes = values.filter((v, i) => values.indexOf(v) !== i)
      expect(dupes, `duplicate ${key}`).toEqual([])
    }
  })

  /**
   * Two tools were both titled "Local SEO Suite" until 2026-09-28 — distinct labels, but
   * `local` was labelled "Local SEO" in the sidebar while its own page header read "Local
   * SEO Suite", so /pricing sold one tool's name with the other's credit cost. Labels that
   * differ only by a suffix word are the same bug as labels that match.
   */
  it('has no label that is a prefix of another label', () => {
    const labels = ALL_TOOLS.map(t => t.label)
    const overlaps = labels.flatMap(a =>
      labels.filter(b => b !== a && b.startsWith(`${a} `)).map(b => `${a} / ${b}`)
    )
    expect(overlaps).toEqual([])
  })

  it('groups tools by the tier that unlocks them', () => {
    for (const group of TOOL_GROUPS) {
      const expected = group.label === 'Free' ? 'FREE' : group.label === 'Pro' ? 'PRO' : 'AGENCY'
      expect(group.tools.map(t => t.minPlan)).toEqual(group.tools.map(() => expected))
    }
  })
})
