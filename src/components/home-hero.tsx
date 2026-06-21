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
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 11, color: '#92400E', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          ⚠ Missing: "author schema", "E-E-A-T signals", "topical depth"
        </div>
        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#065F46', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          ✓ AI fix ready — 4 entities injected, voice preserved
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
      border: '1px solid #E5E7EB',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 30px 60px -20px rgba(10,11,20,0.28), 0 8px 20px -8px rgba(10,11,20,0.10)',
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

export function HomeHero() {
  return (
    <div style={{ background: '#080916', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* Indigo glow */}
      <div style={{
        position: 'absolute',
        top: -260, left: '50%', transform: 'translateX(-50%)',
        width: 1100, height: 700,
        background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.35) 0%, transparent 60%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black 30%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <section style={{ padding: 'clamp(60px, 8vw, 90px) clamp(24px, 4vw, 80px) 60px', position: 'relative', textAlign: 'center', zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '5px 5px 5px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#4F46E5', boxShadow: '0 0 8px #4F46E5', flexShrink: 0 }} />
          New: Auto-fix engine is live
          <span style={{ background: '#4F46E5', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
            Read more →
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(44px, 6.5vw, 84px)',
          fontWeight: 600,
          letterSpacing: 'clamp(-1.5px, -0.04em, -3px)',
          lineHeight: 0.98,
          margin: '0 auto 24px',
          maxWidth: 900,
        }}>
          The SEO toolkit<br />
          that{' '}
          <span style={{
            background: 'linear-gradient(120deg, #A5B4FC 0%, #C4B5FD 50%, #F0ABFC 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>fixes itself.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 1.8vw, 19px)', lineHeight: 1.55,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 640, margin: '0 auto 36px',
        }}>
          17 specialist tools across Free, Pro & Agency tiers. The only platform that detects AND fixes — with code patches, content rewrites, and one-click local SEO sync.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <SignedOut>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '12px 22px', borderRadius: 8, fontSize: 15, fontWeight: 500,
              background: '#fff', color: '#0A0B14', border: '1px solid #fff',
              boxShadow: '0 4px 14px rgba(255,255,255,0.15)',
              textDecoration: 'none',
            }}>
              Start free trial →
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '12px 22px', borderRadius: 8, fontSize: 15, fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              textDecoration: 'none',
            }}>
              See pricing
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '12px 22px', borderRadius: 8, fontSize: 15, fontWeight: 500,
              background: '#fff', color: '#0A0B14', border: '1px solid #fff',
              boxShadow: '0 4px 14px rgba(255,255,255,0.15)',
              textDecoration: 'none',
            }}>
              Open Dashboard →
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '12px 22px', borderRadius: 8, fontSize: 15, fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              textDecoration: 'none',
            }}>
              See pricing
            </Link>
          </SignedIn>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {['Free tier forever', 'No credit card', 'Fixes start in 60s'].map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#86EFAC' }}>✓</span> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Floating product preview */}
      <div style={{ padding: '0 clamp(16px, 4vw, 80px)', position: 'relative', zIndex: 1, marginBottom: -180 }}>
        <AppWindow height={480} title="app.optmizly.com/optimizer">
          <OptimizerMock />
        </AppWindow>
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}
