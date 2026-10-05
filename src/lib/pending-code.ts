/**
 * Carries a discount code across signup.
 *
 * The code is the one thing a launch link gives a visitor, and the only field that accepts it
 * sits inside the signed-in checkout. Without this, someone who follows
 * optmizly.com/pricing?code=PRODUCTHUNT reads the offer, creates an account, lands back on a
 * pricing page that has forgotten it, and has to remember a word they saw two screens ago.
 *
 * Sibling of pending-audit.ts, which solves the same problem for the free audit, and written
 * the same way: store the least that resumes the journey, validate it on the way in and on the
 * way out, and fail quiet when storage is unavailable.
 */

const KEY = 'optmizly_pending_code'

/** Long enough to survive signup, an email confirmation and a night's sleep; short enough that
 *  a code from a campaign that has since ended does not resurface months later. */
export const PENDING_CODE_WINDOW_HOURS = 72

export type PendingCode = { code: string; at: number }

/**
 * Dodo codes are up to 16 characters. Accepting only that shape keeps anything else out of a
 * value this app later types into a checkout request — the string arrives from a query
 * parameter, which is to say from a stranger.
 */
export function isPlausibleCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9][A-Z0-9_-]{2,15}$/.test(value)
}

export function savePendingCode(code: string): void {
  if (!isPlausibleCode(code)) return
  try {
    const payload: PendingCode = { code, at: Date.now() }
    window.localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // Private window, or storage blocked. The code is still on screen and still typeable.
  }
}

/** The stored code, or null when there is none, it is malformed, or it has aged out. */
export function readPendingCode(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingCode
    if (!isPlausibleCode(parsed?.code) || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > PENDING_CODE_WINDOW_HOURS * 60 * 60 * 1000) {
      clearPendingCode()
      return null
    }
    return parsed.code
  } catch {
    return null
  }
}

export function clearPendingCode(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
