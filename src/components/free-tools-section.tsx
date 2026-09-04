import Link from 'next/link'
import { T } from '@/components/marketing/tokens'

/**
 * The four no-account tools, offered as a section.
 *
 * Extracted from PagePricing so the two pages that show it can place it differently. Both
 * render the same component, so a tool added here appears on both — the mistake worth
 * avoiding is a second hand-written copy that drifts, which is what the pricing FAQ did
 * twice with its own answers.
 *
 * Carries `id="free-tools"`, the destination of the header's "Free tools" link. That link
 * used to point at #free-audit, the single hero widget, so a plural label delivered one
 * tool while duplicating the "Analyze Free" button beside it.
 */
export function FreeToolsSection() {
  return (
    <section
      id="free-tools"
      className="opt-s opt-sy"
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'clamp(64px,8vw,110px) clamp(20px,4vw,32px)',
        scrollMarginTop: 96,
      }}
    >
      <style>{`
        /* Two across, then stacked. Four columns would line these up exactly like the
           pricing cards and read as a fifth tier, which is the one thing they are not. */
        .free-tools-grid { display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (max-width: 719px) { .free-tools-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>

      <h2 style={{
        fontFamily: T.sans, fontSize: 'clamp(26px, 3.4vw, 38px)',
        fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.08, color: T.ink,
        textAlign: 'center', margin: '0 0 12px',
      }}>
        Start with the free ones
      </h2>
      <p style={{
        fontFamily: T.sans, fontSize: 17, color: T.body, textAlign: 'center',
        maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.55,
      }}>
        No account, no card, no trial to cancel. Each one gives you the finished result,
        not a preview of it.
      </p>

      <div className="free-tools-grid">
        {FREE_TOOLS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: 'block', textDecoration: 'none',
              padding: 22, borderRadius: 16,
              background: '#fff', border: `1px solid ${T.line}`,
              boxShadow: '0 1px 3px rgba(11,17,32,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.ink }}>
                {t.name}
              </span>
              <span style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 500, letterSpacing: 0.4,
                textTransform: 'uppercase', color: T.blue,
                background: T.blueSoft, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap',
              }}>
                {t.limit}
              </span>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 14, lineHeight: 1.55, color: T.body, margin: '8px 0 0' }}>
              {t.blurb}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Each tool's real limit is on its card. The prospect finder's differs from the rest
 *  because every search buys live Google data; burying that would mean a visitor learns it
 *  only when refused. */
const FREE_TOOLS = [
  {
    href: '/tools/find-clients',
    name: 'Find Your Next SEO Client',
    limit: '3 searches a month',
    blurb: 'Pick an industry and a city. Get local businesses whose sites have fixable SEO problems, scored by how much there is to sell.',
  },
  {
    href: '/tools/ai-search-readiness',
    name: 'AI Search Readiness Audit',
    limit: '5 a day',
    blurb: 'Enter a URL and see what an AI crawler sees — technical, on-page, structured data, and whether answer engines can reach you at all.',
  },
  {
    href: '/tools/eeat',
    name: 'E-E-A-T Checker',
    limit: '5 a day',
    blurb: 'Paste a page and score it on Experience, Expertise, Authoritativeness and Trustworthiness, with the specific things to fix first.',
  },
  {
    href: '/tools/ai-regex',
    name: 'AI Regex Generator',
    limit: '5 a day',
    blurb: 'Describe a pattern in plain English and get a working regular expression, for filtering Search Console and analytics exports.',
  },
]
