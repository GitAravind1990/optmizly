'use client'

/**
 * The free AI Search Readiness audit — the one thing on this site that gives before it asks.
 *
 * Used on the homepage and on /tools/ai-search-readiness. No account, no card, nothing
 * stored, and the full result is shown: every category and every recommendation, not a
 * teaser with the useful half behind a signup. The upgrade ask comes after the value, and
 * it is an ask rather than a wall — a visitor who takes the findings and fixes them
 * themselves got what was promised.
 */

import { useState, useRef } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { T, Icon } from './marketing/tokens'

interface Category {
  id: string
  label: string
  blurb: string
  score: number | null
  level: 'strong' | 'moderate' | 'weak' | 'unknown'
  detail: string
}

interface Action {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
  fix: string
}

interface Report {
  url: string
  finalUrl: string
  score: number
  level: 'strong' | 'moderate' | 'weak' | 'unknown'
  categories: Category[]
  actions: Action[]
  limits: string[]
  remaining: number
  dailyLimit: number
}

const SEVERITY_STYLE: Record<Action['severity'], { bg: string; fg: string; label: string }> = {
  critical: { bg: T.badSoft, fg: T.bad, label: 'Critical' },
  high: { bg: T.warnSoft, fg: T.warn, label: 'High' },
  medium: { bg: T.blueSoft, fg: T.blue, label: 'Medium' },
  low: { bg: T.line2, fg: T.muted, label: 'Low' },
}

function levelColor(level: Category['level']): string {
  if (level === 'strong') return T.good
  if (level === 'moderate') return T.warn
  if (level === 'weak') return T.bad
  return T.muted
}

function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const color = score >= 75 ? T.good : score >= 45 ? T.warn : T.bad
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.line2} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: T.sans, fontSize: size * 0.3, fontWeight: 600, letterSpacing: -1.5, color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

