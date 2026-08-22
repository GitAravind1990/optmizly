'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps'
import { GridStats } from '@/components/geogrid/GridStats'
import { ReviewVelocity, type ReviewData } from '@/components/geogrid/ReviewVelocity'
import { getRankColor } from '@/components/geogrid/GridMap'
import { LockedState, Spinner } from '@/components/ui'
import { UpgradeModal } from '@/components/upgrade-modal'
import { getGridStats } from '@/lib/geogrid'
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
// APIProvider below) since it hasn't reached the stable channel yet, and its
// AutocompletePlaces calls hit places.googleapis.com (Places API "New") — a
// separate domain from maps.googleapis.com that must be allowlisted in the CSP's
// connect-src too. Confirmed live: this channel fires `gmp-select`, with the place
// reached via event.placePrediction.toPlace() (not event.place).
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

// Business-search variant of the same widget: resolves a Place ID + display name
// instead of coordinates, so users pick their listing instead of copy-pasting a
// ChIJ... string from Google's Place ID Finder page.
interface PlaceIdProps {
  onSelect: (placeId: string, name: string) => void
  className?: string
}

function PlaceIdAutocomplete({ onSelect, className }: PlaceIdProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const placesLib = useMapsLibrary('places') as any

  useEffect(() => {
    if (!placesLib || !containerRef.current) return

    const placeAutocomplete = new placesLib.PlaceAutocompleteElement()
    containerRef.current.appendChild(placeAutocomplete)

    const handleSelect = async (event: any) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ['id', 'displayName'] })
      if (place.id) {
        onSelect(place.id, place.displayName ?? '')
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
  const [rvManualEntry, setRvManualEntry] = useState(false)
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

  // Guards the scan's setState calls against firing after unmount — handleGeogridRun runs
  // in a click handler, not a useEffect, so nothing else stops it if the user navigates
  // away mid-scan. That matters more now, not less: the scan is a sequence of requests
  // (up to 9 for a 9x9 grid), and each one resolves into a setState.
  //
  // The interval ref that used to live here is gone with the simulated progress bar —
  // progress is now the batch count, so there is no timer to cancel.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const handleGeogridRun = useCallback(async () => {
    if (!biz || !keyword || lat == null || lng == null) {
      setGridError('Fill in all fields and select an address from the autocomplete dropdown.')
      return
    }
    setGridLoading(true)
    setGridError('')
    setGridProgress(0)

    try {
      // One batch of ten points per request.
      //
      // The whole grid used to be scanned in a single POST — 115.7s measured on a real
      // 9x9 — which a signed-in request cannot survive: Clerk's session token expires at
      // 61s and cannot refresh on a POST, so the response came back 401 after every paid
      // Maps call had already been made and 3 units charged. Only the last batch bills, so
      // navigating away part-way now costs nothing.
      //
      // Progress is real for the same reason. It used to be a timer incrementing by a
      // random amount toward a hard ceiling of 88%, which meant it could not distinguish a
      // slow scan from a dead one.
      const common = { businessName: biz, keyword, centerLat: lat, centerLng: lng, gridSize, spacing, unit }
      const ranked: RankedGridPoint[] = []
      let meta: { keyword: string; businessName: string; center: { lat: number; lng: number }; gridSize: number } | null = null
      let batches = 1

      for (let i = 0; i < batches; i++) {
        const r = await fetch('/api/tools/geogrid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...common, batchIndex: i }),
        })
        const d = await r.json()
        if (!isMountedRef.current) return
        if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
        if (!r.ok) throw new Error(d.error)

        batches = d.batches
        meta = d
        ranked.push(...(d.ranks as RankedGridPoint[]))
        setGridProgress(Math.round(((i + 1) / batches) * 100))
      }

      if (!meta) throw new Error('Analysis failed')
      setGridResult({
        grid: ranked,
        stats: getGridStats(ranked),
        keyword: meta.keyword,
        businessName: meta.businessName,
        center: meta.center,
        gridSize: meta.gridSize,
      })
    } catch (e) {
      if (isMountedRef.current) setGridError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      if (isMountedRef.current) setGridLoading(false)
    }
  }, [biz, keyword, lat, lng, gridSize, spacing, unit])

  const handleRvRun = useCallback(async () => {
    if (!rvBiz.trim()) { setRvError('Business name is required.'); return }
    if (!placeId.trim()) { setRvError('Place ID is required.'); return }
    setRvLoading(true)
    setRvError('')
    try {
      // Submit, then poll.
      //
      // Google Reviews is an async task at DataForSEO with genuinely variable queue time -
      // the same place has completed in 22s and in 62s. The route used to wait it out
      // inside one request (measured at 76.1s in production), which is long enough for a
      // signed-in POST to be rejected for an expired session token after the work is done.
      // The waiting happens here now, where it costs nothing and can be interrupted.
      const post = (payload: Record<string, unknown>) =>
        fetch('/api/tools/review-velocity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: rvBiz, ...payload }),
        })

      const submitRes = await post({ placeId: placeId.trim() })
      const submitted = await submitRes.json()
      if (submitRes.status === 403 || submitRes.status === 429) { setShowUpgradeModal(true); return }
      if (!submitRes.ok) throw new Error(submitted.error)

      // Bounded by the same 110s the server used to spend, so a task that never leaves the
      // queue ends with a message rather than an indefinite spinner. Only the submit is
      // billed, so polling costs the user nothing.
      const deadline = Date.now() + 110_000
      for (let attempt = 0; Date.now() < deadline; attempt++) {
        await new Promise(r => setTimeout(r, 2000))
        if (!isMountedRef.current) return

        const pollRes = await post({ taskId: submitted.taskId })
        const polled = await pollRes.json()
        if (pollRes.status === 403 || pollRes.status === 429) { setShowUpgradeModal(true); return }
        if (!pollRes.ok) throw new Error(polled.error)

        if (!polled.pending) { setRvResult(polled); return }
      }
      throw new Error('The review lookup is taking longer than usual for this business. This is usually transient - please try again in a moment.')
    } catch (e) {
      if (isMountedRef.current) setRvError(e instanceof Error ? e.message : 'Failed to fetch reviews')
    } finally {
      if (isMountedRef.current) setRvLoading(false)
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
  // PlaceAutocompleteElement paints its own opaque white background internally no
  // matter what the wrapper is styled with, so bg-slate-50 (used for plain <input>s)
  // only shows through at the padding edges — a visible two-tone seam against
  // sibling fields. Match the wrapper to white; border/radius still come from here
  // since the widget renders no border of its own. Padding is dropped since the
  // widget has a fixed ~48px intrinsic height that padding doesn't shrink, so
  // px-4/py-2.5 just stacked on top of it. Do NOT clip overflow to force an exact
  // height match — the suggestions dropdown renders inside this same wrapper, so
  // `overflow-hidden` clips the dropdown along with the box (tried and confirmed
  // broken live). A few px taller than sibling <input>s is the accepted tradeoff.
  const AUTOCOMPLETE_WRAP = INPUT.replace('bg-slate-50', 'bg-white').replace('px-4 py-2.5 ', '')
  const LABEL = 'block text-xs font-semibold text-slate-700 mb-1.5'

  // Review Velocity fields only. Radius: the search widget's own internal fill is
  // hard-locked to a near-square 3px radius (measured live via getComputedStyle)
  // regardless of what radius its wrapper is given — with `overflow: visible`
  // (required, since `hidden` clips its suggestions dropdown even without a fixed
  // height, confirmed live) the wrapper's rounding is nearly invisible behind that
  // ~1px-inset square fill. Matching rounded-[3px] everywhere in this row keeps it
  // visually consistent without touching the widget itself.
  const RV_AUTOCOMPLETE_WRAP = AUTOCOMPLETE_WRAP.replace('rounded-xl', 'rounded-[3px]')
  // py-[13px] -> 48px tall, matching the search widget's fixed height (it can't
  // grow/shrink via padding or font-size — confirmed live — so matching only works
  // in this direction). bg-white for the same reason: the widget always paints an
  // opaque white fill internally (confirmed live, unaffected by any wrapper
  // styling), so bg-slate-50 here was a real, visible gray-vs-white mismatch
  // against its sibling — matched to white instead of fighting the widget.
  const RV_INPUT = INPUT.replace('rounded-xl', 'rounded-[3px]').replace('py-2.5', 'py-[13px]').replace('bg-slate-50', 'bg-white')

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
                    className={AUTOCOMPLETE_WRAP}
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
                    className={RV_INPUT}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {rvManualEntry ? 'Google Place ID' : 'Find Your Business'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setRvManualEntry(v => !v)}
                      className="text-[11px] font-semibold text-blue-500 hover:text-blue-700"
                    >
                      {rvManualEntry ? 'Search instead' : 'Enter Place ID manually'}
                    </button>
                  </div>

                  {rvManualEntry ? (
                    <>
                      <input
                        value={placeId}
                        onChange={e => setPlaceId(e.target.value)}
                        placeholder="ChIJxxxxxxxxxxxxxxxx"
                        className={RV_INPUT}
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
                    </>
                  ) : (
                    <>
                      <PlaceIdAutocomplete
                        className={RV_AUTOCOMPLETE_WRAP}
                        onSelect={(id, name) => {
                          setPlaceId(id)
                          // Functional update, not a closed-over rvBiz read — this
                          // callback is captured once by PlaceIdAutocomplete's effect
                          // (which only re-runs on placesLib changes) and would
                          // otherwise always see rvBiz as it was at that early render
                          // (typically empty), silently overwriting anything the user
                          // had since typed into the Business Name field.
                          if (name) setRvBiz(prev => prev || name)
                        }}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {placeId
                          ? <>Place ID: <span className="font-mono text-slate-500">{placeId}</span></>
                          : 'Start typing your business name and select it from the dropdown.'}
                      </p>
                    </>
                  )}
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
