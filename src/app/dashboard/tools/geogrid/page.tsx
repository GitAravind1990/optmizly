'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps'
import { GridStats } from '@/components/geogrid/GridStats'
import { ReviewVelocity, type ReviewData } from '@/components/geogrid/ReviewVelocity'
import { getRankColor } from '@/components/geogrid/GridMap'
import { LockedState, Spinner } from '@/components/ui'
import { UpgradeModal } from '@/components/upgrade-modal'
import type { RankedGridPoint, GridStats as GridStatsType } from '@/lib/geogrid'

type Tab = 'geogrid' | 'review-velocity'

type GeogridResult = {
  grid: RankedGridPoint[]
  stats: GridStatsType
  keyword: string
  businessName: string
  center: { lat: number; lng: number }
  gridSize: number
}

// ─── Address autocomplete ──────────────────────────────────────────────────────
interface AddressProps {
  onChange: (v: string) => void
  onCoords: (lat: number, lng: number) => void
  className?: string
}

// google.maps.places.Autocomplete (legacy) is permanently unavailable to any Google
// Cloud project created after 2025-03-01 — it 404s with LegacyApiNotActivatedMapError
// regardless of which APIs are enabled. PlaceAutocompleteElement is the only widget
// new projects can use; it requires the API loader's "beta" version channel (set on
// APIProvider below) since it hasn't reached the stable channel yet.
function AddressAutocomplete({ onChange, onCoords, className }: AddressProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const placesLib = useMapsLibrary('places') as any

  useEffect(() => {
    if (!placesLib || !containerRef.current) return

    const placeAutocomplete = new placesLib.PlaceAutocompleteElement()
    containerRef.current.appendChild(placeAutocomplete)

    const handleSelect = async (event: any) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ['location', 'formattedAddress'] })
      if (place.location) {
        onCoords(place.location.lat(), place.location.lng())
        onChange(place.formattedAddress ?? '')
      }
    }
    placeAutocomplete.addEventListener('gmp-select', handleSelect)

    return () => {
      placeAutocomplete.removeEventListener('gmp-select', handleSelect)
      containerRef.current?.removeChild(placeAutocomplete)
    }
  }, [placesLib])  // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} />
}

// ─── Grid map (inline, inside APIProvider) ─────────────────────────────────────
function GridMapInline({ grid, center, businessName }: { grid: RankedGridPoint[]; center: { lat: number; lng: number }; businessName: string }) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200" style={{ height: 520 }}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId={mapId}
        gestureHandling="greedy"
        style={{ width: '100%', height: '100%' }}
      >
        {grid.map((point, i) => (
          <AdvancedMarker
            key={i}
            position={{ lat: point.lat, lng: point.lng }}
            title={point.rank !== null ? `Rank #${point.rank}` : 'Not in top 20'}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: getRankColor(point.rank),
              color: '#fff', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.32)',
              fontFamily: 'system-ui,-apple-system,sans-serif',
              userSelect: 'none',
            }}>
              {point.rank !== null ? point.rank : '—'}
            </div>
          </AdvancedMarker>
        ))}
        <AdvancedMarker position={center} title={businessName}>
          <Pin background="#2563eb" glyphColor="#fff" borderColor="#1d4ed8" scale={1.2} />
        </AdvancedMarker>
      </Map>
    </div>
  )
}

