import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Optmizly â€” AI Content Optimizer'
export const size = { width: 1200, height: 628 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>â—ˆ</div>
        <div style={{ color: 'white', fontSize: 56, fontWeight: 900, letterSpacing: '-2px' }}>
          Optmizly
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 26, marginTop: 12 }}>
          AI Content Optimizer Â· Rank Higher Â· Get Cited by Every AI
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          {['11 Tools', '8 Score Dims', 'Free to start'].map(t => (
            <div key={t} style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              padding: '8px 20px', color: 'white', fontSize: 18, fontWeight: 700,
            }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}

