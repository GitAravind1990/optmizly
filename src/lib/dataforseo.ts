const DFS_BASE = 'https://api.dataforseo.com'

export function isDataForSEOConfigured(): boolean {
  return !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD
}

/** Unwraps one Promise.allSettled result, treating a rejection the same as the
 *  DataForSEO functions' own null-on-failure contract — a rejected lookup and a
 *  `null` return both mean "couldn't check this one," so callers handle both alike. */
export function settledOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
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

export type SerpResult = { domain: string; url: string; rank: number }

/** Real top organic Google results for a keyword — no target domain filter, unlike
 *  getOrganicRank above. Same endpoint, same 20000/40102 status handling; just
 *  extracts the ranked list itself instead of searching it for one domain. Used to
 *  ground Ranking Engine's "top competitors" in the keyword's actual current SERP
 *  instead of an AI-invented domain list. */
export async function getTopSerpResults(
  keyword: string,
  targetLocation: string,
  deviceType: string,
  limit = 10
): Promise<SerpResult[] | null> {
  const data = await dfsPost<OrganicRankResponse>('/v3/serp/google/organic/live/advanced', [
    {
      keyword,
      location_code: ORGANIC_LOCATION_CODES[targetLocation] ?? ORGANIC_LOCATION_CODES.US,
      language_code: ORGANIC_LANGUAGE_CODES[targetLocation] ?? 'en',
      device: deviceType === 'mobile' ? 'mobile' : 'desktop',
      depth: limit,
    },
  ])

  const task = data?.tasks?.[0]
  if (!task) return null
  if (task.status_code === DFS_NO_RESULTS) return []
  if (task.status_code !== 20000) return null

  const items = task.result?.[0]?.items ?? []
  return items
    .filter(i => i.type === 'organic' && typeof i.rank_absolute === 'number' && typeof i.domain === 'string')
    .sort((a, b) => a.rank_absolute - b.rank_absolute)
    .slice(0, limit)
    .map(i => ({ domain: normalizeHost(i.domain), url: i.url, rank: i.rank_absolute }))
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

// Generic filler words that shouldn't be required for a title match — real Google
// Business Profile titles routinely append marketing taglines/qualifiers ("Best IVF
// Centre in Coimbatore", "- Best in Maternity") that break contiguous substring
// matching even when the actual business name is fully present, just not adjacent.
const TITLE_MATCH_STOPWORDS = new Set(['the', 'and', 'of', 'in', 'at', 'for', 'a', 'an'])

/** True if every significant word of `businessName` appears somewhere in `title`
 *  (order/adjacency don't matter) — e.g. "Iswarya Fertility Centre" matches "Iswarya
 *  IVF & Fertility Centre Coimbatore" even though "IVF &" breaks contiguity. */
function titleMatchesBusinessName(title: string, businessName: string): boolean {
  const titleLower = title.toLowerCase()
  const words = businessName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !TITLE_MATCH_STOPWORDS.has(w))
  if (words.length === 0) return titleLower.includes(businessName.toLowerCase())
  return words.every(w => titleLower.includes(w))
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
  const match = items.find(item => {
    if (item.type !== 'maps_search') return false
    return placeId ? item.place_id === placeId : titleMatchesBusinessName(item.title, businessName)
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
// DataForSEO's location_name matches Google Ads' geo-target names exactly, which
// spell out the full state name ("Washington") — a two-letter abbreviation ("WA",
// what nearly every US address actually uses) is rejected outright as an invalid
// field, not just a no-match. The Local SEO Suite's State field is free text with
// no format hint, so real users overwhelmingly type the abbreviation.
const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

function normalizeStateName(state: string): string {
  const full = US_STATE_NAMES[state.trim().toUpperCase()]
  return full ?? state.trim()
}

export async function resolveBusinessCoordinates(
  businessName: string,
  city: string,
  state: string
): Promise<BusinessCoordinates | null> {
  const data = await dfsPost<MyBusinessInfoResponse>('/v3/business_data/google/my_business_info/live', [
    {
      keyword: businessName,
      location_name: `${city},${normalizeStateName(state)},United States`,
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

// ─── Backlinks summary ─────────────────────────────────────────────────────────

type BacklinksSummaryResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      backlinks?: number
      referring_domains?: number
      referring_ips?: number
      backlinks_spam_score?: number
      broken_backlinks?: number
      rank?: number
      referring_links_attributes?: { nofollow?: number }
    }> | null
  }>
}

export interface BacklinksSummary {
  totalBacklinks: number
  referringDomains: number
  referringIPs: number
  spamScore: number
  brokenBacklinks: number
  dofollowLinks: number
  nofollowLinks: number
}

/** Real backlink profile summary for a domain — live (synchronous), no polling needed.
 *  DataForSEO doesn't return a direct dofollow/nofollow split of backlinks, only a
 *  nofollow-attribute count among referring links — nofollowLinks uses that count,
 *  dofollowLinks is the remainder of the total (both derived from real measured
 *  fields, not estimated). */
export async function getBacklinksSummary(domain: string): Promise<BacklinksSummary | null> {
  const data = await dfsPost<BacklinksSummaryResponse>('/v3/backlinks/summary/live', [
    { target: domain, internal_list_limit: 10 },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const result = task.result?.[0]
  if (!result) return null
  const totalBacklinks = result.backlinks ?? 0
  const nofollowLinks = Math.min(result.referring_links_attributes?.nofollow ?? 0, totalBacklinks)
  return {
    totalBacklinks,
    referringDomains: result.referring_domains ?? 0,
    referringIPs: result.referring_ips ?? 0,
    spamScore: result.backlinks_spam_score ?? 0,
    brokenBacklinks: result.broken_backlinks ?? 0,
    nofollowLinks,
    dofollowLinks: totalBacklinks - nofollowLinks,
  }
}

// ─── Traffic estimate ──────────────────────────────────────────────────────────

type TrafficEstimateResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items?: Array<{ target: string; metrics?: { organic?: { etv?: number } } }>
    }> | null
  }>
}

/** Real estimated monthly organic traffic (US, Google) for a domain — a genuine zero
 *  (no ranking keywords) is a valid result, distinct from a failed lookup (null). */
export async function getTrafficEstimate(domain: string): Promise<number | null> {
  const data = await dfsPost<TrafficEstimateResponse>('/v3/dataforseo_labs/google/bulk_traffic_estimation/live', [
    { targets: [domain], location_code: 2840, language_code: 'en' },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const item = task.result?.[0]?.items?.[0]
  if (!item) return null
  return Math.round(item.metrics?.organic?.etv ?? 0)
}

// ─── Keyword metrics (rank tracker) ───────────────────────────────────────────

type SearchVolumeResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{ keyword: string; search_volume?: number | null }> | null
  }>
}

type KeywordDifficultyResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items?: Array<{ keyword: string; keyword_difficulty?: number | null }>
    }> | null
  }>
}

