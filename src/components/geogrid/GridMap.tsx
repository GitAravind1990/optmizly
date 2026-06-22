'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import type { RankedGridPoint } from '@/lib/geogrid'

export function getRankColor(rank: number | null): string {
  if (rank === null) return '#6b7280'
  if (rank <= 3)  return '#16a34a'
  if (rank <= 7)  return '#ca8a04'
  if (rank <= 10) return '#ea580c'
  return '#dc2626'
}

interface GridMapProps {
  grid: RankedGridPoint[]
  center: { lat: number; lng: number }
  businessName: string
}

export function GridMap({ grid, center, businessName }: GridMapProps) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-slate-200"
      style={{ height: 520 }}
    >
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId={mapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {grid.map((point, i) => (
          <AdvancedMarker
            key={i}
            position={{ lat: point.lat, lng: point.lng }}
            title={point.rank !== null ? `Rank #${point.rank}` : 'Not in top 20'}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: getRankColor(point.rank),
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.32)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {point.rank !== null ? point.rank : '—'}
            </div>
          </AdvancedMarker>
        ))}

        {/* Business pin at center */}
        <AdvancedMarker position={center} title={businessName}>
          <Pin background="#2563eb" glyphColor="#fff" borderColor="#1d4ed8" scale={1.2} />
        </AdvancedMarker>
      </Map>
    </div>
  )
}
