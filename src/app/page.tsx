import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { HomeHero } from '@/components/home-hero'
import { PagePricing } from '@/components/page-pricing'

export const metadata: Metadata = {
  title: 'Optmizly – AI SEO Toolkit | Detects & Fixes Your SEO Issues',
  description: '17 specialist SEO tools across Free, Pro & Agency tiers. The only platform that detects AND fixes — content rewrites, Core Web Vitals patches, one-click local SEO sync.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Optmizly – AI SEO Toolkit',
    description: '17 tools. The only platform that detects AND fixes your SEO issues automatically.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 628, alt: 'Optmizly – AI SEO Toolkit' }],
  },
}

// ─── Design tokens (mirrors Claude Design file) ──────────────────────────────
const T = {
  ink: '#0A0B14',
  ink2: '#1B1D2A',
  body: '#4A4D5E',
  muted: '#6E7180',
  line: '#E5E7EB',
  line2: '#EEF0F4',
  bg: '#FFFFFF',
  bgSoft: '#FAFAFB',
  bgCool: '#F6F7FB',
  accent: '#4F46E5',
  accentDark: '#4338CA',
  accentSoft: '#EEF2FF',
  accentBorder: '#C7D2FE',
  good: '#10B981',
  goodSoft: '#ECFDF5',
  dark: '#080916',
}

// ─── Mock product windows ────────────────────────────────────────────────────

function PerfFixerMock() {
  const metrics = [
    { label: 'LCP', before: '4.2s', after: '1.8s', color: T.good },
    { label: 'CLS', before: '0.31', after: '0.04', color: T.good },
    { label: 'FID', before: '280ms', after: '42ms', color: T.good },
  ]
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 220, borderRight: `1px solid ${T.line2}`, background: T.bgSoft, padding: '20px 16px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Performance Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Before</div>
            <div style={{ fontSize: 42, fontWeight: 600, color: '#EF4444', letterSpacing: -1.5, lineHeight: 1 }}>47</div>
          </div>
          <div style={{ fontSize: 20, color: T.muted }}>→</div>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>After</div>
            <div style={{ fontSize: 42, fontWeight: 600, color: T.good, letterSpacing: -1.5, lineHeight: 1 }}>91</div>
          </div>
        </div>
        {metrics.map(m => (
          <div key={m.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: T.ink, marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 11, color: T.muted }}>
              <span style={{ textDecoration: 'line-through' }}>{m.before}</span>
              {' → '}
              <span style={{ color: T.good, fontWeight: 500 }}>{m.after}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '20px 18px', overflow: 'hidden' }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>AI-Generated Patch</div>
        <div style={{ background: T.ink, borderRadius: 8, padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#A5B4FC', lineHeight: 1.6 }}>
          <span style={{ color: '#86EFAC' }}>{'// LCP fix: preload hero image'}</span>{'\n'}
          <span style={{ color: '#FCA5A5' }}>{'- <img src="hero.jpg" />'}</span>{'\n'}
          <span style={{ color: '#86EFAC' }}>{'+ <link rel="preload" href="hero.jpg"'}</span>{'\n'}
          {'    '}
          <span style={{ color: '#86EFAC' }}>{'as="image" fetchpriority="high" />'}</span>{'\n'}
          <span style={{ color: '#86EFAC' }}>{'+ <img src="hero.jpg" loading="eager" />'}</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 14px', background: T.accent, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>Apply patch</div>
          <div style={{ padding: '6px 14px', background: T.bgSoft, border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, fontSize: 12 }}>Open PR ↗</div>
        </div>
      </div>
    </div>
  )
}

function LocalSEOMock() {
  const locations = [
    { name: 'Austin TX · Main St', rank: '#3', status: 'up' },
    { name: 'Dallas TX · Oak Ave', rank: '#7', status: 'up' },
    { name: 'Houston TX · Pine Rd', rank: '#12', status: 'down' },
    { name: 'San Antonio TX · Elm', rank: '#5', status: 'same' },
  ]
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: '20px 18px' }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Locations — 4 active</div>
        {locations.map(l => (
          <div key={l.name} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 8, marginBottom: 6,
            border: `1px solid ${T.line2}`, background: '#fff',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.ink }}>{l.name}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>NAP synced · 3 citations</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>{l.rank}</div>
              <div style={{ fontSize: 12, color: l.status === 'up' ? T.good : l.status === 'down' ? '#EF4444' : T.muted }}>
                {l.status === 'up' ? '↑' : l.status === 'down' ? '↓' : '–'}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ width: 180, borderLeft: `1px solid ${T.line2}`, background: T.bgSoft, padding: '20px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Sub-tools</div>
        {['Entity Mapper', 'NAP Sync', 'Local Queries', 'GBP Composer'].map((tool, i) => (
          <div key={tool} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 6, marginBottom: 4,
            background: i === 1 ? T.accentSoft : 'transparent',
            color: i === 1 ? T.accentDark : T.muted,
            fontSize: 12, fontWeight: i === 1 ? 500 : 400,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: i === 1 ? T.accent : T.line, flexShrink: 0 }} />
            {tool}
          </div>
        ))}
      </div>
    </div>
  )
}

