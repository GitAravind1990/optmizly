'use client'

/**
 * The launch offer, as a modal — shown after someone has had something from us, not
 * on arrival.
 *
 * Five rules it obeys, because a popup is the easiest thing on a site to make hostile:
 *
 * 1. **It fires after the free audit completes**, or 30 seconds in for someone who never runs
 *    one.
 *    The section it interrupts promises "no account, no card"; interrupting that promise with
 *    a $490 ask before the visitor has seen a result would undo the one thing this site does
 *    better than its competitors.
 * 2. **Signed-out only.** A customer does not need selling to, and a signed-in free user is
 *    better reached by the upgrade surfaces that already know their plan.
 * 3. **It states what the offer actually applies to**, and names the code. PRODUCTHUNT is
 *    accepted on every paid plan, which is what `isCouponEligibleProduct` enforces. A modal
 *    that advertises a discount without saying what to type is not an offer.
 * 4. **It never invents a number.** Places remaining come from /api/offer-spots, which reads
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
import { OFFER_CODE } from '@/lib/offers'

/** Renamed with the offer: a visitor who dismissed the old Founding Member modal has not
 *  seen this one, and should not be silently opted out of it. */
const DISMISS_KEY = 'optmizly_offer_popup_dismissed'

/**
 * For visitors who never run an audit. Was 75 seconds, which is longer than most of them stay —
 * a launch audience in particular arrives, looks, and leaves well inside it, so the offer was
 * reaching almost nobody who did not run a report.
 */
const FALLBACK_DELAY_MS = 30_000

type Spots = { configured: boolean; remaining: number | null; limit: number | null; soldOut: boolean }

export function OfferPopup({ location = 'homepage' }: { location?: string }) {
  const [spots, setSpots] = useState<Spots | null>(null)
  const [open, setOpen] = useState(false)
  // Set by the audit event or the dwell timer; independent of whether places are known yet.
  const [triggered, setTriggered] = useState(false)
  const [copied, setCopied] = useState(false)
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
    posthog.capture('offer_popup_dismissed', { location, how })
  }, [location])

  useEffect(() => {
    if (dismissed()) return
    let alive = true
    fetch('/api/offer-spots')
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
   * /api/offer-spots answers — the listener is not attached yet, the event does not queue,
   * and the modal then waits out the whole fallback delay instead of opening.
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
    posthog.capture('offer_popup_shown', { location, remaining: spots.remaining })
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
        aria-labelledby="offer-title"
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

        <h2 id="offer-title" style={{
          fontSize: 23, lineHeight: 1.2, letterSpacing: -0.6, fontWeight: 700,
          color: T.ink, margin: '0 0 10px',
        }}>
          30% off, on every plan
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.55, color: T.body, margin: '0 0 8px' }}>
          Our Product&nbsp;Hunt launch offer: <strong>30% off any plan</strong>, monthly or
          annual, for your first three months.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: T.body, margin: '0 0 20px' }}>
          Starter at $6.30 instead of $9, Pro at $13.30 instead of $19. Enter the code at
          checkout — it is on the pricing page under <em>Have a code?</em>
        </p>

        {/* The code itself. A modal that offers a discount and never names it is an
            advertisement, not an offer: the field that takes it is on the pricing page behind
            "Have a code?", and nothing else on the journey tells you what to type. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          border: `1px dashed ${T.blue}`, background: T.blueSoft,
          borderRadius: 12, padding: '10px 12px',
        }}>
          <code style={{
            flex: 1, fontFamily: T.mono, fontSize: 16, fontWeight: 700,
            letterSpacing: 1.4, color: T.blue,
          }}>
            {OFFER_CODE}
          </code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(OFFER_CODE)
                setCopied(true)
                posthog.capture('offer_popup_code_copied', { location })
                window.setTimeout(() => setCopied(false), 2000)
              } catch {
                // Clipboard access can be refused outright; the code is on screen either way,
                // so this stays silent rather than throwing an error at someone mid-offer.
              }
            }}
            style={{
              flex: '0 0 auto', background: T.blue, color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 700,
              fontFamily: T.sans, cursor: 'pointer',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <Link
          href="/pricing"
          onClick={() => posthog.capture('offer_popup_cta', { location, remaining: spots.remaining })}
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
