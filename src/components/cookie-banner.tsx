'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const grad = 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 45%, #4DEEFF 100%)'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true)
    } catch {
      // Storage unavailable: show the banner rather than silently assuming consent.
      setVisible(true)
    }
  }, [])

  /**
   * Records the choice and announces it.
   *
   * The event is the half that was missing: this banner wrote `cookie_consent` and nothing
   * read it, so Accept and Decline did the same thing. Consent-gated tags listen for this so
   * accepting starts them on the spot -- otherwise the first session after consent, the one
   * where someone is deciding whether to sign up, is the one never recorded.
   *
   * Wrapped because localStorage throws in private mode and on blocked site data, where the
   * banner must still dismiss rather than trap the visitor behind a dead button.
   */
  function choose(value: 'accepted' | 'declined') {
    try {
      localStorage.setItem('cookie_consent', value)
    } catch {
      // Nothing to persist to; the choice still applies to this page view.
    }
    window.dispatchEvent(new Event('cookie-consent-change'))
    setVisible(false)
  }

  const accept = () => choose('accepted')
  const decline = () => choose('declined')

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 40px)', maxWidth: 600,
      background: '#fff', border: '1px solid #E8EBF0', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(11,17,32,0.12)',
      padding: '18px 20px', fontFamily: sans,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#4B5563' }}>
        We use cookies for authentication and analytics to improve your experience. See our{' '}
        <Link href="/privacy" style={{ color: '#0000FF', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={decline}
          style={{
            padding: '0 18px', height: 38, borderRadius: 10, cursor: 'pointer',
            fontFamily: sans, fontSize: 13, fontWeight: 600,
            background: '#fff', color: '#6B7280',
            border: '1px solid #E8EBF0',
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: '0 18px', height: 38, borderRadius: 10, cursor: 'pointer',
            fontFamily: sans, fontSize: 13, fontWeight: 600,
            background: grad, color: '#fff', border: 'none',
            boxShadow: '0 4px 12px -4px rgba(0,0,255,0.4)',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
