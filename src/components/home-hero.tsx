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

// ── Lock icon ─────────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
      <path d="M4 5.5V4a2 2 0 014 0v1.5" />
    </svg>
  )
}

// ── Dashboard mock ────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.line2} strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.blue} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
    </svg>
  )
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontFamily: T.sans }}>
        <span style={{ fontSize: 9, color: T.body }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: T.line2 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function HeroDashboard() {
  const freeTools = ['Content Analyzer', 'On-Page SEO']
  const proTools  = ['Content Planner', 'Rank Tracker', 'Content Optimizer', 'AI Visibility', 'Backlinks', 'Ranking Engine']
  const agencyTools = ['SEO Audit', 'SERP Audit', 'Topical Authority', 'Performance Fixer', 'Geogrid', 'Review Velocity']

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 40px 80px -28px rgba(0,0,255,0.18), 0 12px 28px -12px rgba(11,17,32,0.1)',
    }}>
      {/* Browser chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderBottom: `1px solid ${T.line2}`, background: T.bgSoft,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FF6058' }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FFBD2E' }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#28C840' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 11, color: T.muted,
            background: '#fff', border: `1px solid ${T.line}`,
            borderRadius: 6, padding: '2px 14px',
          }}>
            optmizly.com/dashboard
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="hero-mock-grid" style={{ display: 'grid', gridTemplateColumns: '188px 1fr', minHeight: 460 }}>

        {/* ── Sidebar ── */}
        <div className="hero-mock-sidebar" style={{
          background: '#fff', borderRight: `1px solid ${T.line2}`,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderBottom: `1px solid ${T.line2}`,
          }}>
            <img src="/logo.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 12, color: T.blue }}>optmizly</span>
          </div>

          {/* Plan usage */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.line2}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>Pro Plan</span>
              <span style={{ fontSize: 9, color: T.muted, fontFamily: T.sans }}>24 / 50</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: T.line2 }}>
              <div style={{ height: '100%', width: '48%', background: T.blue, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 8, color: T.muted, marginTop: 2, fontFamily: T.sans }}>26 analyses remaining</div>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: '4px 6px', overflowY: 'hidden' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: '#10B981', padding: '5px 6px 2px', fontFamily: T.sans }}>FREE</div>
            {freeTools.map((label) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', padding: '4px 7px',
                borderRadius: 5, marginBottom: 1, fontSize: 9.5, fontFamily: T.sans,
                color: '#64748B',
              }}>
                {label}
              </div>
            ))}

            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: T.blue, padding: '6px 6px 2px', fontFamily: T.sans }}>PRO</div>
            {proTools.map((label, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 7px', borderRadius: 5, marginBottom: 1,
                fontSize: 9.5, fontFamily: T.sans,
                color: i === 0 ? '#fff' : '#64748B',
                background: i === 0 ? T.blue : 'transparent',
                fontWeight: i === 0 ? 600 : 400,
              }}>
                <span>{label}</span>
              </div>
            ))}

            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: '#D97706', padding: '6px 6px 2px', fontFamily: T.sans }}>AGENCY</div>
            {agencyTools.map(label => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 7px', borderRadius: 5, marginBottom: 1,
                fontSize: 9.5, fontFamily: T.sans, color: '#CBD5E1',
              }}>
                <span>{label}</span><LockIcon />
              </div>
            ))}
          </div>

          {/* Upgrade button */}
          <div style={{ padding: '8px', borderTop: `1px solid ${T.line2}` }}>
            <div style={{
              background: T.blue, color: '#fff', borderRadius: 6,
              padding: '5px 0', textAlign: 'center',
              fontSize: 9.5, fontWeight: 600, fontFamily: T.sans,
            }}>
              Upgrade to Agency →
            </div>
          </div>
        </div>

        {/* ── Main: Content Analyzer Result ── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: T.bgSoft }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', height: 32, borderBottom: `1px solid ${T.line2}`, background: '#fff',
            fontSize: 10, color: T.muted, fontFamily: T.sans, flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, color: T.ink, fontSize: 10 }}>Content Analyzer</span>
            <span>Help</span>
          </div>

          {/* Result area */}
          <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* URL analyzed */}
            <div style={{
              background: '#fff', border: `1px solid ${T.line}`, borderRadius: 8,
              padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: T.good, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: T.body, fontFamily: T.mono, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                optmizly.com/blog/what-is-seo
              </span>
              <span style={{ fontSize: 9, color: T.good, fontFamily: T.sans, fontWeight: 600, flexShrink: 0 }}>Analysed</span>
            </div>

            {/* Score + metrics row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Score ring */}
              <div style={{
                background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10,
                padding: '10px 12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, flexShrink: 0,
              }}>
                <div style={{ position: 'relative', width: 56, height: 56 }}>
                  <ScoreRing score={87} size={56} />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.blue, fontFamily: T.sans, lineHeight: 1 }}>87</span>
                    <span style={{ fontSize: 7, color: T.muted, fontFamily: T.sans }}>/100</span>
                  </div>
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>Content Score</span>
              </div>

              {/* Metric bars */}
              <div style={{ flex: 1, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px' }}>
                <MetricBar label="SEO Optimization" value={92} color={T.blue} />
                <MetricBar label="Readability" value={78} color="#10B981" />
                <MetricBar label="E-E-A-T Score" value={85} color="#8B5CF6" />
                <MetricBar label="Keyword Density" value={71} color="#F59E0B" />
              </div>
            </div>

            {/* Suggestions */}
            <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: T.ink, fontFamily: T.sans, marginBottom: 7 }}>Top Recommendations</div>
              {[
                ['Add 2–3 internal links to boost authority', '#F59E0B'],
                ['Include FAQ schema for AI answer engines', T.blue],
                ['Increase word count to 1,800+ words', '#10B981'],
              ].map(([text, color]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: 2.5, background: color, marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: T.body, fontFamily: T.sans, lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
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
        .opt-grid { display: none; }
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
        @media (max-width: 639px) {
          .hero-text { padding: 56px 20px 0 !important; }
          .hero-mock-wrap { padding: 0 16px !important; }
          .hero-mock-sidebar { display: none !important; }
          .hero-mock-grid { grid-template-columns: 1fr !important; min-height: unset !important; }
          .opt-trust { flex-direction: column !important; gap: 12px !important; align-items: center !important; }
        }
      `}</style>

      <div className="opt-grid" />
      <div className="opt-glow" />

      {/* Text block */}
      <div className="hero-text" style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto', padding: '96px 32px 0', textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Badge */}
        <div className="opt-badge" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 12px', borderRadius: 999, marginBottom: 26,
          background: T.blueSoft, color: T.blueDark,
          border: `1px solid ${T.blueBorder}`,
          fontFamily: T.sans, fontSize: 13, fontWeight: 500,
          maxWidth: '100%', boxSizing: 'border-box',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: T.blue, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Now optimizing for ChatGPT, Gemini, Claude &amp; Perplexity
          </span>
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
        <div className="opt-trust" style={{
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
      <div className="hero-mock-wrap" style={{
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
