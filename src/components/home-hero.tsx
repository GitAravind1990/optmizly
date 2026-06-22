'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

function OptimizerMock() {
  return (
    <div style={{ display: 'flex', height: '100%', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
      <div style={{ width: 168, borderRight: '1px solid #EEF0F4', background: '#FAFAFB', padding: '16px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#6E7180', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Sections</div>
        {[['Introduction', false], ['Methodology', true], ['Analysis', false], ['Conclusion', false]].map(([s, active]) => (
          <div key={s as string} style={{
            padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 11,
            background: active ? '#EEF2FF' : 'transparent',
            color: active ? '#4338CA' : '#6E7180',
            fontWeight: active ? 500 : 400,
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}>{s as string}</div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '16px 18px', overflow: 'hidden' }}>
        <div style={{ fontSize: 11, color: '#4A4D5E', lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          The integration of semantic entities and structured data significantly improves topical relevance for search engines...
        </div>
        <div style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: '0 6px 6px 0', padding: '8px 10px', marginBottom: 8, fontSize: 11, color: '#92400E', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          Missing: &ldquo;author schema&rdquo;, &ldquo;E-E-A-T signals&rdquo;, &ldquo;topical depth&rdquo;
        </div>
        <div style={{ background: '#ECFDF5', borderLeft: '3px solid #10B981', borderRadius: '0 6px 6px 0', padding: '8px 10px', fontSize: 11, color: '#065F46', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          4 entities injected — voice preserved
        </div>
      </div>
      <div style={{ width: 160, borderLeft: '1px solid #EEF0F4', background: '#FAFAFB', padding: '16px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#6E7180', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Content Score</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: '#4F46E5', letterSpacing: -1.5, lineHeight: 1 }}>82</div>
        <div style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>↑ from 51</div>
        <div style={{ marginTop: 16 }}>
          {[['Relevance', 88], ['E-E-A-T', 74], ['Entities', 91], ['Schema', 65]].map(([label, val]) => (
            <div key={label as string} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6E7180', marginBottom: 3, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                <span>{label as string}</span><span>{val}</span>
              </div>
              <div style={{ height: 3, background: '#EEF0F4', borderRadius: 99 }}>
                <div style={{ height: 3, width: `${val}%`, background: '#4F46E5', borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AppWindow({ children, title = 'app.optmizly.com', height = 520 }: { children: React.ReactNode; title?: string; height?: number }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(99,102,241,0.15), 0 40px 80px -20px rgba(0,0,10,0.6), 0 16px 40px -8px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #EEF0F4', background: '#FAFAFB' }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FB8181', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FCD34D', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#86EFAC', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#6E7180' }}>{title}</div>
      </div>
      <div style={{ height, background: '#fff' }}>{children}</div>
    </div>
  )
}

function FloatingChip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      background: 'rgba(6,7,18,0.88)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '12px 16px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 10,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function HomeHero() {
  return (
    <div style={{ background: '#080916', color: '#fff', position: 'relative' }}>
      <style>{`
        @keyframes optm-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(99,102,241,0.9); }
          50% { opacity: 0.55; box-shadow: 0 0 16px rgba(99,102,241,0.5); }
        }
        .optm-dot { animation: optm-pulse 2.4s ease-in-out infinite; }
      `}</style>

      {/* ── Background layer (clipped so glows don't cause scrollbars) ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Primary center glow */}
        <div style={{
          position: 'absolute',
          top: -320, left: '50%', transform: 'translateX(-50%)',
          width: 1300, height: 900,
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.5) 0%, rgba(79,70,229,0.22) 35%, transparent 65%)',
          filter: 'blur(64px)',
        }} />
        {/* Left accent — purple */}
        <div style={{
          position: 'absolute',
          top: -60, left: -180,
          width: 640, height: 560,
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.22) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }} />
        {/* Right accent — blue */}
        <div style={{
          position: 'absolute',
          top: 60, right: -180,
          width: 640, height: 560,
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.16) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }} />
        {/* Vertical beam */}
        <div style={{
          position: 'absolute',
          top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 2, height: '55%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(99,102,241,0.6) 25%, rgba(99,102,241,0.15) 70%, transparent 100%)',
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 15%, black 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 15%, black 10%, transparent 75%)',
        }} />
        {/* Horizontal shimmer line */}
        <div style={{
          position: 'absolute',
          top: '38%', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.25) 30%, rgba(139,92,246,0.35) 50%, rgba(99,102,241,0.25) 70%, transparent 100%)',
        }} />
      </div>

      {/* ── Hero text ── */}
      <section style={{ padding: 'clamp(72px, 9vw, 108px) clamp(24px, 4vw, 80px) 64px', position: 'relative', textAlign: 'center', zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '6px 6px 6px 14px', borderRadius: 999,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.2) inset',
          fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 34,
        }}>
          <span className="optm-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#6366F1',
            flexShrink: 0,
          }} />
          Auto-fix engine — now live
          <span style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: '#fff', padding: '3px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          }}>
            See what&apos;s new →
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(50px, 7.2vw, 96px)',
          fontWeight: 700,
          letterSpacing: 'clamp(-2px, -0.042em, -4px)',
          lineHeight: 0.95,
          margin: '0 auto 28px',
          maxWidth: 1000,
        }}>
          The SEO toolkit<br />
          that{' '}
          <span style={{
            background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 28%, #C084FC 58%, #E879F9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>fixes itself.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 1.9vw, 19px)', lineHeight: 1.65,
          color: 'rgba(255,255,255,0.62)',
          maxWidth: 600, margin: '0 auto 42px',
        }}>
          Most SEO tools hand you a report and walk away. Optmizly generates the fix — rewrites your content, patches your code, syncs your citations — and delivers the result.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <SignedOut>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: '#fff', color: '#0A0B14',
              boxShadow: '0 4px 20px rgba(255,255,255,0.22), 0 1px 4px rgba(0,0,0,0.12)',
              textDecoration: 'none', letterSpacing: -0.2,
            }}>
              Start for free →
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500,
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.13)',
              textDecoration: 'none',
            }}>
              View plans
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: '#fff', color: '#0A0B14',
              boxShadow: '0 4px 20px rgba(255,255,255,0.22)',
              textDecoration: 'none', letterSpacing: -0.2,
            }}>
              Open Dashboard →
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500,
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.13)',
              textDecoration: 'none',
            }}>
              View plans
            </Link>
          </SignedIn>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {['Free plan — no credit card required', 'Cancel any time', 'First fix in under 60 seconds'].map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: '#86EFAC', flexShrink: 0 }} />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Product window ── */}
      <div style={{ padding: '0 clamp(16px, 4vw, 80px)', position: 'relative', zIndex: 2, marginBottom: -180 }}>
        {/* Glow halo behind window */}
        <div style={{
          position: 'absolute',
          top: -20, left: 'clamp(0px, 2vw, 40px)', right: 'clamp(0px, 2vw, 40px)', bottom: 60,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.25) 40%, transparent 70%)',
          filter: 'blur(48px)',
          borderRadius: 24,
          pointerEvents: 'none',
        }} />

        {/* Window + floating chips */}
        <div style={{ position: 'relative' }}>
          <AppWindow height={480} title="app.optmizly.com/optimizer">
            <OptimizerMock />
          </AppWindow>

          {/* Chip: Content Score — mid left */}
          <FloatingChip style={{ top: 290, left: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Content Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#10B981', letterSpacing: -1.2, lineHeight: 1, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>82</span>
              <span style={{ fontSize: 12, color: 'rgba(16,185,129,0.75)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>↑ 31 pts</span>
            </div>
          </FloatingChip>

          {/* Chip: Entities — top right */}
          <FloatingChip style={{ top: 56, right: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Entities injected
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#A5B4FC', letterSpacing: -1.2, lineHeight: 1, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>4</span>
              <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.7)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>of 6 gaps closed</span>
            </div>
          </FloatingChip>
        </div>
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}
