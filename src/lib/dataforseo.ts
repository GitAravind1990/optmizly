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
  if (!task || task.status_code !== 20000) return null

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
      }>
    }>
  }>
}

export async function getLocalRank(
  keyword: string,
  coords: { lat: number; lng: number },
  businessName: string
): Promise<number | null> {
  const data = await dfsPost<MapsResponse>('/v3/serp/google/maps/live/advanced', [
    {
      keyword,
      language_code: 'en',
      location_coordinate: `${coords.lat},${coords.lng},9km`,
      se_domain: 'google.com',
      depth: 20,
    },
  ])

  const items = data?.tasks?.[0]?.result?.[0]?.items
  if (!items) return null

  const nameLower = businessName.toLowerCase()
  const match = items.find(
    item => item.type === 'maps' && item.title.toLowerCase().includes(nameLower)
  )
  return match?.rank_group ?? null
}

// ─── Review velocity ──────────────────────────────────────────────────────────

type ReviewsResponse = {
  tasks: Array<{
    status_code: number
    result: Array<{
      rating: { value: number; votes_count: number }
      reviews_count: number
      items: Array<{
        type: string
        time_info: { datetime: string }
        rating: { value: number }
        review_text: string
      }>
    }>
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

export async function getReviewVelocity(placeId: string): Promise<ReviewResult | null> {
  const data = await dfsPost<ReviewsResponse>('/v3/business_data/google/reviews/live', [
    {
      place_id: placeId,
      language_code: 'en',
      sort_by: 'newest',
      depth: 100,
    },
  ])

  const result = data?.tasks?.[0]?.result?.[0]
  if (!result) return null

  return {
    totalReviews: result.reviews_count ?? 0,
    rating: result.rating?.value ?? 0,
    reviews: (result.items ?? [])
      .filter(item => item.type === 'review')
      .map(item => ({
        date: item.time_info?.datetime ?? '',
        rating: item.rating?.value ?? 0,
        text: item.review_text ?? '',
      })),
  }
}
