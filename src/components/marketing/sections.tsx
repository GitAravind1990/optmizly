/**
 * Homepage sections.
 *
 * Server components — no state, no effects, no `use client`. They render in the initial
 * HTML, which matters twice over here: it is what the page's own AI Search Readiness audit
 * would want to see, and it keeps the JS the browser has to parse to the two pieces that
 * genuinely need it (the audit widget and the header menu).
 *
 * Every claim in the copy below is either checkable in this repo or deliberately hedged.
 * Nothing counts customers, and nothing promises a ranking.
 */

import Link from 'next/link'
import { T, Icon, SectionHead } from './tokens'
import { FreeAudit } from '../free-audit'
import {
  TESTIMONIALS, CUSTOMER_LOGOS, USAGE_STATS,
  hasAnyProof, showPlaceholders,
} from '@/lib/social-proof'

const WRAP: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' }

// ── 3. PROBLEM ────────────────────────────────────────────────────────────────

/**
 * The "why now". Names the shift in the visitor's own experience rather than in jargon,
 * because GEO and AEO mean nothing to someone who has not met the terms — the pillars
 * section immediately after is where they get defined.
 */
export function ProblemSection() {
  const stages = [
    {
      icon: 'search',
      tag: 'Then',
      title: 'Traditional search',
      body: 'Someone types a query, scans ten blue links and picks one. You compete for a position on a page.',
    },
    {
      icon: 'sparkle',
      tag: 'Now',
      title: 'Generative search',
      body: 'An AI Overview or a chat assistant reads the sources and writes the answer. You compete to be one of the sources it reads.',
    },
    {
      icon: 'bot',
      tag: 'Next',
      title: 'Answer engines',
      body: 'The answer arrives with a citation and no click at all. You compete to be the sentence it quotes, and the name attached to it.',
    },
  ]

  return (
    <section className="opt-s opt-sy" style={{ ...WRAP, padding: '120px 32px' }}>
      <SectionHead
        kicker="The shift"
        title="Search is changing."
        body="The same question now gets answered in three different places, and only one of them is the results page you have been optimizing for."
      />

      <div className="opt-stage-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18, marginTop: 60,
      }}>
        {stages.map((s, i) => (
          <div key={s.title} style={{
            position: 'relative', padding: 28, background: '#fff',
            border: `1px solid ${i === 2 ? T.blueBorder : T.line}`, borderRadius: 20,
            boxShadow: i === 2 ? '0 12px 32px -18px rgba(0,0,255,0.35)' : '0 2px 8px rgba(11,17,32,0.03)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 18,
              padding: '5px 11px', borderRadius: 999,
              background: i === 2 ? T.blueSoft : T.line2,
              fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
              textTransform: 'uppercase', color: i === 2 ? T.blue : T.muted,
            }}>
              {s.tag}
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: i === 2 ? T.grad : T.blueSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
            }}>
              <Icon name={s.icon} size={21} color={i === 2 ? '#fff' : T.blue} />
            </div>
            <h3 style={{
              fontFamily: T.sans, fontSize: 20, fontWeight: 600, letterSpacing: -0.5,
              color: T.ink, margin: '0 0 8px',
            }}>{s.title}</h3>
            <p style={{ fontFamily: T.sans, fontSize: 14.5, lineHeight: 1.6, color: T.body, margin: 0 }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <p style={{
        maxWidth: 700, margin: '40px auto 0', textAlign: 'center',
        fontFamily: T.sans, fontSize: 16.5, lineHeight: 1.6, color: T.body,
      }}>
        Your existing SEO work still counts — the same crawlers, the same content. What has
        changed is that being readable, quotable and attributable now decides whether you
        appear at all. That is the gap Optmizly is built to close.
      </p>
    </section>
  )
}

// ── 4. FREE AUDIT ─────────────────────────────────────────────────────────────

/**
 * Reciprocity, placed high on purpose — above the pillars, above pricing, above the
 * founder story. It is the only section that gives the visitor something before asking for
 * anything, and burying it below six explainers wastes it.
 */
