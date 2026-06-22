const DFS_BASE = 'https://api.dataforseo.com'

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
