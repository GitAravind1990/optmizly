'use client'

/**
 * The Founding Member offer, as a modal — shown after someone has had something from us, not
 * on arrival.
 *
 * Five rules it obeys, because a popup is the easiest thing on a site to make hostile:
 *
 * 1. **It fires after the free audit completes**, or after a long dwell on pages without one.
 *    The section it interrupts promises "no account, no card"; interrupting that promise with
 *    a $490 ask before the visitor has seen a result would undo the one thing this site does
 *    better than its competitors.
 * 2. **Signed-out only.** A customer does not need selling to, and a signed-in free user is
 *    better reached by the upgrade surfaces that already know their plan.
 * 3. **It states what the offer actually applies to.** FOUNDING50 is accepted on Agency annual
 *    and Agency Plus annual only — `isCouponEligibleProduct` enforces exactly that — so the
 *    modal says "annual Agency plans" rather than implying a discount on the $9 tier.
 * 4. **It never invents a number.** Places remaining come from /api/founding-spots, which reads
 *    Dodo's own redemption count; if that endpoint is unconfigured, errors, or reports the
 *    offer gone, the modal does not render at all. There is no hardcoded "3 left".
 * 5. **Once dismissed, it stays dismissed.** localStorage, and a failure to read it means no
 *    modal rather than a second one.
 *
 * Deliberately not shown on /pricing, where the same offer is already on the plan cards with
 * its real terms beside it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { T } from './marketing/tokens'
import { AUDIT_COMPLETE_EVENT } from '@/lib/events'

const DISMISS_KEY = 'optmizly_founding_popup_dismissed'

/** For pages with no audit on them. Long enough to be past a bounce. */
const FALLBACK_DELAY_MS = 75_000

type Spots = { configured: boolean; remaining: number | null; limit: number | null; soldOut: boolean }

export function FoundingPopup({ location = 'homepage' }: { location?: string }) {
  const [spots, setSpots] = useState<Spots | null>(null)
  const [open, setOpen] = useState(false)
  // Set by the audit event or the dwell timer; independent of whether places are known yet.
  const [triggered, setTriggered] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const shownRef = useRef(false)

  // Already dismissed, or storage unreadable (private window, blocked cookies): stay quiet.
  const dismissed = () => {
    try {
      return localStorage.getItem(DISMISS_KEY) !== null
    } catch {
      return true
    }
  }

  // useCallback so the Escape handler can depend on it rather than closing over a stale one.
  // Stale closures in effects have bitten this codebase before.
  const close = useCallback((how: string) => {
    setOpen(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* nothing to do */ }
    posthog.capture('founding_popup_dismissed', { location, how })
  }, [location])

  useEffect(() => {
    if (dismissed()) return
    let alive = true
    fetch('/api/founding-spots')
      .then(r => r.json())
      .then(j => {
        const data: Spots = j?.data ?? j
        // No offer, no places, or no answer — all three mean no modal.
        if (!alive || !data?.configured || data.soldOut) return
        if (data.remaining !== null && data.remaining <= 0) return
        setSpots(data)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  /**
   * The trigger is recorded on mount, not once the places are known.
   *
   * Gating the listener on `spots` loses the event outright when the audit finishes before
   * /api/founding-spots answers — the listener is not attached yet, the event does not queue,
   * and the modal then waits 75 seconds for a fallback that the visitor has usually outlived.
   * Caught by the behaviour check, which dispatched the event two seconds into a cold dev
   * server and saw nothing. Trigger and eligibility are now independent, and the modal opens
   * when both are true.
   */
  useEffect(() => {
    if (dismissed()) return
    const trigger = () => setTriggered(true)
    window.addEventListener(AUDIT_COMPLETE_EVENT, trigger)
    const timer = window.setTimeout(trigger, FALLBACK_DELAY_MS)
    return () => {
      window.removeEventListener(AUDIT_COMPLETE_EVENT, trigger)
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!triggered || !spots || shownRef.current || dismissed()) return
    shownRef.current = true
    setOpen(true)
    posthog.capture('founding_popup_shown', { location, remaining: spots.remaining })
  }, [triggered, spots, location])

  // Escape closes it, and focus moves to the close button — a modal you cannot leave by
  // keyboard is a trap, and this one is unsolicited.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close('escape') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])


  if (!open || !spots) return null

  const places =
    spots.remaining !== null && spots.limit !== null
      ? `${spots.remaining} of ${spots.limit} places left`
      : 'Limited places'

  return (
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) close('backdrop') }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(11,17,32,0.55)', backdropFilter: 'blur(2px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="founding-title"
        style={{
          width: '100%', maxWidth: 460, background: T.bg, borderRadius: 18,
          border: `1px solid ${T.line}`, padding: '28px 26px 24px',
          boxShadow: '0 30px 70px rgba(11,17,32,0.30)', position: 'relative',
          fontFamily: T.sans,
        }}
      >
        <button
          ref={closeRef}
          onClick={() => close('close-button')}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32,
            borderRadius: 9, border: 'none', background: 'transparent',
            color: T.body, fontSize: 20, lineHeight: 1, cursor: 'pointer',
          }}
        >
          ×
        </button>

        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          textTransform: 'uppercase', color: T.blue, background: T.blueSoft,
          borderRadius: 999, padding: '4px 10px', marginBottom: 14,
        }}>
          {places}
        </div>

        <h2 id="founding-title" style={{
          fontSize: 23, lineHeight: 1.2, letterSpacing: -0.6, fontWeight: 700,
          color: T.ink, margin: '0 0 10px',
        }}>
          Founding Member pricing
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.55, color: T.body, margin: '0 0 8px' }}>
          Twenty places, shared across the two annual Agency plans. They carry the
          Founding&nbsp;Member rate for as long as the subscription stays active.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: T.body, margin: '0 0 20px' }}>
          It applies to <strong>annual Agency and Agency&nbsp;Plus</strong> — not the monthly or
          the smaller plans. The exact terms are on the pricing page, beside the plan.
        </p>

        <Link
          href="/pricing"
          onClick={() => posthog.capture('founding_popup_cta', { location, remaining: spots.remaining })}
          style={{
            display: 'block', textAlign: 'center', background: T.blue, color: '#fff',
            fontSize: 15, fontWeight: 700, padding: '12px 16px', borderRadius: 11,
            textDecoration: 'none',
          }}
        >
          See what it includes →
        </Link>

        <button
          onClick={() => close('no-thanks')}
          style={{
            display: 'block', width: '100%', marginTop: 10, padding: '9px 0',
            background: 'none', border: 'none', color: T.muted,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
