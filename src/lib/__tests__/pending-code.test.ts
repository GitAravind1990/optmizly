import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PENDING_CODE_WINDOW_HOURS,
  clearPendingCode,
  isPlausibleCode,
  readPendingCode,
  savePendingCode,
} from '../pending-code'

/**
 * The discount code travels from a query string — which is to say from a stranger — into
 * localStorage, and from there into a checkout request. Every step of that is covered here,
 * because the one step that is not coverable is the one at the end: the field only renders for
 * a signed-in user, and this environment has no session.
 *
 * The browser half is a stub rather than jsdom: this file is about what the module accepts and
 * rejects, and a Map with the right four methods says that more plainly than a DOM would.
 */
function stubStorage() {
  const map = new Map<string, string>()
  return {
    map,
    api: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v) },
      removeItem: (k: string) => { map.delete(k) },
    },
  }
}

let store: ReturnType<typeof stubStorage>

beforeEach(() => {
  store = stubStorage()
  vi.stubGlobal('window', { localStorage: store.api })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('what counts as a code', () => {
  it('accepts the codes this product actually issues', () => {
    expect(isPlausibleCode('PRODUCTHUNT')).toBe(true)
    expect(isPlausibleCode('FOUNDING50')).toBe(true)
    expect(isPlausibleCode('LAUNCH_24')).toBe(true)
    expect(isPlausibleCode('A-B-C')).toBe(true)
  })

  it('rejects anything that is not one', () => {
    for (const bad of [
      '',                       // nothing
      'ab',                     // too short to be a code anyone issued
      'A'.repeat(17),           // past Dodo's 16-character limit
      'producthunt',            // lowercase: codes are normalised before this point
      '<script>alert(1)</script>',
      'PRODUCT HUNT',           // spaces
      'DROP TABLE users',
      '../../etc/passwd',
      null, undefined, 42, {},
    ]) {
      expect(isPlausibleCode(bad), String(bad)).toBe(false)
    }
  })
})

describe('carrying a code across signup', () => {
  it('stores and returns a real code', () => {
    savePendingCode('PRODUCTHUNT')
    expect(readPendingCode()).toBe('PRODUCTHUNT')
  })

  it('refuses to store a malformed one', () => {
    savePendingCode('<script>alert(1)</script>')
    expect(store.map.size).toBe(0)
    expect(readPendingCode()).toBeNull()
  })

  it('forgets a code once the window has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'))
    savePendingCode('PRODUCTHUNT')
    expect(readPendingCode()).toBe('PRODUCTHUNT')

    vi.setSystemTime(new Date(Date.now() + (PENDING_CODE_WINDOW_HOURS + 1) * 60 * 60 * 1000))
    expect(readPendingCode()).toBeNull()
    // And clears it rather than leaving it to be re-read on every page.
    expect(store.map.size).toBe(0)
  })

  it('ignores a stored value that has been tampered with', () => {
    store.map.set('optmizly_pending_code', JSON.stringify({ code: 'DROP TABLE', at: Date.now() }))
    expect(readPendingCode()).toBeNull()

    store.map.set('optmizly_pending_code', 'not json at all')
    expect(readPendingCode()).toBeNull()

    store.map.set('optmizly_pending_code', JSON.stringify({ code: 'PRODUCTHUNT' }))
    expect(readPendingCode()).toBeNull()   // no timestamp: cannot age it, so do not trust it
  })

  it('clears on request', () => {
    savePendingCode('PRODUCTHUNT')
    clearPendingCode()
    expect(readPendingCode()).toBeNull()
  })

  /**
   * Private windows and blocked cookies throw on access rather than returning null. A discount
   * code is not worth breaking a pricing page over.
   */
  it('stays quiet when storage throws', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('denied') },
        setItem: () => { throw new Error('denied') },
        removeItem: () => { throw new Error('denied') },
      },
    })
    expect(() => savePendingCode('PRODUCTHUNT')).not.toThrow()
    expect(readPendingCode()).toBeNull()
    expect(() => clearPendingCode()).not.toThrow()
  })
})
