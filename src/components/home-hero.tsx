'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  sans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  blue: '#0000FF',
  blueMid: '#3B5BFF',
  cyan: '#4DEEFF',
  blueDark: '#0000CC',
  blueSoft: '#EEF1FF',
  blueBorder: '#CBD4FF',
  ink: '#0B1120',
  ink2: '#1F2937',
  body: '#4B5563',
  muted: '#8A93A3',
  line: '#E8EBF0',
  line2: '#F0F2F6',
  bg: '#FFFFFF',
  bgSoft: '#FAFAFA',
  good: '#10B981',
  grad: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 45%, #4DEEFF 100%)',
  gradText: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 48%, #28C8E8 100%)',
}

// ── SVG icon ─────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }: {
  name: string; size?: number; color?: string; strokeWidth?: number
}) {
  const paths: Record<string, string> = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    check: 'M5 12l5 5L20 7',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    sparkle: 'M12 3l1.6 5L19 10l-5.4 2L12 17l-1.6-5L5 10l5.4-2L12 3z',
    bot: 'M12 3v3M9 12h.01M15 12h.01M6 8h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM2 13h2M20 13h2',
    search: 'M11 11m-8 0a8 8 0 1 0 16 0 8 8 0 1 0 -16 0M21 21l-4.3-4.3',
    cluster: 'M12 4v6m0 0L7 16m5-6l5 6M5 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M10 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    bars: 'M5 21V11M12 21V4M19 21v-7',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={paths[name] || paths.arrow} />
    </svg>
  )
}

// ── Score ring gauge ──────────────────────────────────────────────────────────
function ScoreRing({ label, value, color, delta }: {
  label: string; value: number; color: string; delta: string
}) {
  const r = 30
  const c = 2 * Math.PI * r
  const off = c * (1 - value / 100)
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 16,
      padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{ position: 'relative', width: 78, height: 78 }}>
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle cx="39" cy="39" r={r} fill="none" stroke={T.line} strokeWidth="7" />
          <circle cx="39" cy="39" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            transform="rotate(-90 39 39)" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: T.sans, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: -0.5 }}>
            {value}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>{label}</div>
      <div style={{ fontFamily: T.sans, fontSize: 11, color: T.good, fontWeight: 500 }}>▲ {delta}</div>
    </div>
  )
}

