/**
 * Shared design tokens and primitives for the marketing pages.
 *
 * These values were already duplicated verbatim in page.tsx, home-hero.tsx and
 * page-pricing.tsx. Every new marketing section would have been a fourth copy, and the
 * copies had already started to drift. This is the same palette, not a new one — the blue
 * is the brand #0000FF that the June theme sweep put everywhere.
 */

export const T = {
  sans: "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  blue: '#0000FF',
  blueMid: '#3B5BFF',
  cyan: '#4DEEFF',
  blueSoft: '#EEF1FF',
  blueBorder: '#CBD4FF',
  blueDark: '#0000CC',
  ink: '#0B1120',
  ink2: '#1F2937',
  ink900: '#070B16',
  body: '#4B5563',
  muted: '#8A93A3',
  line: '#E8EBF0',
  line2: '#F0F2F6',
  bg: '#FFFFFF',
  bgSoft: '#FAFAFA',
  good: '#10B981',
  goodSoft: '#ECFDF5',
  warn: '#D97706',
  warnSoft: '#FFF7ED',
  bad: '#DC2626',
  badSoft: '#FEF2F2',
  grad: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 45%, #4DEEFF 100%)',
  gradText: 'linear-gradient(118deg, #0000FF 0%, #3B5BFF 48%, #28C8E8 100%)',
} as const

const PATHS: Record<string, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  check: 'M5 12l5 5L20 7',
  sparkle: 'M12 3l1.6 5L19 10l-5.4 2L12 17l-1.6-5L5 10l5.4-2L12 3z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0 -18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0 -10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0 -2 0',
  pin: 'M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  chart: 'M3 3v18h18M7 14l4-4 4 4 6-6',
  bars: 'M5 21V11M12 21V4M19 21v-7',
  search: 'M11 11m-8 0a8 8 0 1 0 16 0 8 8 0 1 0 -16 0M21 21l-4.3-4.3',
  layers: 'M12 2L2 8l10 6 10-6-10-6zM2 14l10 6 10-6M2 11l10 6 10-6',
  cluster: 'M12 4v6m0 0L7 16m5-6l5 6M5 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0M10 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  mic: 'M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zM5 11a7 7 0 0 0 14 0M12 18v3',
  bot: 'M12 3v3M9 12h.01M15 12h.01M6 8h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM2 13h2M20 13h2',
  globe: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0 -18 0M3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z',
  store: 'M3 9l1.5-5h15L21 9M4 9v10h16V9M4 9h16M9 19v-5h6v5',
  building: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M8 8h.01M8 12h.01M11 8h.01M11 12h.01',
  feather: 'M20 4a8 8 0 0 0-11 0L3 10v11h11l6-6a8 8 0 0 0 0-11zM16 8L2 22M17 7H9',
  star: 'M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  google: 'M21 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.05a4.3 4.3 0 0 1-1.87 2.8v2.3h3.02C19.96 17.3 21 15 21 12.2z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  quote: 'M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4',
  user: 'M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0 -8 0M4 21a8 8 0 0 1 16 0',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.8 2.8 0 0 1-4-4z',
  compass: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0 -18 0M16 8l-2.4 5.6L8 16l2.4-5.6z',
}

export function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }: {
  name: string; size?: number; color?: string; strokeWidth?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={PATHS[name] || PATHS.arrow} />
    </svg>
  )
}

/** Kicker + h2 + lede. Every marketing section uses this so the type scale stays one scale. */
export function SectionHead({ kicker, title, body, align = 'center', dark = false, maxW = 720, id }: {
  kicker?: string; title: React.ReactNode; body?: string
  align?: 'center' | 'left'; dark?: boolean; maxW?: number; id?: string
}) {
  return (
    <div style={{ textAlign: align, maxWidth: maxW, margin: align === 'center' ? '0 auto' : 0 }}>
      {kicker && (
        <div style={{
          fontFamily: T.mono, fontSize: 12, fontWeight: 500, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 16,
          color: dark ? T.cyan : T.blue,
        }}>{kicker}</div>
      )}
      <h2 id={id} style={{
        fontFamily: T.sans, fontSize: 'clamp(30px, 3.8vw, 46px)',
        fontWeight: 600, letterSpacing: -1.8, lineHeight: 1.05,
        color: dark ? '#fff' : T.ink, margin: 0,
      }}>{title}</h2>
      {body && (
        <p style={{
          fontFamily: T.sans, fontSize: 18, lineHeight: 1.55,
          color: dark ? 'rgba(255,255,255,0.62)' : T.body,
          marginTop: 18, marginBottom: 0,
        }}>{body}</p>
      )}
    </div>
  )
}