export interface KeywordMetrics {
  searchVolume: number | null
  difficulty: number | null
}

/** Real search volume + keyword difficulty for a batch of keywords — one call each,
 *  not per-keyword. A keyword missing from the results (low-volume/unrecognized) maps
 *  to null rather than a guessed number; a failed call leaves every keyword null. */
export async function getKeywordMetrics(
  keywords: string[],
  targetLocation: string
): Promise<Map<string, KeywordMetrics>> {
  const locationCode = ORGANIC_LOCATION_CODES[targetLocation] ?? ORGANIC_LOCATION_CODES.US
  const languageCode = ORGANIC_LANGUAGE_CODES[targetLocation] ?? 'en'

  const [volumeData, difficultyData] = await Promise.all([
    dfsPost<SearchVolumeResponse>('/v3/keywords_data/google_ads/search_volume/live', [
      { keywords, location_code: locationCode, language_code: languageCode },
    ]),
    dfsPost<KeywordDifficultyResponse>('/v3/dataforseo_labs/google/bulk_keyword_difficulty/live', [
      { keywords, location_code: locationCode, language_code: languageCode },
    ]),
  ])

  const result = new Map<string, KeywordMetrics>(keywords.map(kw => [kw, { searchVolume: null, difficulty: null }]))

  const volumeTask = volumeData?.tasks?.[0]
  if (volumeTask?.status_code === 20000) {
    for (const row of volumeTask.result ?? []) {
      if (result.has(row.keyword)) result.set(row.keyword, { ...result.get(row.keyword)!, searchVolume: row.search_volume ?? null })
    }
  }

  const difficultyTask = difficultyData?.tasks?.[0]
  if (difficultyTask?.status_code === 20000) {
    for (const item of difficultyTask.result?.[0]?.items ?? []) {
      if (result.has(item.keyword)) result.set(item.keyword, { ...result.get(item.keyword)!, difficulty: item.keyword_difficulty ?? null })
    }
  }

  return result
}

// ─── Review velocity ──────────────────────────────────────────────────────────

// Google Reviews has no synchronous "live" endpoint — only the async task_post/
// task_get pattern. A task in progress reports one of these two status_codes on
// task_get — confirmed live (2026-07-21 prod logs) that "Task Handed" is a real,
// distinct in-progress state, not an error: a real request got misreported as
// "Could not fetch review data" because only 40602 was treated as "keep polling"
// and 40601 fell through to the generic task_error branch instead.
const DFS_TASK_IN_QUEUE = 40602
const DFS_TASK_HANDED = 40601
const REVIEWS_POLL_INTERVAL_MS = 1500
// Queue time for this DataForSEO endpoint is genuinely variable — measured live
// completions ranging from ~22s to ~62s for the same place_id back-to-back, not
// correlated with location_name or review volume. Route's maxDuration is 120s —
// this leaves ~10s headroom for the initial task_post round trip and response
// serialization.
const REVIEWS_POLL_BUDGET_MS = 110000

