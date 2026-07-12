'use client'

import { useState } from 'react'
import posthog from 'posthog-js'

const T = {
  sans: "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  blue: '#0000FF',
  blueSoft: '#EEF1FF',
  blueBorder: '#CBD4FF',
  ink: '#0B1120',
  body: '#4B5563',
  muted: '#8A93A3',
  line2: '#F0F2F6',
  good: '#10B981',
  goodSoft: '#ECFDF5',
}

export function HomeEmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const r = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (r.ok) {
        posthog.capture('blog_subscribed', { location: 'homepage', has_first_name: false })
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section style={{ borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}`, background: T.blueSoft }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(48px, 8vw, 80px) clamp(20px, 4vw, 32px)', textAlign: 'center' }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.blue, margin: '0 0 14px' }}>
          Free newsletter
        </p>
        <h2 style={{ fontFamily: T.sans, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, letterSpacing: -1, lineHeight: 1.1, color: T.ink, margin: '0 0 12px' }}>
          Weekly SEO insights, straight to your inbox
        </h2>
        <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: '0 0 32px', lineHeight: 1.5 }}>
          Practical tips on content optimisation, E-E-A-T, and AI search. No fluff, one email a week.
        </p>

        {status === 'success' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.goodSoft, border: `1px solid ${T.good}`, borderRadius: 14, padding: '14px 24px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={T.good} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,9 7,13 15,5"/>
            </svg>
            <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.good }}>You're in! Check your inbox.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              style={{
                flex: '1 1 220px', minWidth: 0,
                fontFamily: T.sans, fontSize: 15,
                padding: '0 16px', height: 48,
                borderRadius: 12, border: `1.5px solid ${T.blueBorder}`,
                background: '#fff', color: T.ink,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              style={{
                flexShrink: 0, height: 48, padding: '0 24px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 15, fontWeight: 600,
                background: T.blue, color: '#fff',
                opacity: (status === 'loading' || !email) ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe free'}
            </button>
            {status === 'error' && (
              <p style={{ width: '100%', margin: 0, fontFamily: T.sans, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                Something went wrong. Please try again.
              </p>
            )}
            <p style={{ width: '100%', margin: '6px 0 0', fontFamily: T.sans, fontSize: 12, color: T.muted }}>
              No spam. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