export function FreeAuditSection() {
  return (
    <section
      id="free-audit"
      // Anchor links land under the sticky header without this.
      style={{ scrollMarginTop: 80, background: T.bgSoft, borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}` }}
    >
      <div className="opt-s opt-sy" style={{ ...WRAP, padding: '110px 32px' }}>
        <SectionHead
          kicker="Free AI search readiness audit"
          title="How ready is your website for AI search?"
          body="Enter a URL. We read the page, check what an AI crawler would actually see, and show you every issue we find — in about five seconds."
        />
        <div style={{ marginTop: 44 }}>
          <FreeAudit location="homepage" />
        </div>
      </div>
    </section>
  )
}

// ── 5. THREE PILLARS ──────────────────────────────────────────────────────────

/**
 * The one idea the page exists to make memorable: SEO + GEO + AEO in one platform.
 *
 * Von Restorff by hierarchy rather than by colour — this is the only section on a dark
 * ground, so it is the thing the eye returns to on a scroll back up. Adding a fourth
 * accent colour would have made it louder and less distinct.
 */
export function PillarsSection() {
  const pillars = [
    {
      abbr: 'SEO',
      name: 'Search Engine Optimization',
      question: '“Can Google rank it?”',
      body: 'The foundation: crawlable pages, clean structure, titles and descriptions that earn the click, and content that matches what people actually search.',
      points: ['Technical + on-page audits', 'Keyword research & clustering', 'Rank tracking'],
    },
    {
      abbr: 'GEO',
      name: 'Generative Engine Optimization',
      question: '“Will an AI use it as a source?”',
      body: 'Generative engines read a shortlist of sources and write from them. GEO is the work of getting onto that shortlist — reachable by AI crawlers, attributable to a real author, resolvable to a real entity.',
      points: ['AI crawler access', 'Entity & author signals', 'Citation tracking'],
    },
    {
      abbr: 'AEO',
      name: 'Answer Engine Optimization',
      question: '“Is it the sentence they quote?”',
      body: 'Answer engines lift a specific passage. AEO is structuring content so the answer to a real question is findable, self-contained and marked up as an answer.',
      points: ['FAQ & HowTo schema', 'Question-led structure', 'Direct-answer formatting'],
    },
  ]

  return (
    <section style={{ background: T.ink900, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(55% 60% at 50% 0%, rgba(59,91,255,0.28), transparent 65%)',
      }} />
      <div className="opt-s opt-sy" style={{ ...WRAP, position: 'relative', padding: '120px 32px' }}>
        <SectionHead
          dark
          kicker="The three pillars"
          title={<>Three kinds of optimization. <span style={{
            background: T.gradText, WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>One platform.</span></>}
          body="Most tools do the first one. Being found in 2026 needs all three, and they are not the same work."
        />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 20, marginTop: 60,
        }}>
          {pillars.map(p => (
            <div key={p.abbr} style={{
              padding: 30, borderRadius: 22,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
            }}>
              {/* A real heading, not a styled div: these three are the terms the page is
                  teaching, and they should be findable as headings by a screen reader and
                  by the engines this section is about. */}
              <h3 style={{
                fontFamily: T.sans, fontSize: 34, fontWeight: 700, letterSpacing: -1.5,
                background: T.gradText, WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                margin: '0 0 4px',
              }}>{p.abbr}</h3>
              <div style={{
                fontFamily: T.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)', marginBottom: 18,
              }}>{p.name}</div>
              <div style={{
                fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12,
              }}>{p.question}</div>
              <p style={{
                fontFamily: T.sans, fontSize: 14.5, lineHeight: 1.6,
                color: 'rgba(255,255,255,0.66)', margin: '0 0 20px',
              }}>{p.body}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.points.map(pt => (
                  <div key={pt} style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    fontFamily: T.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.82)',
                  }}>
                    <Icon name="check" size={14} color={T.cyan} />{pt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 6. WORKFLOW ───────────────────────────────────────────────────────────────

/**
 * The ecosystem view: five stages that hand off to each other, each naming the tools that
 * actually exist in the product. Naming real tools is the point — a workflow diagram whose
 * boxes do not correspond to anything you can click is decoration.
 */
export function WorkflowSection() {
  const stages = [
    {
      icon: 'compass', step: 'Discover',
      body: 'Find the queries, gaps and topics worth owning.',
      tools: ['Keyword Research', 'Content Gap', 'Content Planner'],
    },
    {
      icon: 'search', step: 'Audit',
      body: 'Measure what is actually on the page today.',
      tools: ['SEO Audit', 'Content Analyzer', 'On-Page SEO', 'E-E-A-T'],
    },
    {
      icon: 'wrench', step: 'Optimize',
      body: 'Fix the specific issues, in priority order.',
      tools: ['Content Optimizer', 'Performance Fixer', 'Topical Authority'],
    },
    {
      icon: 'feather', step: 'Generate',
      body: 'Draft and rewrite with the findings applied.',
      tools: ['Full Rewrite', 'Content Planner'],
    },
    {
      icon: 'chart', step: 'Monitor',
      body: 'Track position, citations and visibility over time.',
      tools: ['Rank Tracker', 'AI Visibility', 'Cite Tracker'],
    },
  ]

  return (
    <section
      id="how-it-works"
      style={{ scrollMarginTop: 80, background: T.bgSoft, borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}` }}
    >
      <div className="opt-s opt-sy" style={{ ...WRAP, padding: '120px 32px' }}>
        <SectionHead
          kicker="How it fits together"
          title="One loop, not twelve tabs."
          body="Each stage hands its output to the next. The audit tells the optimizer what to fix; the optimizer tells the monitor what to watch."
        />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14, marginTop: 60,
        }}>
          {stages.map((s, i) => (
            <div key={s.step} style={{
              position: 'relative', padding: 24, background: '#fff',
              border: `1px solid ${T.line}`, borderRadius: 18,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11, background: T.blueSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={19} color={T.blue} />
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 style={{
                fontFamily: T.sans, fontSize: 17, fontWeight: 600, letterSpacing: -0.4,
                color: T.ink, margin: '0 0 7px',
              }}>{s.step}</h3>
              <p style={{ fontFamily: T.sans, fontSize: 13.5, lineHeight: 1.55, color: T.body, margin: '0 0 14px' }}>
                {s.body}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.tools.map(t => (
                  <span key={t} style={{
                    fontFamily: T.sans, fontSize: 11.5, color: T.ink2,
                    padding: '4px 9px', borderRadius: 7, background: T.line2,
                  }}>{t}</span>
                ))}
              </div>
              {i < stages.length - 1 && (
                <div className="opt-step-arrow" style={{
                  position: 'absolute', right: -10, top: 44, zIndex: 2,
                  width: 22, height: 22, borderRadius: 999, background: '#fff',
                  border: `1px solid ${T.line}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="arrow" size={11} color={T.blue} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 7. FEATURES ───────────────────────────────────────────────────────────────

/** Six capabilities, benefit-first. Not all 23 tools: a list nobody finishes reading
 *  persuades nobody, and the full set is one click away on the pricing page. */
export function FeaturesSection() {
  const features = [
    {
      icon: 'shield', title: 'Know if AI can even read you',
      body: 'Check whether answer-engine crawlers are allowed, whether your content survives without JavaScript, and whether anything identifies who wrote it.',
    },
    {
      icon: 'target', title: 'Fix pages, not just find problems',
      body: 'Every finding comes with the specific change to make. The Content Optimizer works through a page section by section and shows its scoring.',
    },
    {
      icon: 'cluster', title: 'Research grounded in real data',
      body: 'Keyword volumes, SERP positions and local rankings come from live providers, not from a model asked to guess. Estimates are labelled as estimates.',
    },
    {
      icon: 'quote', title: 'Track where AI cites you',
      body: 'See which queries surface your brand across AI answers, and which competitors are being named instead.',
    },
    {
      icon: 'pin', title: 'Local visibility, mapped',
      body: 'Geogrid scans rankings across a grid of real coordinates, so you can see where you show up and where you vanish.',
    },
    {
      icon: 'doc', title: 'Reports a client will read',
      body: 'Export findings as CSV or a client-ready PDF, with the live-versus-estimated distinction preserved in the file.',
    },
  ]

  return (
    <section className="opt-s opt-sy" style={{ ...WRAP, padding: '120px 32px' }}>
      <SectionHead
        kicker="What you get"
        title="Built to answer one question: why aren’t we showing up?"
        body="Twenty-three tools across the three plans. These are the ones that change how the work feels."
      />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20, marginTop: 60,
      }}>
        {features.map(f => (
          <div key={f.title} style={{
            padding: 28, background: '#fff', border: `1px solid ${T.line}`,
            borderRadius: 20, boxShadow: '0 2px 8px rgba(11,17,32,0.03)',
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, background: T.grad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, boxShadow: '0 6px 16px -6px rgba(0,0,255,0.4)',
            }}>
              <Icon name={f.icon} size={22} color="#fff" />
            </div>
            <h3 style={{
              fontFamily: T.sans, fontSize: 18.5, fontWeight: 600, letterSpacing: -0.4,
              color: T.ink, margin: '0 0 8px',
            }}>{f.title}</h3>
            <p style={{ fontFamily: T.sans, fontSize: 14.5, lineHeight: 1.6, color: T.body, margin: 0 }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 4b. SUNK COST / EXISTING CONTENT ──────────────────────────────────────────

/**
 * Sunk-cost framing, used the one way it is not a dark pattern: pointing at an asset the
 * visitor already owns rather than at money they have already lost.
 *
 * The line it must not cross is telling anyone to keep going with something that is not
 * working. So the copy says the content is worth re-using *if it is good*, and the audit
 * is what tells them which of it is.
 */
export function ExistingContentSection() {
  const chain = [
    { icon: 'doc', label: 'Existing content', note: 'The pages you already paid to write' },
    { icon: 'search', label: 'Audit', note: 'What is working, what is invisible' },
    { icon: 'wrench', label: 'Optimize', note: 'Fix structure, schema, attribution' },
    { icon: 'globe', label: 'SEO + GEO + AEO', note: 'Readable everywhere search happens' },
    { icon: 'chart', label: 'Monitor', note: 'Watch position and citations move' },
  ]

  return (
    <section className="opt-s opt-sy" style={{ ...WRAP, padding: '120px 32px' }}>
      <div style={{
        borderRadius: 28, border: `1px solid ${T.blueBorder}`, background: T.blueSoft,
        padding: 'clamp(32px, 5vw, 64px)',
      }}>
        <SectionHead
          kicker="Your existing content is an asset"
          title="Don’t start over. Optimize what you’ve already built."
          body="You have already invested time and money in your website and your content. Most of it does not need rewriting — it needs to be readable by the engines that now decide who gets seen."
        />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, margin: '48px 0 0',
        }}>
          {chain.map((c, i) => (
            <div key={c.label} style={{
              position: 'relative', padding: 20, background: '#fff',
              border: `1px solid ${T.blueBorder}`, borderRadius: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Icon name={c.icon} size={18} color={T.blue} />
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>
                {c.label}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 12.5, lineHeight: 1.45, color: T.body }}>
                {c.note}
              </div>
              {i < chain.length - 1 && (
                <div className="opt-step-arrow" style={{
                  position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  width: 20, height: 20, borderRadius: 999, background: '#fff',
                  border: `1px solid ${T.blueBorder}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="arrow" size={10} color={T.blue} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="#free-audit" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 28px', height: 52, borderRadius: 14,
            fontFamily: T.sans, fontSize: 16, fontWeight: 600,
            background: T.grad, color: '#fff', textDecoration: 'none',
            boxShadow: '0 8px 24px -8px rgba(0,0,255,0.5)',
          }}>
            Analyze My Existing Content <Icon name="arrow" size={16} color="#fff" />
          </Link>
          <p style={{
            fontFamily: T.sans, fontSize: 13.5, color: T.body, margin: '16px auto 0', maxWidth: 520, lineHeight: 1.55,
          }}>
            If a page is not worth keeping, the audit will tell you that too. Optimizing
            something that was never working is not a strategy.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── 8. SOCIAL PROOF ───────────────────────────────────────────────────────────

/**
 * Bandwagon, within the constraint that there is no bandwagon yet.
 *
 * Optmizly has no publishable customers, so this section proves what it can actually
 * prove: what the product is made of and how it behaves. Every line here is checkable in
 * this repository. The moment real testimonials, logos or usage numbers land in
 * `social-proof.ts`, they render above this and this stays as the floor.
 *
 * The alternative — "Trusted by growth teams of every kind" over five industry icons,
 * which is what this section used to say — is a trust claim with nothing behind it, and it
 * costs more than it earns the first time someone asks who.
 */
export function SocialProofSection() {
  const facts = [
    {
      icon: 'layers', stat: '23',
      label: 'tools in one platform',
      note: 'Two free, ten more on Pro, eleven more on Agency. Counted from the product, not from a marketing page.',
    },
    {
      icon: 'shield', stat: '3',
      label: 'tools free with no account',
      note: 'This readiness audit, the E-E-A-T checker and AI Regex. Five runs a day each, no card, nothing stored.',
    },
    {
      icon: 'eye', stat: '100%',
      label: 'of live data labelled as live',
      note: 'Where a number is estimated rather than measured, the interface says so — and so does the CSV or PDF you export.',
    },
  ]

  return (
    <section className="opt-s opt-sy" style={{ ...WRAP, padding: '120px 32px' }}>
      <SectionHead
        kicker="Built for the new era of search"
        title="Early, and honest about it."
        body="Optmizly is a young product. Rather than borrow credibility we have not earned, here is what can be checked."
      />

      {/* Real proof renders first, when there is any. */}
      {USAGE_STATS.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 18, marginTop: 52,
        }}>
          {USAGE_STATS.map(s => (
            <div key={s.label} style={{
              padding: 26, background: '#fff', border: `1px solid ${T.line}`,
              borderRadius: 18, textAlign: 'center',
            }}>
              <div style={{
                fontFamily: T.sans, fontSize: 38, fontWeight: 700, letterSpacing: -1.6, color: T.blue,
              }}>{s.value}</div>
              <div style={{ fontFamily: T.sans, fontSize: 14, color: T.body, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {TESTIMONIALS.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20, marginTop: 52,
        }}>
          {TESTIMONIALS.map(t => (
            <figure key={t.name} style={{
              margin: 0, padding: 28, background: '#fff',
              border: `1px solid ${T.line}`, borderRadius: 20,
            }}>
              <Icon name="quote" size={22} color={T.blueBorder} />
              <blockquote style={{
                margin: '14px 0 18px', fontFamily: T.sans, fontSize: 15.5,
                lineHeight: 1.6, color: T.ink, fontStyle: 'normal',
              }}>“{t.quote}”</blockquote>
              <figcaption style={{ fontFamily: T.sans, fontSize: 13.5, color: T.muted }}>
                <strong style={{ color: T.ink, fontWeight: 600 }}>{t.name}</strong> · {t.role}, {t.company}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {CUSTOMER_LOGOS.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
          gap: 32, marginTop: 52,
        }}>
          {CUSTOMER_LOGOS.map(l => (
            <img key={l.name} src={l.src} alt={l.name} style={{ height: 28, opacity: 0.7 }} />
          ))}
        </div>
      )}

      {/* Empty slots, visible only when explicitly switched on for design work. */}
      {showPlaceholders && !hasAnyProof && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18, marginTop: 52,
        }}>
          {['[REAL USAGE STAT]', '[REAL TESTIMONIAL]', '[REAL CUSTOMER LOGO]'].map(slot => (
            <div key={slot} style={{
              padding: 34, borderRadius: 18, textAlign: 'center',
              border: `2px dashed ${T.blueBorder}`, background: T.blueSoft,
              fontFamily: T.mono, fontSize: 13, color: T.blue,
            }}>
              {slot}
              <div style={{ fontFamily: T.sans, fontSize: 12, color: T.body, marginTop: 8 }}>
                Add to src/lib/social-proof.ts
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The floor: things that are true today. */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18, marginTop: 52,
      }}>
        {facts.map(f => (
          <div key={f.label} style={{
            padding: 28, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 20,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: T.blueSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
            }}>
              <Icon name={f.icon} size={20} color={T.blue} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8,
            }}>
              <span style={{ fontFamily: T.sans, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: T.ink }}>
                {f.stat}
              </span>
              <span style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: T.ink }}>{f.label}</span>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, lineHeight: 1.6, color: T.body, margin: 0 }}>
              {f.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 9. FOUNDER ────────────────────────────────────────────────────────────────

/**
 * Pratfall: a real constraint, stated plainly.
 *
 * The admission is specific and checkable rather than the fake-humble kind ("we care too
 * much"). It is also the one an SEO buyer will find out anyway the moment they look for
 * case studies, so saying it first is worth more than hiding it.
 *
 * Written to be replaceable: this is the founder's own voice and he should edit it. The
 * facts in it are true today — solo founder, product built and shipped, no customer base
 * yet, free tier and free tools as the way in.
 */
export function FounderSection() {
  return (
    <section style={{ background: T.bgSoft, borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}` }}>
      <div className="opt-s opt-sy" style={{ maxWidth: 820, margin: '0 auto', padding: '120px 32px' }}>
        <SectionHead kicker="Why I built Optmizly" title="I got tired of running six tools to answer one question." align="left" />

        <div style={{
          fontFamily: T.sans, fontSize: 16.5, lineHeight: 1.75, color: T.body,
          marginTop: 30, display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <p style={{ margin: 0 }}>
            Optimizing a site meant a keyword tool, a crawler, a rank tracker, a schema
            validator and two spreadsheets to reconcile them — and none of them could tell me
            whether an AI assistant could read the page at all. That question was not in any
            of their answers, and it is the one that increasingly decides who gets found.
          </p>
          <p style={{ margin: 0 }}>
            So I built the thing I wanted: one place where discovery, auditing, optimizing and
            monitoring share the same data, and where the AI-search side is treated as real
            work rather than a buzzword bolted onto a keyword tool.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: T.ink, fontWeight: 600 }}>The honest part:</strong> Optmizly
            is new, and I am one person. There is no case-study wall on this page because there
            are no case studies yet, and I would rather say that than fill the space with
            stock photos and invented numbers. What I can offer instead is the product itself —
            a free tier that does not expire, three tools that need no account at all, and an
            audit that shows you everything it finds rather than holding half of it back.
          </p>
          <p style={{ margin: 0 }}>
            If something is wrong or missing, tell me. At this size I read everything and I can
            usually fix it the same week.
          </p>
        </div>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 999, background: T.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.sans, fontSize: 18, fontWeight: 600, color: '#fff',
          }}>A</div>
          <div>
            <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink }}>Aravindraj</div>
            <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.muted }}>Founder, Optmizly</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
          <Link href="/blog" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 24px', height: 50, borderRadius: 14,
            fontFamily: T.sans, fontSize: 15.5, fontWeight: 600,
            background: '#fff', color: T.ink, textDecoration: 'none',
            border: `1px solid ${T.line}`,
          }}>
            See What We’re Building <Icon name="arrow" size={16} color={T.blue} />
          </Link>
          <a href="mailto:hello@optmizly.com" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 24px', height: 50, borderRadius: 14,
            fontFamily: T.sans, fontSize: 15.5, fontWeight: 600,
            background: 'transparent', color: T.body, textDecoration: 'none',
          }}>
            Email me directly
          </a>
        </div>
      </div>
    </section>
  )
}

// ── 11. FAQ ───────────────────────────────────────────────────────────────────

export const HOME_FAQS = [
  {
    q: 'What is GEO?',
    a: 'Generative Engine Optimization: the work of getting your pages used as a source by AI systems that write answers — ChatGPT, Gemini, Perplexity, Google’s AI Overviews. It overlaps with SEO but is not the same job. A page can rank on Google and still be unusable to a generative engine, usually because the crawler is blocked, the content only appears after JavaScript runs, or nothing identifies who wrote it.',
  },
  {
    q: 'What is AEO?',
    a: 'Answer Engine Optimization: structuring content so a specific question gets a specific, liftable answer. In practice that means question-led headings, an answer in the first sentence beneath each one, and FAQ or HowTo schema so the pairing is machine-readable. AEO is what decides whether you are the sentence that gets quoted.',
  },
  {
    q: 'How is this different from traditional SEO tools?',
    a: 'Traditional tools answer “can Google rank this page”. Optmizly also answers “can an AI system read, quote and attribute it” — whether answer-engine crawlers are allowed in your robots.txt, whether your content survives without JavaScript, whether an author and an entity are declared. Those checks are not in a standard site audit, and they are increasingly what decides visibility.',
  },
  {
    q: 'Who is Optmizly for?',
    a: 'Marketers, in-house SEOs, founders running their own site, and agencies managing several. The Free plan suits one site you are curious about. Pro fits someone optimizing regularly. Agency adds client reporting, local-SEO tooling and the prospecting tools that only make sense if you are selling SEO to other businesses.',
  },
  {
    q: 'Can I optimize content I already have?',
    a: 'That is the main use. Most sites do not need new content — they need existing pages made readable, structured and attributable. Start with the free audit above, then use the Content Optimizer to work through a page section by section.',
  },
  {
    q: 'Does Optmizly replace my other SEO tools?',
    a: 'For most people running one site, yes — keyword research, audits, rank tracking and content optimization are all here. If you depend on a large backlink index or enterprise-scale crawling, treat Optmizly as the AI-search layer alongside what you have rather than a swap.',
  },
  {
    q: 'Is there really a free audit?',
    a: 'Yes, at the top of this page. No account, no card, five audits per IP per day, and nothing is stored afterwards. You get the whole result — every category and every recommendation — not a score with the useful half locked.',
  },
  {
    q: 'How does the AI optimization actually work?',
    a: 'Two different mechanisms, deliberately kept apart. The structural checks — crawler access, schema, headings, extractability — are deterministic: we fetch the page and measure it, so the same page always scores the same. The written recommendations and rewrites come from a language model working on those measurements. Where a number comes from a data provider it is shown as live; where it is inferred, it is labelled as an estimate.',
  },
]

export function FaqSection() {
  return (
    <section className="opt-s opt-sy" style={{ maxWidth: 820, margin: '0 auto', padding: '120px 32px' }}>
      <SectionHead kicker="Questions" title="The things people ask first." />
      <div style={{ marginTop: 44, border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden' }}>
        {HOME_FAQS.map((faq, i) => (
          // <details> rather than a state hook: it is keyboard accessible and findable by
          // in-page search with no JavaScript, and this section does not need to be a
          // client component just to open a panel.
          <details key={faq.q} style={{
            borderBottom: i < HOME_FAQS.length - 1 ? `1px solid ${T.line}` : 'none',
            background: '#fff',
          }}>
            <summary style={{
              listStyle: 'none', cursor: 'pointer', padding: '18px 22px',
              fontFamily: T.sans, fontSize: 15.5, fontWeight: 600, color: T.ink,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            }}>
              <span>{faq.q}</span>
              <span aria-hidden="true" style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                background: T.line2, color: T.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}>+</span>
            </summary>
            <div style={{
              padding: '0 22px 20px', fontFamily: T.sans, fontSize: 14.5,
              color: T.body, lineHeight: 1.7,
            }}>
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

// ── 12. FINAL CTA ─────────────────────────────────────────────────────────────

export function FinalCtaSection() {
  return (
    <section style={{ background: T.ink900, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(60% 90% at 50% 0%, rgba(59,91,255,0.35), transparent 65%), radial-gradient(40% 70% at 80% 100%, rgba(77,238,255,0.18), transparent 60%)',
      }} />
      <div style={{
        position: 'relative', maxWidth: 820, margin: '0 auto',
        padding: 'clamp(64px, 10vw, 130px) clamp(20px, 4vw, 32px)', textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: T.sans, fontSize: 'clamp(34px, 5vw, 58px)',
          fontWeight: 600, letterSpacing: -2.4, lineHeight: 1.05,
          color: '#fff', margin: '0 auto 20px', maxWidth: 720,
        }}>
          Your content is already an investment.
        </h2>
        <p style={{
          fontFamily: T.sans, fontSize: 19, color: 'rgba(255,255,255,0.72)',
          maxWidth: 540, margin: '0 auto 38px', lineHeight: 1.55,
        }}>
          Make it visible wherever people search.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 30px', height: 54, borderRadius: 14,
            fontFamily: T.sans, fontSize: 16.5, fontWeight: 600,
            background: T.grad, color: '#fff', textDecoration: 'none',
            boxShadow: '0 8px 24px -8px rgba(0,0,255,0.6), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}>
            Start Optimizing <Icon name="arrow" size={17} color="#fff" />
          </Link>
          <Link href="#free-audit" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 30px', height: 54, borderRadius: 14,
            fontFamily: T.sans, fontSize: 16.5, fontWeight: 600,
            background: 'rgba(255,255,255,0.08)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none',
          }}>
            Run the free audit
          </Link>
        </div>
        <p style={{
          fontFamily: T.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginTop: 26,
        }}>
          Free plan needs no card · Cancel anytime · No free trial to forget about
        </p>
      </div>
    </section>
  )
}