type ReviewsTaskPostResponse = {
  tasks: Array<{ id?: string; status_code: number }>
}

type ReviewsTaskGetResponse = {
  tasks: Array<{
    status_code: number
    status_message?: string
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

// Distinguishes "the task never finished in time" (place ID was almost certainly
// fine, DataForSEO's queue was just slow) from "DataForSEO rejected/failed the
// task outright" (place ID is more likely actually wrong) — the two warrant
// different user-facing messages, and previously both silently collapsed into a
// bare `null` with zero server-side log line to tell them apart.
export type ReviewFailure = { reason: 'timeout' | 'not_queued' | 'task_error'; detail: string }

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
export async function getReviewVelocity(placeId: string): Promise<ReviewResult | ReviewFailure> {
  const postData = await dfsPost<ReviewsTaskPostResponse>('/v3/business_data/google/reviews/task_post', [
    {
      place_id: placeId,
      location_name: 'United States',
      language_code: 'en',
      sort_by: 'newest',
      depth: 100,
    },
  ])

  const postTask = postData?.tasks?.[0]
  if (!postTask?.id || postTask.status_code !== 20100) {
    const detail = `status_code=${postTask?.status_code ?? 'none'} (post request itself may have failed — no response body)`
    console.error(`[getReviewVelocity] task_post did not queue for place_id=${placeId}: ${detail}`)
    return { reason: 'not_queued', detail }
  }
  const taskId = postTask.id

  const deadline = Date.now() + REVIEWS_POLL_BUDGET_MS
  while (Date.now() < deadline) {
    const getData = await dfsGet<ReviewsTaskGetResponse>(`/v3/business_data/google/reviews/task_get/${taskId}`)
    const task = getData?.tasks?.[0]
    if (task?.status_code === DFS_TASK_IN_QUEUE || task?.status_code === DFS_TASK_HANDED) {
      await sleep(REVIEWS_POLL_INTERVAL_MS)
      continue
    }
    // A genuinely review-free business is a confirmed empty result, not a failed
    // lookup — surfacing it as "could not fetch review data" would be misleading.
    if (task?.status_code === DFS_NO_RESULTS) return { totalReviews: 0, rating: 0, reviews: [] }
    if (!task || task.status_code !== 20000) {
      const detail = `status_code=${task?.status_code ?? 'none'} status_message=${task?.status_message ?? 'n/a'}`
      console.error(`[getReviewVelocity] task_get failed for place_id=${placeId} taskId=${taskId}: ${detail}`)
      return { reason: 'task_error', detail }
    }

    const result = task.result?.[0]
    if (!result) {
      console.error(`[getReviewVelocity] task_get returned status 20000 but no result for place_id=${placeId} taskId=${taskId}`)
      return { reason: 'task_error', detail: 'empty result on success status' }
    }

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

  console.error(`[getReviewVelocity] poll budget (${REVIEWS_POLL_BUDGET_MS}ms) exceeded for place_id=${placeId} taskId=${taskId} — task never left queue`)
  return { reason: 'timeout', detail: `exceeded ${REVIEWS_POLL_BUDGET_MS}ms poll budget` }
}

// ─── Competitor Spy (ranked keywords, referring domains, top pages) ───────────

type RankedKeywordsResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      total_count?: number
      items?: Array<{
        keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } }
        ranked_serp_element?: { serp_item?: { rank_absolute?: number; etv?: number } }
      }>
    }> | null
  }>
}

export type RankedKeyword = { keyword: string; position: number; volume: number; traffic: number }

/** Real keywords a domain ranks for (US, Google, live/synchronous — not the async
 *  task_post/task_get pattern reviews uses). `totalCount` comes free on the same
 *  response as the `limit`-capped `items`, so this covers both Competitor Spy's
 *  keyword list and its aggregate "Keywords Ranked" count in one call. */
export async function getRankedKeywords(domain: string, limit = 20): Promise<{ items: RankedKeyword[]; totalCount: number } | null> {
  const data = await dfsPost<RankedKeywordsResponse>('/v3/dataforseo_labs/google/ranked_keywords/live', [
    { target: domain, location_code: 2840, language_code: 'en', limit, order_by: ['keyword_data.keyword_info.search_volume,desc'] },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const result = task.result?.[0]
  if (!result) return null
  const items = (result.items ?? [])
    .filter(item => item.keyword_data?.keyword && item.ranked_serp_element?.serp_item)
    .map(item => ({
      keyword: item.keyword_data!.keyword!,
      position: item.ranked_serp_element!.serp_item!.rank_absolute ?? 0,
      volume: item.keyword_data!.keyword_info?.search_volume ?? 0,
      traffic: Math.round(item.ranked_serp_element!.serp_item!.etv ?? 0),
    }))
  return { items, totalCount: result.total_count ?? items.length }
}

type ReferringDomainsResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items?: Array<{ domain?: string; backlinks?: number; rank?: number }>
    }> | null
  }>
}

