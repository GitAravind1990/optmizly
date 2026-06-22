'use client'

import type { GridStats as GridStatsType, RankedGridPoint } from '@/lib/geogrid'

interface GridStatsProps {
  stats: GridStatsType
  grid: RankedGridPoint[]
}

const LEGEND = [
  { range: '1–3',   color: '#16a34a', label: 'Top 3' },
  { range: '4–7',   color: '#ca8a04', label: 'Good' },
  { range: '8–10',  color: '#ea580c', label: 'Fair' },
  { range: '11–20', color: '#dc2626', label: 'Low' },
  { range: 'N/A',   color: '#6b7280', label: 'Not found' },
]

export function GridStats({ stats, grid }: GridStatsProps) {
  const ranked = grid.filter((p): p is RankedGridPoint & { rank: number } => p.rank !== null)

  const best  = ranked.length > 0 ? ranked.reduce((a, b) => a.rank < b.rank ? a : b) : null
  const worst = ranked.length > 0 ? ranked.reduce((a, b) => a.rank > b.rank ? a : b) : null

  const metrics = [
    {
      label: 'Average Rank',
      value: stats.averageRank ? `#${stats.averageRank}` : '—',
      sub: 'across all grid points',
    },
    {
      label: 'Top 3 Coverage',
      value: `${stats.topThreePercent}%`,
      sub: `positions 1–3`,
    },
    {
      label: 'Top 10 Coverage',
      value: `${stats.topTenPercent}%`,
      sub: 'positions 1–10',
    },
    {
      label: 'Total Points',
      value: String(stats.totalPoints),
      sub: `${ranked.length} ranked, ${stats.totalPoints - ranked.length} not found`,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-black text-slate-900 mb-0.5">{m.value}</div>
            <div className="text-xs font-semibold text-slate-700">{m.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-xs font-semibold text-slate-700 mb-3">Rank Legend</div>
        <div className="flex items-center gap-4 flex-wrap">
          {LEGEND.map(l => (
            <div key={l.range} className="flex items-center gap-1.5">
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 16, height: 16, background: l.color }}
              />
              <span className="text-xs text-slate-600">
                {l.label}
                <span className="text-slate-400 ml-1">({l.range})</span>
              </span>
            </div>
          ))}
        </div>

        {(best || worst) && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {best && (
              <div className="text-xs">
                <span className="font-semibold text-emerald-600">Best coverage</span>
                <span className="text-slate-500 ml-2">
                  Rank #{best.rank} at ({best.lat.toFixed(4)}, {best.lng.toFixed(4)})
                </span>
              </div>
            )}
            {worst && (
              <div className="text-xs">
                <span className="font-semibold text-red-500">Weakest area</span>
                <span className="text-slate-500 ml-2">
                  Rank #{worst.rank} at ({worst.lat.toFixed(4)}, {worst.lng.toFixed(4)})
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
