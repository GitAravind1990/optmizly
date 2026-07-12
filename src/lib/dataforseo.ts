const DFS_BASE = 'https://api.dataforseo.com'

export function isDataForSEOConfigured(): boolean {
  return !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD
}

function getAuth(): string {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)')
  }
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')
}

async function dfsPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${DFS_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuth(),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function dfsGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${DFS_BASE}${path}`, { headers: { Authorization: getAuth() } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ─── Organic rank (rank tracker) ──────────────────────────────────────────────

// Google Ads geotargeting criteria IDs, which DataForSEO's location_code reuses.
// Must match the country options offered in the Rank Tracker project form.
const ORGANIC_LOCATION_CODES: Record<string, number> = {
  US: 2840, GB: 2826, AU: 2036, CA: 2124, IN: 2356,
  DE: 2276, FR: 2250, SG: 2702, NZ: 2554,
}

const ORGANIC_LANGUAGE_CODES: Record<string, string> = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en', IN: 'en',
  DE: 'de', FR: 'fr', SG: 'en', NZ: 'en',
}

type OrganicRankResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items: Array<{
        type: string
        rank_absolute: number
        domain: string
        url: string
      }>
    }>
  }>
}

export type OrganicRankResult = {
  found: boolean
  rank: number | null
  url: string | null
}

function normalizeHost(u: string): string {
  return u.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase().split('/')[0]
}

// DataForSEO's task-level code for "the query ran fine, there's just nothing to
// return" (e.g. a keyword with zero organic/local-pack results) — a real, confirmed
// empty result, not a failed call. Distinct from 20000 (success with data) and from
// genuine errors (auth, quota, malformed request, etc).
const DFS_NO_RESULTS = 40102

/**
 * Real Google organic rank for `domain` on `keyword` (top 100 results). Returns null
 * (not `{found:false}`) when the lookup itself couldn't be completed — missing
 * credentials, network failure, non-200 HTTP, or a task-level DataForSEO error — so
 * callers can tell "couldn't check this time" apart from "confirmed not ranking" and
 * avoid recording a false rank-lost alert over a transient API hiccup.
 */
export async function getOrganicRank(
  keyword: string,
  domain: string,
  targetLocation: string,
  deviceType: string
): Promise<OrganicRankResult | null> {
  const data = await dfsPost<OrganicRankResponse>('/v3/serp/google/organic/live/advanced', [
    {
      keyword,
      location_code: ORGANIC_LOCATION_CODES[targetLocation] ?? ORGANIC_LOCATION_CODES.US,
      language_code: ORGANIC_LANGUAGE_CODES[targetLocation] ?? 'en',
      device: deviceType === 'mobile' ? 'mobile' : 'desktop',
      depth: 100,
    },
  ])

  const task = data?.tasks?.[0]
  if (!task) return null
  if (task.status_code === DFS_NO_RESULTS) return { found: false, rank: null, url: null }
  if (task.status_code !== 20000) return null

  const targetHost = normalizeHost(domain)
  const items = task.result?.[0]?.items ?? []
  const match = items.find(i =>
    i.type === 'organic' &&
    typeof i.rank_absolute === 'number' &&
    typeof i.domain === 'string' &&
    (normalizeHost(i.domain) === targetHost || normalizeHost(i.domain).endsWith(`.${targetHost}`))
  )

  if (!match) return { found: false, rank: null, url: null }
  return { found: true, rank: match.rank_absolute, url: match.url }
}

// ─── Local rank (geogrid) ─────────────────────────────────────────────────────

type MapsResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items: Array<{
        type: string
        rank_group: number
        title: string
        place_id?: string
      }>
    }>
  }>
}

export interface LocalPackRankResult {
  /** true if the business appeared in the local pack, false if confirmed absent. */
  found: boolean
  rank: number | null
}

/**
 * `placeId`, when known, matches the exact listing — chain/franchise locations often
 * share one generic display title (e.g. every "Starbucks" shows as "Starbucks Coffee
 * Company" regardless of which specific store), so title-substring matching alone
 * silently misses them. Falls back to title matching when no placeId is available.
 */
async function fetchLocalPackRank(
  keyword: string,
  coords: { lat: number; lng: number },
  businessName: string,
  placeId?: string
): Promise<LocalPackRankResult | null> {
  const data = await dfsPost<MapsResponse>('/v3/serp/google/maps/live/advanced', [
    {
      keyword,
      language_code: 'en',
      location_coordinate: `${coords.lat},${coords.lng},9km`,
      se_domain: 'google.com',
      depth: 20,
    },
  ])

  const task = data?.tasks?.[0]
  if (!task) return null
  if (task.status_code === DFS_NO_RESULTS) return { found: false, rank: null }
  const items = task.result?.[0]?.items
  if (task.status_code !== 20000 || !items) return null

  // DataForSEO's local-pack item type is "maps_search", not "maps".
  const nameLower = businessName.toLowerCase()
  const match = items.find(item => {
    if (item.type !== 'maps_search') return false
    return placeId ? item.place_id === placeId : item.title.toLowerCase().includes(nameLower)
  })
  if (!match) return { found: false, rank: null }
  return { found: true, rank: match.rank_group }
}

// Used by Geogrid, which treats "couldn't check this grid point" and "not ranked
// there" the same (a blank spot on the heatmap either way) — collapses both to null.
export async function getLocalRank(
  keyword: string,
  coords: { lat: number; lng: number },
  businessName: string
): Promise<number | null> {
  const result = await fetchLocalPackRank(keyword, coords, businessName)
  return result?.rank ?? null
}

// Used by Local SEO Suite's rank checker, which auto-creates "investigate ranking
// drop" tasks and alerts — needs to tell a real drop apart from a failed API call.
export async function getLocalPackRank(
  keyword: string,
  coords: { lat: number; lng: number },
  businessName: string,
  placeId?: string
): Promise<LocalPackRankResult | null> {
  return fetchLocalPackRank(keyword, coords, businessName, placeId)
}

type MyBusinessInfoResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items: Array<{
        type: string
        title: string
        latitude: number
        longitude: number
        place_id: string
        rating?: { value?: number; votes_count?: number }
      }>
    }>
  }>
}

export interface BusinessCoordinates {
  lat: number
  lng: number
  placeId: string
  /** Real Google Business Profile rating/review count, when Google reports them. */
  rating: number | null
  reviewCount: number | null
}

/**
 * Resolves a business's real Google Business Profile data (coordinates, rating, review
 * count) by name + city/state, for cases where only a street address is on file (no
 * stored lat/lng) — used both for local-pack rank checks and to seed a new location
 * with real starting stats instead of fabricated ones. US-only for now, matching the
 * Local SEO Suite's location schema (no country field).
 */
export async function resolveBusinessCoordinates(
  businessName: string,
  city: string,
  state: string
): Promise<BusinessCoordinates | null> {
  const data = await dfsPost<MyBusinessInfoResponse>('/v3/business_data/google/my_business_info/live', [
    {
      keyword: businessName,
      location_name: `${city},${state},United States`,
      language_code: 'en',
    },
  ])

  const task = data?.tasks?.[0]
  const item = task?.result?.[0]?.items?.[0]
  if (!task || task.status_code !== 20000 || !item) return null
  if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') return null

  return {
    lat: item.latitude,
    lng: item.longitude,
    placeId: item.place_id,
    rating: typeof item.rating?.value === 'number' ? item.rating.value : null,
    reviewCount: typeof item.rating?.votes_count === 'number' ? item.rating.votes_count : null,
  }
}

// ─── Review velocity ──────────────────────────────────────────────────────────

// Google Reviews has no synchronous "live" endpoint — only the async task_post/
// task_get pattern. A task in progress reports this status_code on task_get.
const DFS_TASK_IN_QUEUE = 40602
const REVIEWS_POLL_INTERVAL_MS = 1500
const REVIEWS_POLL_BUDGET_MS = 45000

type ReviewsTaskPostResponse = {
  tasks: Array<{ id?: string; status_code: number }>
}

type ReviewsTaskGetResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      rating?: { value?: number; votes_count?: number }
      reviews_count?: number
      items?: Array<{
        type: string
        timestamp?: string
        rating?: { value?: number }
        review_text?: string
      }>
    }> | null
  }>
}

export type ReviewResult = {
  totalReviews: number
  rating: number
  reviews: Array<{
    date: string
    rating: number
    text: string
  }>
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Real reviews for a business by placeId. Submits an async task and polls for it to
 * complete (typically a few seconds, scales with `depth`) within REVIEWS_POLL_BUDGET_MS
 * — never blocks indefinitely. Returns null if the task fails, or doesn't finish within
 * the poll budget (a real, if uncommon, possibility with this API's async model).
 * location_name is a required field for this endpoint even when place_id already
 * pins the exact listing — "United States" satisfies it without needing the
 * business's city/state on hand.
 */
export async function getReviewVelocity(placeId: string): Promise<ReviewResult | null> {
  const postData = await dfsPost<ReviewsTaskPostResponse>('/v3/business_data/google/reviews/task_post', [
    {
      place_id: placeId,
      location_name: 'United States',
      language_code: 'en',
      sort_by: 'newest',
      depth: 100,
    },
  ])

  const taskId = postData?.tasks?.[0]?.id
  if (!taskId || postData.tasks[0].status_code !== 20100) return null

  const deadline = Date.now() + REVIEWS_POLL_BUDGET_MS
  while (Date.now() < deadline) {
    const getData = await dfsGet<ReviewsTaskGetResponse>(`/v3/business_data/google/reviews/task_get/${taskId}`)
    const task = getData?.tasks?.[0]
    if (task?.status_code === DFS_TASK_IN_QUEUE) {
      await sleep(REVIEWS_POLL_INTERVAL_MS)
      continue
    }
    if (!task || task.status_code !== 20000) return null

    const result = task.result?.[0]
    if (!result) return null

    return {
      totalReviews: result.reviews_count ?? 0,
      rating: result.rating?.value ?? 0,
      reviews: (result.items ?? [])
        .filter(item => item.type === 'google_reviews_search')
        .map(item => ({
          date: item.timestamp ?? '',
          rating: item.rating?.value ?? 0,
          text: item.review_text ?? '',
        })),
    }
  }

  return null
}
