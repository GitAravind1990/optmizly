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
  accent: '#0000FF',
  accentDark: '#0000CC',
  accentSoft: '#E0E0FF',
  accentBorder: '#9999FF',
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
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Generated Code Patch</div>
        <div style={{ background: T.ink, borderRadius: 8, padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#9999FF', lineHeight: 1.6 }}>
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
  { name: 'Content Analyzer', desc: 'Full-spectrum audit across 8 scoring dimensions with Issues and Entities tabs', tier: 'Free' },
  { name: 'On-Page SEO', desc: 'Audit titles, meta tags, headings, schema markup, and technical signals in one pass', tier: 'Free' },
  { name: 'Content Optimizer', desc: 'Semantic gap analysis with full-document rewrite and entity injection', tier: 'Pro', new: true },
  { name: 'Content Planner', desc: 'Data-driven briefs and topic cluster plans built around ranking intent', tier: 'Pro' },
  { name: 'Rank Tracker', desc: 'Position monitoring with trend alerts and SERP change notifications', tier: 'Pro' },
  { name: 'Competitor Spy', desc: 'Uncover the exact content strategy driving your competitors\' rankings', tier: 'Pro' },
  { name: 'E-E-A-T Analysis', desc: 'Deep audit of authorship signals, source quality, and trust indicators', tier: 'Pro' },
  { name: 'Content Gap', desc: 'Surface the precise topics your competitors rank for that you do not', tier: 'Pro' },
  { name: 'AI Visibility', desc: 'See how ChatGPT and Perplexity represent your brand — and improve it', tier: 'Pro' },
  { name: 'Backlinks', desc: 'Identify high-value link opportunities tailored to your domain and niche', tier: 'Pro' },
  { name: 'SEO Audit', desc: 'Comprehensive technical crawl with a ranked, actionable remediation list', tier: 'Agency' },
  { name: 'Local SEO Suite', desc: 'Entity mapping, NAP consistency, local query mining, and GBP management', tier: 'Agency' },
  { name: 'SERP Audit', desc: 'Full SERP breakdown across competing pages with a tailored recovery plan', tier: 'Agency' },
  { name: 'Topical Authority', desc: 'Visual cluster mapping with an editorial calendar to close authority gaps', tier: 'Agency' },
  { name: 'Cite Tracker', desc: 'Monitor and improve how AI search engines cite and reference your content', tier: 'Agency' },
  { name: 'AI Performance Fixer', desc: 'Diagnose LCP, CLS, and FID issues — then deploy the production-ready code patch', tier: 'Agency' },
  { name: 'Client Reports', desc: 'Fully white-labelled reports exportable as PDF or shareable via link', tier: 'Agency' },
]

const testimonials = [
  {
    quote: 'We cancelled four subscriptions the week we went live. Optmizly finds the issue and ships the fix — that\'s the whole job done in one place.',
    name: 'Sarah R.', role: 'Head of SEO · SaaS company, Austin TX', initial: 'S', color: '#0000FF',
  },
  {
    quote: 'Performance Fixer cut our dev ticket backlog by 12 hours a week. The ROI was visible before the first sprint was over.',
    name: 'Marcus K.', role: 'Growth Lead · Stackworks, New York NY', initial: 'M', color: '#10B981',
  },
  {
    quote: 'We replaced six separate tools and got measurably better results. The Local SEO Suite alone justifies the Agency plan.',
    name: 'Priya L.', role: 'Founder · Velocity SEO, Los Angeles CA', initial: 'P', color: '#F59E0B',
  },
]

const faqItems = [
  ['What is included in the free plan?', 'The full Content Analyzer — 8-dimension scoring with Issues and Entities tabs — at no cost, with no credit card required. It is the most comprehensive free SEO audit available.'],
  ['Will rewrites change my brand voice?', 'No. Every rewrite goes through a tracked-changes review before anything is published. You approve or reject each suggestion individually — nothing ships without your sign-off.'],
  ['Which CMS platforms do you support?', 'WordPress, Webflow, Contentful, Sanity, and Ghost are all supported natively. Code patches push directly to GitHub via pull request.'],
  ['How is this different from Surfer SEO or Clearscope?', 'Those tools score your content and tell you what is missing. Optmizly closes the gaps — it rewrites the sections, injects the entities, and publishes the improved document. We ship the result, not the report.'],
  ['Is my content kept private?', 'Yes. All content is encrypted in transit and at rest. Your data is never used to train shared models, and you retain full ownership of everything you process through the platform.'],
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
            Used by 500+ SEO teams and digital agencies
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(20px, 4vw, 48px)', flexWrap: 'wrap' }}>
          {['Meridian', 'Stackworks', 'Broadwell', 'Arco Digital', 'Lumio', 'Paragon', 'Helix Agency'].map(n => (
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
            background: 'radial-gradient(ellipse at 80% 50%, rgba(0,0,255,0.25) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
            {[
              ['48K', 'Fixes deployed', 'across active accounts'],
              ['−2.1s', 'Avg LCP improvement', 'per Performance Fixer run'],
              ['+38%', 'Topical authority gain', 'avg. after Content Optimizer'],
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
          kicker="The full toolkit"
          title="17 specialist tools. One subscription."
          body="Every tool goes beyond the audit — it acts. From content rewrites to code patches to citation fixes, the full scope of SEO execution is covered."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 56 }}>
          {tools.map(t => {
            const tc = tierColor(t.tier)
            return (
              <div key={t.name} style={{
                padding: '18px 20px', border: `1px solid ${T.line2}`, borderRadius: 12, background: '#fff',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {t.new && (
                      <span style={{ background: T.accent, color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999 }}>
                        New
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: tc.bg, color: tc.fg }}>
                      {t.tier}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.5 }}>{t.desc}</div>
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
              Your content, rewritten<br />to <em style={{ fontStyle: 'italic', color: T.accent }}>rank.</em>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: T.body, marginBottom: 24 }}>
              Paste a URL or a draft. Optmizly audits every section across eight ranking dimensions, closes each gap, and returns a publish-ready document — with your voice intact and every claim sourced.
            </p>
            {[
              'Rewrites underperforming sections without changing your voice',
              'Closes semantic gaps with entity injection and structured headings',
              'Sources every claim from verified, live references',
              'Delivers a tracked-changes diff or publishes directly to your CMS',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: T.ink2, marginBottom: 10, lineHeight: 1.5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 1, background: T.accent, flexShrink: 0, marginTop: 5 }} />
                {f}
              </div>
            ))}
            <div style={{ marginTop: 24 }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: T.ink, color: '#fff', textDecoration: 'none',
              }}>
                Optimize your first article →
              </Link>
            </div>
          </div>
          <AppWindow height={360} title="optimizer · semantic-seo-guide.md">
            <div style={{ display: 'flex', height: '100%', fontSize: 12 }}>
              <div style={{ flex: 1, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: T.body, lineHeight: 1.6, marginBottom: 10 }}>
                  Semantic SEO involves the use of related concepts and entities to help search engines understand the full context of your content...
                </div>
                <div style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: '0 6px 6px 0', padding: '8px 10px', marginBottom: 8, fontSize: 11, color: '#92400E' }}>
                  Missing: &ldquo;Knowledge Graph&rdquo;, &ldquo;entity salience&rdquo;, &ldquo;co-occurrence&rdquo;
                </div>
                <div style={{ background: T.goodSoft, borderLeft: '3px solid #10B981', borderRadius: '0 6px 6px 0', padding: '8px 10px', fontSize: 11, color: '#065F46' }}>
                  3 entities injected — score: 51 &rarr; 82
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
              Performance Fixer · Agency
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05, margin: '0 0 18px', color: T.ink }}>
              Fix Core Web Vitals<br />without a developer.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: T.body, marginBottom: 24 }}>
              LCP, CLS, FID — every metric is diagnosed, explained, and patched. The code is production-ready: copy it directly or open a GitHub PR from the tool. No dev ticket. No sprint delay.
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
              Fix your Core Web Vitals →
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
              Every location.<br />Every market. One screen.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: T.body, marginBottom: 24 }}>
              Keep NAP consistent across hundreds of directories, surface high-intent local queries, and draft GBP posts — for one location or a thousand, managed from a single dashboard.
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
              Manage your locations →
            </Link>
          </div>
          <AppWindow height={340} title="local-seo · all locations">
            <LocalSEOMock />
          </AppWindow>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)' }}>
        <SectionHead kicker="How it works" title="From broken to fixed in three steps." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginTop: 60, position: 'relative' }}>
          {[
            { n: '01', t: 'Connect', d: 'Drop a URL, connect your CMS, or push content via API. Optmizly indexes and begins auditing in under a minute.' },
            { n: '02', t: 'Audit', d: '17 specialist auditors run simultaneously across content depth, Core Web Vitals, E-E-A-T, local signals, and AI visibility. You receive one ranked fix list — not a wall of data to interpret.' },
            { n: '03', t: 'Fix', d: 'Review every fix before it ships, or apply the full list in one click. Optmizly rewrites, patches, syncs, and publishes — then delivers a results summary.' },
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
        <SectionHead kicker="The difference that matters" title="A report tells you what's wrong. We fix it." />
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
                <span style={{ width: 7, height: 7, borderRadius: 2, background: T.good, flexShrink: 0 }} /> {fix}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '100px clamp(24px, 5vw, 80px)' }}>
        <SectionHead kicker="In their own words" title="Teams that replaced multiple tools with one." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 56 }}>
          {/* Featured dark card */}
          <div style={{
            padding: 32, background: T.ink, color: '#fff', borderRadius: 14,
            position: 'relative', overflow: 'hidden',
            gridColumn: 'span 1',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(0,0,255,0.25) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>&ldquo;</div>
              <p style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 500, letterSpacing: -0.4, margin: '0 0 24px' }}>
                {testimonials[0].quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: '#9999FF', color: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
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
            background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(0,0,255,0.31) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 600, letterSpacing: -2, lineHeight: 1.05, maxWidth: 720, margin: '0 auto 22px' }}>
              Stop paying for findings.<br />Start getting results.
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Start on the free plan today — no credit card, no sales call. When you are ready to automate more, upgrading takes 60 seconds.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                background: '#fff', color: T.ink, border: '1px solid #fff',
                textDecoration: 'none',
              }}>
                Start for free →
              </Link>
              <Link href="#pricing" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                textDecoration: 'none',
              }}>
                View plans
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
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: -0.5 }}>O</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: -0.3, color: T.ink }}>Optmizly</span>
            </div>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, maxWidth: 220, margin: 0 }}>
              The SEO platform that acts on its findings — content, code, and citations, all in one place.
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