export type ReferringDomain = { domain: string; links: number; da: number }

/** Real top referring domains for a domain, each with DataForSEO's own domain-level
 *  `rank` — a different scale/algorithm than Moz's Domain Authority (see the
 *  daFromOPR-adjacent authority scaling in analyze/route.ts), observed live in the
 *  0-1000+ range, clamped and scaled down to the same 0-100 display range the UI
 *  already uses for the OpenPageRank-derived `da` field, purely for a consistent
 *  on-screen scale — not a claim that the two scores are the same metric. */
export async function getReferringDomains(domain: string, limit = 8): Promise<ReferringDomain[] | null> {
  const data = await dfsPost<ReferringDomainsResponse>('/v3/backlinks/referring_domains/live', [
    { target: domain, limit, order_by: ['backlinks,desc'] },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const result = task.result?.[0]
  if (!result) return null
  return (result.items ?? [])
    .filter(item => item.domain)
    .map(item => ({
      domain: item.domain!,
      links: item.backlinks ?? 0,
      da: Math.round(Math.min(1000, Math.max(0, item.rank ?? 0)) / 10),
    }))
}

type RelevantPagesResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items?: Array<{ page_address?: string; metrics?: { organic?: { etv?: number } } }>
    }> | null
  }>
}

export type TopPage = { title: string; url: string; traffic: number }

/** Real top pages by estimated organic traffic for a domain. This endpoint returns
 *  no human-readable title — `title` is derived from the URL path since DataForSEO
 *  doesn't supply one here, so it'll be lower-fidelity than a scraped <title> tag;
 *  acceptable given this only backs a supplementary "top pages" list, not the
 *  primary metric. */
export async function getTopPagesByTraffic(domain: string, limit = 5): Promise<TopPage[] | null> {
  const data = await dfsPost<RelevantPagesResponse>('/v3/dataforseo_labs/google/relevant_pages/live', [
    { target: domain, location_code: 2840, language_code: 'en', limit, order_by: ['metrics.organic.etv,desc'] },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const result = task.result?.[0]
  if (!result) return null
  return (result.items ?? [])
    .filter(item => item.page_address)
    .map(item => {
      const url = item.page_address!
      const path = url.replace(/^https?:\/\/[^/]+/, '') || '/'
      const title = path === '/' ? 'Home' : path.split('/').filter(Boolean).pop()!.replace(/[-_]/g, ' ').replace(/\.\w+$/, '')
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        url: path,
        traffic: Math.round(item.metrics?.organic?.etv ?? 0),
      }
    })
}

type DomainIntersectionResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      items?: Array<{
        keyword_data?: {
          keyword?: string
          keyword_info?: { search_volume?: number }
          keyword_properties?: { keyword_difficulty?: number }
        }
        second_domain_serp_element?: unknown
      }>
    }> | null
  }>
}

export type GapKeyword = { keyword: string; volume: number; difficulty: number }

/** Real "gap" keywords: keywords `competitorDomain` ranks for that `userDomain` does
 *  not. Verified live (2026-07-22) that `intersections: false` with
 *  target1=competitor/target2=user returns exactly this — every item has a
 *  `first_domain_serp_element` (competitor's ranking) and no `second_domain_serp_element`
 *  at all (confirmed by inspecting real API responses, not assumed from docs); this
 *  function filters defensively on that absence in case a future item does carry one.
 *  This endpoint doesn't accept an `order_by` param (rejected with a 40501 on a live
 *  test) — items come back in the API's own default order. */
export async function getDomainIntersectionGaps(userDomain: string, competitorDomain: string, limit = 10): Promise<GapKeyword[] | null> {
  const data = await dfsPost<DomainIntersectionResponse>('/v3/dataforseo_labs/google/domain_intersection/live', [
    { target1: competitorDomain, target2: userDomain, location_code: 2840, language_code: 'en', intersections: false, limit },
  ])
  const task = data?.tasks?.[0]
  if (!task || task.status_code !== 20000) return null
  const result = task.result?.[0]
  if (!result) return null
  return (result.items ?? [])
    .filter(item => item.keyword_data?.keyword && !item.second_domain_serp_element)
    .map(item => ({
      keyword: item.keyword_data!.keyword!,
      volume: item.keyword_data!.keyword_info?.search_volume ?? 0,
      difficulty: item.keyword_data!.keyword_properties?.keyword_difficulty ?? 0,
    }))
}
