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
function HeroDashboard() {
  const freeTools = ['Content Analyzer', 'On-Page SEO']
  const proTools  = ['Content Planner', 'Rank Tracker', 'Content Optimizer', 'AI Visibility']
  const agencyTools = ['SEO Audit', 'SERP Audit', 'Performance Fixer']

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
            optmizly.com/dashboard
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="hero-mock-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', height: 480 }}>

        {/* ── Sidebar ── */}
        <div className="hero-mock-sidebar" style={{
          background: '#fff', borderRight: `1px solid ${T.line2}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px', borderBottom: `1px solid ${T.line2}`,
          }}>
            <img src="/logo.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 13, color: T.blue }}>optmizly</span>
          </div>

          {/* Plan usage */}
          <div style={{ padding: '9px 14px', borderBottom: `1px solid ${T.line2}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>Free Plan</span>
              <span style={{ fontSize: 10, color: T.muted, fontFamily: T.sans }}>1 / 3</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: T.line2 }}>
              <div style={{ height: '100%', width: '33%', background: T.blue, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 3, fontFamily: T.sans }}>2 analyses remaining</div>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: '6px 8px', overflowY: 'hidden' }}>
            {/* FREE */}
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: '#10B981', padding: '6px 6px 3px', fontFamily: T.sans }}>FREE</div>
            {freeTools.map((label, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', padding: '5px 8px',
                borderRadius: 6, marginBottom: 1, fontSize: 10, fontFamily: T.sans,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#fff' : '#64748B',
                background: i === 0 ? T.blue : 'transparent',
              }}>
                {label}
              </div>
            ))}

            {/* PRO */}
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: T.blue, padding: '8px 6px 3px', fontFamily: T.sans }}>PRO</div>
            {proTools.map(label => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', borderRadius: 6, marginBottom: 1,
                fontSize: 10, fontFamily: T.sans, color: '#CBD5E1',
              }}>
                <span>{label}</span><LockIcon />
              </div>
            ))}

            {/* AGENCY */}
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: '#D97706', padding: '8px 6px 3px', fontFamily: T.sans }}>AGENCY</div>
            {agencyTools.map(label => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', borderRadius: 6, marginBottom: 1,
                fontSize: 10, fontFamily: T.sans, color: '#CBD5E1',
              }}>
                <span>{label}</span><LockIcon />
              </div>
            ))}
          </div>

          {/* Upgrade button */}
          <div style={{ padding: '10px 10px', borderTop: `1px solid ${T.line2}` }}>
            <div style={{
              background: T.blue, color: '#fff', borderRadius: 7,
              padding: '6px 0', textAlign: 'center',
              fontSize: 10, fontWeight: 600, fontFamily: T.sans,
            }}>
              Upgrade to Pro →
            </div>
          </div>
        </div>

        {/* ── Main: Content Analyzer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: T.bgSoft }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14,
            padding: '0 16px', height: 34, borderBottom: `1px solid ${T.line2}`, background: '#fff',
            fontSize: 10, color: T.muted, fontFamily: T.sans, flexShrink: 0,
          }}>
            {['Help'].map(l => <span key={l}>{l}</span>)}
          </div>

          {/* Tool area */}
          <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
            {/* URL row */}
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              <div style={{
                flex: 1, border: `1px solid ${T.line}`, borderRadius: 7, background: '#fff',
                height: 32, padding: '0 10px', display: 'flex', alignItems: 'center',
                fontSize: 10, color: T.muted, fontFamily: T.sans,
              }}>
                Paste a URL to fetch and analyze automatically
              </div>
              <div style={{
                background: '#F59E0B', color: '#fff', borderRadius: 7,
                height: 32, padding: '0 10px', display: 'flex', alignItems: 'center',
                fontSize: 10, fontWeight: 600, fontFamily: T.sans, whiteSpace: 'nowrap',
              }}>
                Fetch &amp; Analyse
              </div>
            </div>

            {/* Divider */}
            <div style={{ textAlign: 'center', fontSize: 9, color: T.muted, fontFamily: T.sans, flexShrink: 0 }}>
              or paste text below
            </div>

            {/* Textarea */}
            <div style={{
              border: `1px solid ${T.line}`, borderRadius: 7, background: '#fff',
              padding: '8px 10px', height: 88, flexShrink: 0,
              fontSize: 10, color: T.muted, fontFamily: T.sans,
            }}>
              Paste your article, blog post, or page content here...
            </div>

            {/* Analyse row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: T.muted, fontFamily: T.sans }}>0 characters</span>
              <div style={{
                background: T.blue, color: '#fff', borderRadius: 7,
                padding: '5px 14px', fontSize: 10, fontWeight: 600, fontFamily: T.sans,
              }}>
                Analyse →
              </div>
            </div>

            {/* Empty state */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, background: T.line2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="1" width="11" height="13" rx="1.5" />
                  <line x1="5" y1="5" x2="10" y2="5" />
                  <line x1="5" y1="8" x2="10" y2="8" />
                  <line x1="5" y1="11" x2="8" y2="11" />
                </svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>Ready to analyse</div>
              <div style={{
                fontSize: 10, color: T.muted, textAlign: 'center',
                maxWidth: 220, lineHeight: 1.5, fontFamily: T.sans,
              }}>
                Paste content or fetch a URL above, then click Analyse to get your full content score.
              </div>
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
          .hero-mock-grid { grid-template-columns: 1fr !important; height: 320px !important; }
          .opt-trust { flex-direction: column !important; gap: 12px !important; align-items: center !important; }
        }
      `}</style>

      <div className="opt-grid" />
      <div className="opt-glow" />

      {/* Text block */}
      <div className="hero-text" style={{
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
          whiteSpace: 'nowrap',
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