export function FreeAudit({ location = 'homepage' }: { location?: string }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [showAll, setShowAll] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  /** Fired once per visitor per mount, the first time they engage with the field at all.
   *  Separate from submission so the drop-off between the two is visible. */
  function handleFocus() {
    if (startedRef.current) return
    startedRef.current = true
    posthog.capture('free_audit_started', { location })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !url.trim()) return

    setLoading(true)
    setError('')
    setReport(null)
    setShowAll(false)
    posthog.capture('free_audit_url_submitted', { location })

    try {
      const res = await fetch('/api/public/ai-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error ?? 'Something went wrong. Please try again.')
        posthog.capture('free_audit_failed', { location, status: res.status })
        return
      }

      const data: Report = json.data
      setReport(data)
      posthog.capture('free_audit_completed', {
        location,
        score: data.score,
        level: data.level,
        action_count: data.actions.length,
      })
      // Results land below the fold on a phone; without this the page looks unchanged.
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch {
      setError('We could not reach the audit service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const visibleActions = report ? (showAll ? report.actions : report.actions.slice(0, 5)) : []

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>
      <style>{`
        .fa-form { display: flex; gap: 10px; }
        /* Flex lives here rather than in the inline style so the mobile override below can
           win — an inline flex:1 outranks any stylesheet rule. */
        .fa-form input { flex: 1 1 auto; min-width: 0; }
        .fa-cats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .fa-head { display: flex; align-items: center; gap: 28px; }
        @keyframes faSpin { to { transform: rotate(360deg); } }
        @media (max-width: 639px) {
          .fa-form { flex-direction: column; }
          /* The input carries flex:1 so it fills the row on desktop. Once the form stacks,
             that flex-basis of 0 applies to HEIGHT instead of width and collapses the field
             to 23px — measured at 390px wide. Releasing it restores the declared height. */
          .fa-form input { flex: none; height: 56px; }
          .fa-form button { flex: none; }
          .fa-cats { grid-template-columns: 1fr; }
          .fa-head { flex-direction: column; text-align: center; gap: 18px; }
        }
      `}</style>

      {/* ── Input ── */}
      <form onSubmit={handleSubmit} className="fa-form">
        <label htmlFor="audit-url" style={{
          position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
        }}>
          Your website address
        </label>
        <input
          id="audit-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onFocus={handleFocus}
          placeholder="yourwebsite.com"
          disabled={loading}
          aria-describedby="audit-help"
          style={{
            height: 56, borderRadius: 14, padding: '0 18px',
            fontFamily: T.sans, fontSize: 16, color: T.ink,
            border: `1px solid ${error ? T.bad : T.line}`, background: '#fff',
            boxShadow: '0 1px 3px rgba(11,17,32,0.06)', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            height: 56, padding: '0 28px', borderRadius: 14, border: 'none',
            fontFamily: T.sans, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap',
            background: T.grad, color: '#fff',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !url.trim() ? 0.65 : 1,
            boxShadow: '0 8px 24px -8px rgba(0,0,255,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}
        >
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                strokeLinecap="round" style={{ animation: 'faSpin 0.8s linear infinite' }} aria-hidden="true">
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Reading your page…
            </>
          ) : (
            <>Get My Free Score <Icon name="arrow" size={16} color="#fff" /></>
          )}
        </button>
      </form>

      <p id="audit-help" style={{
        margin: '12px 0 0', fontFamily: T.sans, fontSize: 13.5, color: T.muted, textAlign: 'center',
      }}>
        No signup, no card. We read the page once and show you everything we find.
      </p>

      {/* ── Error ── */}
      {error && (
        <div role="alert" style={{
          marginTop: 18, padding: '14px 18px', borderRadius: 14,
          background: T.badSoft, border: '1px solid #FECACA',
          fontFamily: T.sans, fontSize: 14.5, color: '#991B1B', lineHeight: 1.5,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Icon name="alert" size={18} color={T.bad} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Result ── */}
      <div ref={resultRef} aria-live="polite">
        {report && (
          <div style={{
            marginTop: 28, background: '#fff', border: `1px solid ${T.line}`,
            borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 50px -24px rgba(11,17,32,0.18)',
            textAlign: 'left',
          }}>
            {/* Header: score + verdict */}
            <div className="fa-head" style={{ padding: 'clamp(24px, 4vw, 34px)', borderBottom: `1px solid ${T.line2}` }}>
              <ScoreRing score={report.score} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase',
                  color: T.muted, marginBottom: 8, overflowWrap: 'anywhere',
                }}>
                  AI Search Readiness · {new URL(report.finalUrl).hostname}
                </div>
                <h3 style={{
                  fontFamily: T.sans, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 600,
                  letterSpacing: -1, color: T.ink, margin: '0 0 10px', lineHeight: 1.15,
                }}>
                  {report.level === 'strong' && 'Well positioned for AI search.'}
                  {report.level === 'moderate' && 'Findable, but leaving visibility on the table.'}
                  {report.level === 'weak' && 'AI engines will struggle with this page.'}
                </h3>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.55 }}>
                  {report.actions.length === 0
                    ? 'We found nothing to flag on this page — genuinely rare.'
                    : `We found ${report.actions.length} thing${report.actions.length === 1 ? '' : 's'} to fix, listed below worst first.`}
                </p>
              </div>
            </div>

            {/* Categories */}
            <div style={{ padding: 'clamp(20px, 3vw, 28px)' }}>
              <div className="fa-cats">
                {report.categories.map(c => (
                  <div key={c.id} style={{
                    padding: 16, borderRadius: 14, border: `1px solid ${T.line}`, background: T.bgSoft,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: T.ink }}>{c.label}</span>
                      <span style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 700, color: levelColor(c.level) }}>
                        {c.score === null ? 'n/a' : c.score}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: T.line2, margin: '10px 0 9px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${c.score ?? 0}%`, background: levelColor(c.level),
                        borderRadius: 3, transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                      }} />
                    </div>
                    <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.body, margin: 0, lineHeight: 1.5 }}>
                      {c.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {report.actions.length > 0 && (
              <div style={{ padding: '0 clamp(20px, 3vw, 28px) clamp(20px, 3vw, 28px)' }}>
                <h4 style={{
                  fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: T.ink,
                  margin: '0 0 14px', letterSpacing: -0.4,
                }}>
                  What to fix first
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {visibleActions.map((a, i) => {
                    const s = SEVERITY_STYLE[a.severity]
                    return (
                      <div key={i} style={{
                        padding: 16, borderRadius: 14, border: `1px solid ${T.line}`, background: '#fff',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5,
                            textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999,
                            background: s.bg, color: s.fg,
                          }}>{s.label}</span>
                          <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted }}>{a.category}</span>
                        </div>
                        <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                          {a.title}
                        </div>
                        <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.body, margin: '0 0 8px', lineHeight: 1.55 }}>
                          {a.detail}
                        </p>
                        <p style={{
                          fontFamily: T.sans, fontSize: 13.5, color: T.ink2, margin: 0, lineHeight: 1.55,
                          paddingLeft: 12, borderLeft: `2px solid ${T.blueBorder}`,
                        }}>
                          <strong style={{ fontWeight: 600 }}>Fix:</strong> {a.fix}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {report.actions.length > 5 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    style={{
                      marginTop: 12, width: '100%', height: 46, borderRadius: 12, cursor: 'pointer',
                      background: '#fff', border: `1px solid ${T.line}`,
                      fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: T.ink,
                    }}
                  >
                    Show all {report.actions.length} findings
                  </button>
                )}
              </div>
            )}

            {/* Honest limits + the ask */}
            <div style={{ padding: 'clamp(20px, 3vw, 28px)', background: T.bgSoft, borderTop: `1px solid ${T.line2}` }}>
              <ul style={{
                margin: '0 0 20px', padding: 0, listStyle: 'none',
                display: 'flex', flexDirection: 'column', gap: 7,
              }}>
                {report.limits.map((l, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontFamily: T.sans, fontSize: 12.5, color: T.muted, lineHeight: 1.5,
                  }}>
                    <Icon name="check" size={13} color={T.muted} />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  href="/signup"
                  onClick={() => posthog.capture('signup_started', { location: 'free_audit_result', score: report.score })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0 24px', height: 50, borderRadius: 14,
                    fontFamily: T.sans, fontSize: 15.5, fontWeight: 600,
                    background: T.grad, color: '#fff', textDecoration: 'none',
                    boxShadow: '0 8px 24px -8px rgba(0,0,255,0.5)',
                  }}
                >
                  Fix These Issues with Optmizly <Icon name="arrow" size={16} color="#fff" />
                </Link>
                <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>
                  {report.remaining} of {report.dailyLimit} free audits left today
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