// ── Dashboard mock ────────────────────────────────────────────────────────────
function HeroDashboard() {
  const sidebar = [
    ['grid', 'Dashboard', true],
    ['sparkle', 'AI SEO', false],
    ['bot', 'GEO', false],
    ['search', 'AEO', false],
    ['cluster', 'Keywords', false],
    ['bars', 'Competitors', false],
  ] as const

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 40px 80px -28px rgba(0,0,255,0.18), 0 12px 28px -12px rgba(11,17,32,0.1)',
    }}>
      {/* Browser chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: `1px solid ${T.line2}`, background: T.bgSoft,
      }}>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#FF6058' }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#FFBD2E' }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#28C840' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 12, color: T.muted,
            background: '#fff', border: `1px solid ${T.line}`,
            borderRadius: 8, padding: '3px 16px',
          }}>
            app.optmizly.com/dashboard
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', height: 472 }}>
        {/* Sidebar */}
        <div style={{
          background: T.bgSoft, borderRight: `1px solid ${T.line2}`,
          padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ padding: '0 8px 14px', marginBottom: 4, fontFamily: T.sans, fontWeight: 600, fontSize: 16, letterSpacing: -0.6, color: T.blue }}>
            optmizly
          </div>
          {sidebar.map(([ic, lbl, active]) => (
            <div key={lbl} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
              borderRadius: 9, fontSize: 13, fontFamily: T.sans,
              fontWeight: active ? 600 : 500,
              color: active ? T.blue : T.body,
              background: active ? T.blueSoft : 'transparent',
            }}>
              <Icon name={ic} size={16} color={active ? T.blue : T.muted} />
              {lbl}
            </div>
          ))}
          <div style={{
            marginTop: 'auto', padding: 12, borderRadius: 12,
            background: '#fff', border: `1px solid ${T.line}`,
          }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontFamily: T.sans }}>Visibility index</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: -0.6, fontFamily: T.sans }}>
              88
              <span style={{ fontSize: 13, color: T.good, fontWeight: 500, marginLeft: 6 }}>+12</span>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ padding: '20px 22px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: -0.3, fontFamily: T.sans }}>
                Search Visibility Overview
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.sans }}>
                optmizly.com · last 30 days
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: T.body, border: `1px solid ${T.line}`, borderRadius: 8, padding: '5px 10px', fontFamily: T.sans }}>30d</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: T.blue, borderRadius: 8, padding: '5px 10px', fontFamily: T.sans }}>Optimize all</span>
            </div>
          </div>

          {/* Score rings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            <ScoreRing label="SEO Score" value={92} color="#0000FF" delta="6 pts" />
            <ScoreRing label="GEO Score" value={78} color="#3B5BFF" delta="14 pts" />
            <ScoreRing label="AEO Score" value={84} color="#28C8E8" delta="9 pts" />
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Chart */}
            <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 2, fontFamily: T.sans }}>Ranking Improvements</div>
              <div style={{ fontSize: 11, color: T.good, marginBottom: 10, fontFamily: T.sans }}>+35% organic traffic</div>
              <svg width="100%" height="92" viewBox="0 0 240 92" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3B5BFF" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#3B5BFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 78 L40 70 L80 72 L120 54 L160 40 L200 30 L240 14 L240 92 L0 92 Z" fill="url(#dashFill)" />
                <path d="M0 78 L40 70 L80 72 L120 54 L160 40 L200 30 L240 14"
                  fill="none" stroke="#0000FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Suggestions */}
            <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 10, fontFamily: T.sans }}>Content Suggestions</div>
              {[
                ['Add FAQ schema for AI Overviews', '#0000FF'],
                ['Target 3 answer-engine queries', '#28C8E8'],
                ['Strengthen E-E-A-T signals', '#3B5BFF'],
              ].map(([s, col]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: col, marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.ink2, lineHeight: 1.35, fontFamily: T.sans }}>{s}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: T.blue, fontFamily: T.sans }}>Apply 9 fixes →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function HomeHero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#fff' }}>
      <style>{`
        .opt-grid {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(#EEF1F6 1px, transparent 1px),
            linear-gradient(90deg, #EEF1F6 1px, transparent 1px);
          background-size: 56px 56px;
          -webkit-mask-image: radial-gradient(ellipse 70% 65% at 50% 22%, #000 35%, transparent 78%);
          mask-image: radial-gradient(ellipse 70% 65% at 50% 22%, #000 35%, transparent 78%);
        }
        .opt-glow {
          position: absolute; left: 50%; top: -120px; z-index: 0; pointer-events: none;
          width: 1100px; height: 620px; transform: translateX(-50%);
          background:
            radial-gradient(closest-side at 38% 45%, rgba(0,0,255,0.18), transparent),
            radial-gradient(closest-side at 66% 38%, rgba(77,238,255,0.22), transparent),
            radial-gradient(closest-side at 50% 60%, rgba(59,91,255,0.14), transparent);
          filter: blur(36px);
          opacity: 0.9;
          animation: optDrift 11s ease-in-out infinite alternate;
        }
        @keyframes optDrift {
          0%   { transform: translateX(-50%) translateY(0) scale(1); }
          100% { transform: translateX(-50%) translateY(26px) scale(1.07); }
        }
        @media (prefers-reduced-motion: reduce) { .opt-glow { animation: none; } }
      `}</style>

      <div className="opt-grid" />
      <div className="opt-glow" />

      {/* Text block */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto', padding: '96px 32px 0', textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 12px', borderRadius: 999, marginBottom: 26,
          background: T.blueSoft, color: T.blueDark,
          border: `1px solid ${T.blueBorder}`,
          fontFamily: T.sans, fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: T.blue }} />
          Now optimizing for ChatGPT, Gemini &amp; Perplexity
          <Icon name="arrow" size={13} color={T.blue} />
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: T.sans, fontSize: 'clamp(44px, 6.5vw, 76px)',
          fontWeight: 600, letterSpacing: -3, lineHeight: 1.02,
          margin: '0 auto 24px', maxWidth: 900,
        }}>
          Rank higher everywhere{' '}
          <span style={{
            background: T.gradText,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            search happens.
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 1.8vw, 20px)', lineHeight: 1.55, color: T.body,
          maxWidth: 640, margin: '0 auto 36px',
        }}>
          Optimize your website for Google Search, AI search engines, answer engines, and generative platforms — one intelligent platform for SEO, GEO &amp; AEO.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
          <SignedOut>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 28px', height: 52, borderRadius: 14,
              fontFamily: T.sans, fontSize: 16, fontWeight: 600,
              background: T.grad, color: '#fff', textDecoration: 'none',
              boxShadow: '0 8px 24px -8px rgba(0,0,255,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}>
              Start Free <Icon name="arrow" size={16} color="#fff" />
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 28px', height: 52, borderRadius: 14,
              fontFamily: T.sans, fontSize: 16, fontWeight: 600,
              background: '#fff', color: T.ink, textDecoration: 'none',
              border: `1px solid ${T.line}`,
              boxShadow: '0 1px 3px rgba(11,17,32,0.06)',
            }}>
              View Plans
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 28px', height: 52, borderRadius: 14,
              fontFamily: T.sans, fontSize: 16, fontWeight: 600,
              background: T.grad, color: '#fff', textDecoration: 'none',
              boxShadow: '0 8px 24px -8px rgba(0,0,255,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}>
              Open Dashboard <Icon name="arrow" size={16} color="#fff" />
            </Link>
          </SignedIn>
        </div>

        {/* Trust line */}
        <div style={{
          fontSize: 14, color: T.muted, display: 'flex',
          justifyContent: 'center', gap: 22, flexWrap: 'wrap', marginBottom: 56,
          fontFamily: T.sans,
        }}>
          {['No credit card', 'Free forever tier', 'Setup in 2 minutes'].map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="check" size={15} color={T.good} />{s}
            </span>
          ))}
        </div>
      </div>

      {/* Dashboard window */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1080, margin: '0 auto', padding: '0 32px',
      }}>
        <HeroDashboard />
      </div>

      {/* Bottom fade into page */}
      <div style={{ height: 80 }} />
    </section>
  )
}