function AppWindow({ children, title = 'app.optmizly.com', height = 420 }: {
  children: React.ReactNode; title?: string; height?: number
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 30px 60px -20px rgba(10,11,20,0.14), 0 8px 20px -8px rgba(10,11,20,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FB8181', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FCD34D', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#86EFAC', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: T.muted }}>{title}</div>
      </div>
      <div style={{ height, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionHead({ kicker, title, body, align = 'center' }: {
  kicker?: string; title: string; body?: string; align?: 'center' | 'left'
}) {
  return (
    <div style={{ textAlign: align, maxWidth: 720, margin: align === 'center' ? '0 auto' : '0' }}>
      {kicker && (
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 500, color: T.accent, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>
          {kicker}
        </div>
      )}
      <h2 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05, color: T.ink, margin: 0 }}>
        {title}
      </h2>
      {body && <p style={{ fontSize: 17, lineHeight: 1.55, color: T.body, marginTop: 16, marginBottom: 0 }}>{body}</p>}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const tools = [
  { name: 'Content Analyzer', desc: '8-dimension score — Issues & Entity tabs', tier: 'Free', icon: '📊' },
  { name: 'On-Page SEO', desc: 'Title, meta, headings, schema & technical audit', tier: 'Free', icon: '🔍' },
  { name: 'Content Optimizer', desc: 'Semantic analysis + Full Rewrite mode', tier: 'Pro', new: true, icon: '⚡' },
  { name: 'Content Planner', desc: 'AI-generated briefs and topic ideas', tier: 'Pro', icon: '💡' },
  { name: 'Rank Tracker', desc: 'Track positions over time with trend alerts', tier: 'Pro', icon: '📈' },
  { name: 'Competitor Spy', desc: 'Reverse-engineer competitor content strategy', tier: 'Pro', icon: '🕵️' },
  { name: 'E-E-A-T Analysis', desc: 'Experience, Expertise, Authority, Trust deep-dive', tier: 'Pro', icon: '🏆' },
  { name: 'Content Gap', desc: 'Topics competitors cover that you don\'t', tier: 'Pro', icon: '🕳️' },
  { name: 'AI Visibility', desc: 'Citation strategy + AI query mapping', tier: 'Pro', icon: '🔭' },
  { name: 'Backlinks', desc: 'Site-specific link building opportunities', tier: 'Pro', icon: '🔗' },
  { name: 'SEO Audit', desc: 'Full technical crawl with prioritised fix list', tier: 'Agency', icon: '🩺' },
  { name: 'Local SEO Suite', desc: '4 tools — entities, NAP, local queries, GBP', tier: 'Agency', icon: '📍' },
  { name: 'SERP Audit', desc: 'Competitor breakdown + recovery plan', tier: 'Agency', icon: '📊' },
  { name: 'Topical Authority', desc: 'Visual keyword cluster map with calendar', tier: 'Agency', icon: '🗺️' },
  { name: 'Cite Tracker', desc: 'Simulate ChatGPT & Perplexity responses', tier: 'Agency', icon: '🎯' },
  { name: 'AI Performance Fixer', desc: 'Fix Core Web Vitals with AI code patches', tier: 'Agency', icon: '⚡' },
  { name: 'Client Reports', desc: 'White-label reports — export & share', tier: 'Agency', icon: '📋' },
]

const testimonials = [
  {
    quote: 'We stopped buying audit tools. Optmizly fixes what the audit found — that\'s the whole game. Replaced 4 subscriptions with 1.',
    name: 'Sarah R.', role: 'Head of SEO · SaaS Startup, Austin TX', initial: 'S', color: '#4F46E5',
  },
  {
    quote: 'AI Performance Fixer saved us ~12 hrs of dev tickets a week. Pays for itself in the first sprint.',
    name: 'Marcus K.', role: 'Growth Lead · Atlas Labs, New York NY', initial: 'M', color: '#10B981',
  },
  {
    quote: '17 tools in one stack replaced six subscriptions. The Local SEO Suite alone is worth the price.',
    name: 'Priya L.', role: 'Founder · Velocity SEO, Los Angeles CA', initial: 'P', color: '#F59E0B',
  },
]

const faqItems = [
  ['What does the free tier include?', 'Content Analyzer with full 8-dimension scoring + Issues & Entities tabs. No credit card required.'],
  ['Will it preserve my brand voice?', 'Yes. Content Optimizer reviews diffs before applying every change — you approve each one.'],
  ['What CMS integrations do you support?', 'WordPress, Webflow, Contentful, Sanity, Ghost — and GitHub for code patches.'],
  ['How is this different from Surfer or Clearscope?', 'Those tools detect issues. We detect AND fix them — automatically. We\'re the only platform that ships the patch, not just the report.'],
  ['Is my content secure?', 'Encrypted at rest and in transit. Your content is never used to train shared models.'],
]

export default function HomePage() {
  const tierColor = (tier: string) =>
    tier === 'Free'
      ? { bg: T.goodSoft, fg: '#059669' }
      : tier === 'Pro'
      ? { bg: T.accentSoft, fg: T.accent }
      : { bg: '#FEF3C7', fg: '#D97706' }

  return (
    <div style={{ background: T.bg, color: T.ink }}>
      <PageHeader />
      <HomeHero />

      {/* Spacer for floating hero overlap */}
      <div style={{ height: 120 }} />

      {/* ── LOGO BAR ── */}
      <section style={{ padding: '30px clamp(24px, 5vw, 80px) 70px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Trusted by 500+ marketing teams worldwide
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(20px, 4vw, 48px)', flexWrap: 'wrap' }}>
          {['Northwind', 'Atlas Labs', 'Velocity SEO', 'Globex Co', 'Initech', 'Hooli', 'Acme Co'].map(n => (
            <div key={n} style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: '#9CA3AF' }}>{n}</div>
          ))}
        </div>
      </section>

      {/* ── DARK STATS CARD ── */}
      <section style={{ padding: '0 clamp(24px, 5vw, 80px) 100px' }}>
        <div style={{
          background: T.dark, color: '#fff', borderRadius: 20,
          padding: 'clamp(40px, 5vw, 60px) clamp(30px, 5vw, 56px)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 80% 50%, rgba(79,70,229,0.25) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
            {[
              ['2.4M', 'Fixes shipped', 'across customer sites'],
              ['−2.1s', 'Avg LCP improvement', 'after AI Performance Fixer'],
              ['+38%', 'Topical depth', 'post-optimization'],
              ['17', 'Specialist tools', 'Free, Pro & Agency tiers'],
            ].map(([v, l, s]) => (
              <div key={l}>
                <div style={{ fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 600, letterSpacing: -1.6, lineHeight: 1, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12, color: '#fff' }}>{l}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS GRID (bento-ish) ── */}
      <section style={{ padding: '0 clamp(24px, 5vw, 80px) 100px' }}>
        <SectionHead
          kicker="The toolkit"
          title="17 tools. Built for marketers who ship."
          body="One subscription replaces five. Free tier, Pro for solo operators, Agency for the full stack."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 56 }}>
          {tools.map(t => {
            const tc = tierColor(t.tier)
            return (
              <div key={t.name} style={{
                padding: 20, border: `1px solid ${T.line2}`, borderRadius: 12, background: '#fff',
                position: 'relative',
              }}>
                {t.new && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: T.accent, color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                    NEW
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 22 }}>{t.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: tc.bg, color: tc.fg }}>
                    {t.tier}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.45 }}>{t.desc}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── SPOTLIGHT 1 — Content Optimizer ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)', borderTop: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', background: T.accentSoft, color: T.accentDark, border: `1px solid ${T.accentBorder}`, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, marginBottom: 18 }}>
              Content Optimizer · Pro
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05, margin: '0 0 18px', color: T.ink }}>
              We don&apos;t just find issues.<br />We <em style={{ fontStyle: 'italic', color: T.accent }}>fix</em> them.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: T.body, marginBottom: 24 }}>
              Drop a URL or paste a draft. Content Optimizer rewrites weak passages, injects entities, restores topical depth — and hands back a publish-ready doc.
            </p>
            {[
              'Rewrites thin sections — preserves your voice',
              'Injects entities + structured headings',
              'Cites real, live sources (no fabrication)',
              'Outputs a clean diff or one-click publish',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: T.ink2, marginBottom: 10 }}>
                <span style={{ color: T.accent }}>✓</span> {f}
              </div>
            ))}
            <div style={{ marginTop: 24 }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: T.ink, color: '#fff', textDecoration: 'none',
              }}>
                Try Content Optimizer →
              </Link>
            </div>
          </div>
          <AppWindow height={360} title="optimizer · semantic-seo-guide.md">
            <div style={{ display: 'flex', height: '100%', fontSize: 12 }}>
              <div style={{ flex: 1, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: T.body, lineHeight: 1.6, marginBottom: 10 }}>
                  Semantic SEO involves the use of related concepts and entities to help search engines understand the full context of your content...
                </div>
                <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 11, color: '#92400E' }}>
                  ⚠ Missing: "Knowledge Graph", "entity salience", "co-occurrence"
                </div>
                <div style={{ background: T.goodSoft, border: '1px solid #6EE7B7', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#065F46' }}>
                  ✓ 3 entities injected — score: 51 → 82
                </div>
              </div>
              <div style={{ width: 140, borderLeft: `1px solid ${T.line2}`, background: T.bgSoft, padding: '16px 12px', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Dimensions</div>
                {[['Relevance', 88], ['Entities', 91], ['E-E-A-T', 74], ['Depth', 79]].map(([l, v]) => (
                  <div key={l as string} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.muted, marginBottom: 3 }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                    <div style={{ height: 3, background: T.line2, borderRadius: 99 }}>
                      <div style={{ height: 3, width: `${v}%`, background: T.accent, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AppWindow>
        </div>
      </section>

      {/* ── SPOTLIGHT 2 — Performance Fixer ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center' }}>
          <AppWindow height={340} title="performance · /pricing">
            <PerfFixerMock />
          </AppWindow>
          <div>
            <span style={{ display: 'inline-block', background: T.accentSoft, color: T.accentDark, border: `1px solid ${T.accentBorder}`, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, marginBottom: 18 }}>
              AI Performance Fixer · Agency
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05, margin: '0 0 18px', color: T.ink }}>
              Core Web Vitals, patched.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: T.body, marginBottom: 24 }}>
              LCP, CLS, FID — diagnosed and patched. Generated code is ready to copy, or open a PR straight into your repo.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[['−2.1s', 'avg LCP'], ['−83%', 'CLS reduction'], ['1-click', 'GitHub PR'], ['3 min', 'to first patch']].map(([v, l]) => (
                <div key={l} style={{ padding: 14, border: `1px solid ${T.line}`, borderRadius: 10, background: '#fff' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: T.ink }}>{v}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: T.ink, color: '#fff', textDecoration: 'none',
            }}>
              Run AI Performance Fixer →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT 3 — Local SEO ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)', borderTop: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', background: T.accentSoft, color: T.accentDark, border: `1px solid ${T.accentBorder}`, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, marginBottom: 18 }}>
              Local SEO Suite · 4 tools
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05, margin: '0 0 18px', color: T.ink }}>
              Local SEO without the spreadsheets.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: T.body, marginBottom: 24 }}>
              Manage 1 location or 1,000 from a single screen. Entities, NAP sync, local query mining, GBP post composition.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {['Entity Mapper', 'NAP Sync', 'Local Queries', 'GBP Composer'].map(n => (
                <span key={n} style={{ background: '#fff', border: `1px solid ${T.line}`, color: T.body, padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>{n}</span>
              ))}
            </div>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: T.ink, color: '#fff', textDecoration: 'none',
            }}>
              Explore Local SEO Suite →
            </Link>
          </div>
          <AppWindow height={340} title="local-seo · all locations">
            <LocalSEOMock />
          </AppWindow>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)' }}>
        <SectionHead kicker="How it works" title="From audit to fix in three steps." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginTop: 60, position: 'relative' }}>
          {[
            { n: '01', t: 'Connect', d: 'Drop a URL, connect your CMS, or push a draft via API. Indexed in under a minute.' },
            { n: '02', t: 'Detect', d: '17 specialists run in parallel — content, performance, E-E-A-T, AI visibility, local. Get a prioritised fix list.' },
            { n: '03', t: 'Fix', d: 'Approve fixes individually or apply all. We rewrite, patch, sync, and publish — preserving your voice.' },
          ].map(s => (
            <div key={s.n} style={{ padding: 28, border: `1px solid ${T.line}`, borderRadius: 14, background: '#fff' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: T.ink, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18, fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600,
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, color: T.ink, marginBottom: 8 }}>{s.t}</div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: T.body, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)', borderTop: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <SectionHead kicker="Detect vs detect + fix" title="Why teams switch from audit-only tools." />
        <div style={{ marginTop: 56, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line2}`, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: T.muted, letterSpacing: '0.06em' }}>CAPABILITY</div>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line2}`, borderLeft: `1px solid ${T.line2}`, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: T.muted }}>Other tools</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.body }}>Detect.</div>
            </div>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line2}`, borderLeft: `1px solid ${T.line2}`, textAlign: 'center', background: T.accentSoft }}>
              <div style={{ fontSize: 12, color: T.accentDark }}>Optmizly</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.accentDark }}>Detect + Fix.</div>
            </div>
          </div>
          {[
            ['Content gaps', 'Lists missing entities', 'Rewrites in place'],
            ['Core Web Vitals', 'Shows your LCP score', 'Generates code patches'],
            ['E-E-A-T issues', 'Flags missing author bio', 'Drafts bio + injects schema'],
            ['AI visibility', 'Tells you you\'re invisible', 'Maps queries + drafts citations'],
            ['NAP inconsistency', 'Lists 47 directories', 'Syncs all 47, one click'],
            ['Topical authority', 'Shows a 62% score', 'Generates cluster + briefs'],
            ['Local queries', 'Surfaces query data', 'Drafts GBP posts answering them'],
          ].map(([cap, det, fix], i, arr) => (
            <div key={cap} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', borderBottom: i < arr.length - 1 ? `1px solid ${T.line2}` : 'none' }}>
              <div style={{ padding: '16px 24px', fontSize: 14, fontWeight: 500, color: T.ink }}>{cap}</div>
              <div style={{ padding: '16px 24px', borderLeft: `1px solid ${T.line2}`, fontSize: 14, color: T.muted, textAlign: 'center' }}>{det}</div>
              <div style={{ padding: '16px 24px', borderLeft: `1px solid ${T.line2}`, fontSize: 14, textAlign: 'center', background: 'rgba(238,242,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ color: T.good }}>✓</span> {fix}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)' }}>
        <SectionHead kicker="What customers say" title="Marketers who ship, talking shop." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 56 }}>
          {/* Featured dark card */}
          <div style={{
            padding: 32, background: T.ink, color: '#fff', borderRadius: 14,
            position: 'relative', overflow: 'hidden',
            gridColumn: 'span 1',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(79,70,229,0.25) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>&ldquo;</div>
              <p style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 500, letterSpacing: -0.4, margin: '0 0 24px' }}>
                {testimonials[0].quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: '#A5B4FC', color: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {testimonials[0].initial}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{testimonials[0].name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{testimonials[0].role}</div>
                </div>
              </div>
            </div>
          </div>
          {testimonials.slice(1).map(t => (
            <div key={t.name} style={{ padding: 24, border: `1px solid ${T.line}`, borderRadius: 14, background: '#fff', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 20, color: T.accent }}>&ldquo;</div>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: T.ink, margin: 0, flex: 1, letterSpacing: -0.1 }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: `1px solid ${T.line2}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: t.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {t.initial}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <PagePricing />

      {/* ── FAQ ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)', borderTop: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 80 }}>
          <div>
            <SectionHead kicker="FAQ" title="Common questions." align="left" />
            <p style={{ fontSize: 14, color: T.body, marginTop: 18, lineHeight: 1.6 }}>
              Can&apos;t find what you&apos;re looking for?{' '}
              <a href="mailto:hello@optmizly.com" style={{ color: T.accent, fontWeight: 500, textDecoration: 'none' }}>
                Contact us →
              </a>
            </p>
          </div>
          <div>
            {faqItems.map(([q, a], i) => (
              <div key={q} style={{ padding: '20px 0', borderBottom: i < faqItems.length - 1 ? `1px solid ${T.line2}` : 'none' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: -0.2, marginBottom: 10 }}>{q}</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '0 clamp(24px, 5vw, 80px) 100px' }}>
        <div style={{
          background: T.dark, color: '#fff', borderRadius: 24,
          padding: 'clamp(60px, 7vw, 100px) clamp(30px, 5vw, 56px)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(79,70,229,0.31) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 600, letterSpacing: -2, lineHeight: 1, maxWidth: 720, margin: '0 auto 22px' }}>
              Stop reading reports.<br />Start shipping fixes.
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.5 }}>
              Free tier includes 5 auto-fixes / month. No card. No call. Just results.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                background: '#fff', color: T.ink, border: '1px solid #fff',
                textDecoration: 'none',
              }}>
                Start free trial →
              </Link>
              <Link href="#pricing" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                textDecoration: 'none',
              }}>
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: 'clamp(40px, 5vw, 60px) clamp(24px, 5vw, 80px) 40px', borderTop: `1px solid ${T.line2}`, background: T.bgSoft }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>◈</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: -0.3, color: T.ink }}>Optmizly</span>
            </div>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, maxWidth: 220, margin: 0 }}>
              The only SEO platform that detects and fixes your content issues — automatically.
            </p>
          </div>
          {[
            ['Product', ['Content Optimizer', 'AI Performance Fixer', 'Local SEO Suite', 'All 17 tools']],
            ['Solutions', ['For SEO teams', 'For agencies', 'For local businesses', 'For enterprise']],
            ['Resources', ['Blog', 'Pricing', 'Privacy Policy', 'Terms of Service']],
            ['Company', ['About', 'Contact', 'hello@optmizly.com']],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 14 }}>{h as string}</div>
              {(items as string[]).map(item => {
                const isEmail = item.includes('@')
                const href = isEmail ? `mailto:${item}` : item === 'Blog' ? '/blog' : item === 'Pricing' ? '/pricing' : item === 'Privacy Policy' ? '/privacy' : item === 'Terms of Service' ? '/terms' : '#'
                return (
                  <div key={item} style={{ marginBottom: 8 }}>
                    <a href={href} style={{ fontSize: 13, color: T.muted, textDecoration: 'none' }}>{item}</a>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div style={{
          borderTop: `1px solid ${T.line2}`, paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          fontSize: 12, color: T.muted,
        }}>
          <div>© 2026 Optmizly, Inc. · AI-powered SEO for Google & AI search</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/privacy" style={{ color: T.muted, textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: T.muted, textDecoration: 'none' }}>Terms</Link>
            <a href="mailto:hello@optmizly.com" style={{ color: T.muted, textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
