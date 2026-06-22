'use client'

import { useMemo } from 'react'

export type ReviewData = {
  businessName: string
  totalReviews: number
  rating: number
  weeklyVelocity: number
  monthlyVelocity: number
  velocity90: number
  trend: 'up' | 'down' | 'stable'
  reviews: Array<{ date: string; rating: number; text: string }>
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Math.max(0, Math.min(5, rating)))
  return (
    <span style={{ color: '#f59e0b', letterSpacing: 1, fontSize: 13 }}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  )
}

const TREND_CONFIG = {
  up:     { label: 'Trending up',   bg: 'bg-emerald-50', text: 'text-emerald-700', arrow: '↑' },
  down:   { label: 'Declining',     bg: 'bg-red-50',     text: 'text-red-600',     arrow: '↓' },
  stable: { label: 'Stable',        bg: 'bg-slate-100',  text: 'text-slate-600',   arrow: '→' },
}

function TrendBadge({ trend }: { trend: ReviewData['trend'] }) {
  const { label, bg, text, arrow } = TREND_CONFIG[trend]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${bg} ${text}`}>
      {arrow} {label}
    </span>
  )
}

// ─── SVG bar chart ─────────────────────────────────────────────────────────────
function MonthlyChart({ reviews }: { reviews: ReviewData['reviews'] }) {
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const yr = d.getFullYear()
      const mo = d.getMonth()
      const count = reviews.filter(r => {
        try {
          const rd = new Date(r.date.replace(' ', 'T').replace(/\s[+-]\d{2}:\d{2}$/, 'Z'))
          return rd.getFullYear() === yr && rd.getMonth() === mo
        } catch { return false }
      }).length
      return { label: d.toLocaleString('default', { month: 'short' }), count }
    })
  }, [reviews])

  const max = Math.max(...months.map(m => m.count), 1)
  const barW = 40
  const gap  = 14
  const chartH = 80
  const totalW = months.length * (barW + gap) - gap

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700 mb-4">Reviews per Month — last 6 months</div>
      <svg width={totalW} height={chartH + 28} viewBox={`0 0 ${totalW} ${chartH + 28}`} overflow="visible">
        {months.map((m, i) => {
          const barH = Math.max(2, Math.round((m.count / max) * chartH))
          const x = i * (barW + gap)
          const y = chartH - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={5} fill="#6366f1" opacity={0.82} />
              {m.count > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="600">
                  {m.count}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {m.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ReviewVelocity({ data }: { data: ReviewData }) {
  const metrics = [
    { label: 'Total Reviews',    value: data.totalReviews.toLocaleString(), sub: 'all time' },
    { label: 'Rating',           value: data.rating.toFixed(1),             sub: 'out of 5.0' },
    { label: 'Weekly Velocity',  value: `+${data.weeklyVelocity}`,          sub: 'last 7 days' },
    { label: 'Monthly Velocity', value: `+${data.monthlyVelocity}`,         sub: 'last 30 days' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-black text-slate-900">{data.businessName || 'Business'}</h2>
        <TrendBadge trend={data.trend} />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-black text-slate-900 mb-0.5">{m.value}</div>
            <div className="text-xs font-semibold text-slate-700">{m.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <MonthlyChart reviews={data.reviews} />
      </div>

      {/* Recent reviews */}
      {data.reviews.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {data.reviews.slice(0, 10).map((r, i) => (
              <div key={i} className={i < data.reviews.slice(0, 10).length - 1 ? 'border-b border-slate-100 pb-4' : ''}>
                <div className="flex items-center gap-2 mb-1">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-slate-400">{r.date.slice(0, 10)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {r.text || <span className="italic text-slate-400">No review text</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