// ─── Inner page content (must be inside APIProvider) ──────────────────────────
function GeogridContent() {
  const searchParams = useSearchParams()
  const [plan, setPlan] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get('tab') === 'review-velocity' ? 'review-velocity' : 'geogrid'
  )

  // Geogrid state
  const [biz, setBiz]         = useState('')
  const [keyword, setKeyword] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat]         = useState<number | null>(null)
  const [lng, setLng]         = useState<number | null>(null)
  const [gridSize, setGridSize] = useState<5 | 7 | 9>(7)
  const [spacing, setSpacing]   = useState(0.5)
  const [unit, setUnit]         = useState<'miles' | 'km'>('miles')
  const [gridLoading, setGridLoading]   = useState(false)
  const [gridProgress, setGridProgress] = useState(0)
  const [gridResult, setGridResult]     = useState<GeogridResult | null>(null)
  const [gridError, setGridError]       = useState('')

  // Review velocity state
  const [rvBiz, setRvBiz]       = useState('')
  const [placeId, setPlaceId]   = useState('')
  const [rvLoading, setRvLoading] = useState(false)
  const [rvResult, setRvResult]   = useState<ReviewData | null>(null)
  const [rvError, setRvError]     = useState('')

  // Load user plan
  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => setPlan(d.plan ?? 'FREE'))
      .catch(() => setPlan('FREE'))
  }, [])

  const handleGeogridRun = useCallback(async () => {
    if (!biz || !keyword || lat == null || lng == null) {
      setGridError('Fill in all fields and select an address from the autocomplete dropdown.')
      return
    }
    setGridLoading(true)
    setGridError('')
    setGridProgress(0)

    const interval = setInterval(() => {
      setGridProgress(p => Math.min(p + Math.random() * 7, 88))
    }, 500)

    try {
      const r = await fetch('/api/tools/geogrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: biz, keyword, centerLat: lat, centerLng: lng, gridSize, spacing, unit }),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setGridProgress(100)
      setGridResult(d)
    } catch (e) {
      setGridError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      clearInterval(interval)
      setGridLoading(false)
    }
  }, [biz, keyword, lat, lng, gridSize, spacing, unit])

  const handleRvRun = useCallback(async () => {
    if (!placeId.trim()) { setRvError('Place ID is required.'); return }
    setRvLoading(true)
    setRvError('')
    try {
      const r = await fetch('/api/tools/review-velocity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: placeId.trim(), businessName: rvBiz }),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error)
      setRvResult(d)
    } catch (e) {
      setRvError(e instanceof Error ? e.message : 'Failed to fetch reviews')
    } finally {
      setRvLoading(false)
    }
  }, [placeId, rvBiz])

  // Export via Google Static Maps API
  const handleExport = useCallback(() => {
    if (!gridResult) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
    const p = new URLSearchParams({
      size: '1024x768',
      center: `${gridResult.center.lat},${gridResult.center.lng}`,
      zoom: '12',
      key,
    })
    const colorName = (rank: number | null) =>
      rank === null ? '0x6b7280' :
      rank <= 3     ? '0x16a34a' :
      rank <= 7     ? '0xca8a04' :
      rank <= 10    ? '0xea580c' : '0xdc2626'

    gridResult.grid.forEach(pt => {
      const label = pt.rank !== null ? String(Math.min(pt.rank, 9)) : 'X'
      p.append('markers', `color:${colorName(pt.rank)}|label:${label}|${pt.lat},${pt.lng}`)
    })
    p.append('markers', `color:blue|label:B|${gridResult.center.lat},${gridResult.center.lng}`)
    window.open(`https://maps.googleapis.com/maps/api/staticmap?${p.toString()}`, '_blank')
  }, [gridResult])

  const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const LABEL = 'block text-xs font-semibold text-slate-700 mb-1.5'

  if (plan === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (plan !== 'AGENCY') {
    return <LockedState tool="Geogrid + Review Velocity" plan="Agency" />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-slate-200 bg-white shrink-0">
        {(['geogrid', 'review-velocity'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'geogrid' ? 'Geogrid' : 'Review Velocity'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ── GEOGRID TAB ────────────────────────────────────────────────────── */}
        {tab === 'geogrid' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h1 className="text-sm font-black text-slate-900 mb-1">Local Rank Geogrid</h1>
              <p className="text-xs text-slate-500 mb-5">
                Map your Google Maps ranking across a geographic grid to identify strong and weak coverage areas.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Business Name</label>
                  <input
                    value={biz}
                    onChange={e => setBiz(e.target.value)}
                    placeholder="e.g. Joe's Pizza"
                    className={INPUT}
                  />
                </div>

                <div>
                  <label className={LABEL}>Target Keyword</label>
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. pizza restaurant near me"
                    className={INPUT}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={LABEL}>Business Address</label>
                  <AddressAutocomplete
                    onChange={setAddress}
                    onCoords={(la, lo) => { setLat(la); setLng(lo) }}
                    className={INPUT}
                  />
                  {lat !== null && lng !== null && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
                  )}
                </div>

                <div>
                  <label className={LABEL}>Grid Size</label>
                  <div className="flex gap-2">
                    {([5, 7, 9] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setGridSize(s)}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                          gridSize === s
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s}×{s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{gridSize * gridSize} total grid points</p>
                </div>

                <div>
                  <label className={LABEL}>Point Spacing</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={spacing}
                      onChange={e => setSpacing(Number(e.target.value))}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                      {(['miles', 'km'] as const).map(u => (
                        <button
                          key={u}
                          onClick={() => setUnit(u)}
                          className={`px-3.5 py-2.5 text-xs font-bold transition-colors ${
                            unit === u ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {gridError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {gridError}
                </div>
              )}

              <div className="mt-5">
                <button
                  onClick={handleGeogridRun}
                  disabled={gridLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {gridLoading && <Spinner size="sm" />}
                  {gridLoading
                    ? `Analyzing ${gridSize * gridSize} grid points…`
                    : 'Run Geogrid Analysis'}
                </button>
              </div>

              {gridLoading && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Fetching rank data from DataForSEO…</span>
                    <span>{Math.round(gridProgress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${gridProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {gridResult && (
              <>
                <GridMapInline
                  grid={gridResult.grid}
                  center={gridResult.center}
                  businessName={gridResult.businessName}
                />
                <GridStats stats={gridResult.stats} grid={gridResult.grid} />
                <div className="flex gap-3 items-center">
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Export Map PNG
                  </button>
                  <button
                    onClick={handleGeogridRun}
                    disabled={gridLoading}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REVIEW VELOCITY TAB ───────────────────────────────────────────── */}
        {tab === 'review-velocity' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h1 className="text-sm font-black text-slate-900 mb-1">Review Velocity</h1>
              <p className="text-xs text-slate-500 mb-5">
                Track how fast your Google reviews are accumulating and whether momentum is growing or declining.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Business Name</label>
                  <input
                    value={rvBiz}
                    onChange={e => setRvBiz(e.target.value)}
                    placeholder="e.g. Joe's Pizza"
                    className={INPUT}
                  />
                </div>

                <div>
                  <label className={LABEL}>Google Place ID</label>
                  <input
                    value={placeId}
                    onChange={e => setPlaceId(e.target.value)}
                    placeholder="ChIJxxxxxxxxxxxxxxxx"
                    className={INPUT}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Find your Place ID at{' '}
                    <a
                      href="https://developers.google.com/maps/faq#how-do-i-get-a-place-id"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      developers.google.com/maps/faq
                    </a>
                  </p>
                </div>
              </div>

              {rvError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {rvError}
                </div>
              )}

              <div className="mt-5">
                <button
                  onClick={handleRvRun}
                  disabled={rvLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {rvLoading && <Spinner size="sm" />}
                  {rvLoading ? 'Fetching reviews…' : 'Analyze Reviews'}
                </button>
              </div>
            </div>

            {rvResult && <ReviewVelocity data={rvResult} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root export: wrap with APIProvider ───────────────────────────────────────
export default function GeogridPage() {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  return (
    <APIProvider apiKey={mapsKey} libraries={['places']} version="beta">
      <GeogridContent />
    </APIProvider>
  )
}
