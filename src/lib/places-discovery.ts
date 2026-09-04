/**
 * Find local businesses to prospect, via Google Places.
 *
 * Uses the Places API (New) `searchText` endpoint rather than the legacy Text Search,
 * for one reason that matters here: the new endpoint returns `websiteUri` in the field
 * mask, so one request yields everything needed. Legacy Text Search returns no website at
 * all and would need a Place Details call per business - ten extra round trips inside a
 * request that already has a homepage fetch per business to pay for.
 */

export interface DiscoveredBusiness {
  placeId: string
  name: string
  address: string
  website?: string
  rating?: number
  phone?: string
  /** Businesses without a website are kept deliberately - for an agency they are a
   *  different, often better, kind of prospect. The caller presents them separately. */
  hasWebsite: boolean
}

import {
  reserveVendorRequests,
  VendorBudgetExceededError,
  VENDOR_GOOGLE_PLACES,
  PLACES_DAILY_REQUEST_BUDGET,
} from '@/lib/vendor-budget'

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.rating',
  'places.nationalPhoneNumber',
].join(',')

/**
 * Server-side key resolution.
 *
 * NEXT_PUBLIC_GOOGLE_MAPS_KEY is last on purpose. It is shipped to the browser for the
 * Maps JS loader, which means it is usually locked to HTTP referrers - and a
 * referrer-restricted key returns 403 to a server-side call with no Referer header. If this
 * ever starts failing with PERMISSION_DENIED, that is the reason, and the fix is an
 * unrestricted (or IP-restricted) key in GOOGLE_PLACES_API_KEY rather than a code change.
 */
function placesKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    || null
}

/** example.com and www.example.com are the same prospect. */
function domainOf(website: string | undefined): string | null {
  if (!website) return null
  try {
    return new URL(website).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

/** "Joe's Pizza & Co." and "Joes Pizza and Co" are the same prospect too. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|llc|inc|limited|co|company|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Three pages of 20 is the endpoint's practical ceiling for one query. */
const MAX_PAGES = 3

interface PlacesResponse {
  nextPageToken?: string
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    websiteUri?: string
    rating?: number
    nationalPhoneNumber?: string
  }>
  error?: { message?: string; status?: string }
}

/**
 * Up to `limit` businesses for "<industry> in <location>".
 *
 * Returns [] rather than throwing on any upstream problem: a search that finds nothing is a
 * result the UI can show, where a thrown error takes the whole tool down for what is often a
 * typo in the location.
 *
 * **One exception: it throws `VendorBudgetExceededError`** when the system-wide daily Places
 * ceiling is reached before any page succeeds. That is not an upstream problem but our own
 * deliberate refusal to spend, and returning [] for it would tell the user their market has
 * no businesses in it — a false statement the tool would then charge them for. If the
 * ceiling is hit *after* the first page, partial results are returned instead.
 */
export async function discoverBusinesses(
  industry: string,
  location: string,
  limit = 10,
): Promise<DiscoveredBusiness[]> {
  const key = placesKey()
  if (!key) {
    console.error('[places-discovery] no Places API key configured')
    return []
  }

  // 60 is three full pages, the practical ceiling for one query. The caller asks for the
  // whole pool now rather than ten of it: a deep scan walks the pool across several
  // requests and needs all of it, and trimming here would silently cap the scan.
  const capped = Math.max(1, Math.min(60, limit))
  const textQuery = `${industry} in ${location}`

  async function page(
    mask: string,
    extra: Record<string, unknown>,
  ): Promise<PlacesResponse | null> {
    // Reserved here rather than in the route because this is where the money is actually
    // spent: one call to page() is one billed Places request. Guarding the route instead
    // would have to know how many requests a search costs, and would miss the next caller
    // entirely. Deliberately outside the try below, so a budget stop propagates instead of
    // being flattened into the null that means "upstream problem".
    await reserveVendorRequests(VENDOR_GOOGLE_PLACES, 1, PLACES_DAILY_REQUEST_BUDGET)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(PLACES_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key!,
          'X-Goog-FieldMask': mask,
        },
        body: JSON.stringify({ textQuery, languageCode: 'en', ...extra }),
      })
      const data: PlacesResponse | null = await res.json().catch(() => null)
      if (!res.ok) {
        console.error(`[places-discovery] HTTP ${res.status}: ${data?.error?.status ?? ''} ${data?.error?.message ?? ''}`.trim())
        return null
      }
      return data
    } catch (e) {
      console.error('[places-discovery] request failed:', e instanceof Error ? e.message : e)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const raw: NonNullable<PlacesResponse['places']> = []

  // First page with the paginated request shape: `pageSize` (which supersedes the
  // deprecated `maxResultCount`) and `nextPageToken` in the field mask, since the token is
  // only returned when the mask asks for it.
  //
  // A budget stop on this first page has nothing to salvage, so it propagates to the route
  // and becomes a message the user can act on.
  const first = await page(`${FIELD_MASK},nextPageToken`, { pageSize: 20 })

  if (first) {
    raw.push(...(first.places ?? []))
    let pageToken = first.nextPageToken
    // Two more pages, to reach ranks 21-60. The top of a Maps result set is the businesses
    // that need an agency least, so depth is the whole point of paging here.
    for (let i = 1; i < MAX_PAGES && pageToken; i++) {
      let next: PlacesResponse | null
      try {
        next = await page(`${FIELD_MASK},nextPageToken`, { pageSize: 20, pageToken })
      } catch (e) {
        // The ceiling landed mid-scan. Twenty prospects beat an error page, and the spend
        // for those has already happened — same reasoning as the `!next` break below,
        // which keeps earlier pages when a later one fails.
        if (e instanceof VendorBudgetExceededError) break
        throw e
      }
      // A later page failing is not a failed search: keep what earlier pages returned
      // rather than discarding results the user has already paid for.
      if (!next) break
      raw.push(...(next.places ?? []))
      pageToken = next.nextPageToken
    }
  } else {
    // The paginated shape was rejected. Fall back to the exact request that worked before
    // pagination existed, so a search still returns its first page of results.
    //
    // This branch is not hypothetical: the first attempt at paging sent `maxResultCount`
    // together with a `nextPageToken` field mask, the endpoint rejected it, and because
    // discovery returning [] makes the route exit early with "no prospects found", the
    // tool reported an empty market rather than an error. One page is a worse result than
    // three; zero pages looks like a broken product.
    console.error('[places-discovery] paginated request rejected, falling back to single page')
    const legacy = await page(FIELD_MASK, { maxResultCount: 20 })
    raw.push(...(legacy?.places ?? []))
  }

  const seenDomains = new Set<string>()
  const seenNames = new Set<string>()
  const pool: DiscoveredBusiness[] = []

  for (const p of raw) {
    const name = p.displayName?.text?.trim()
    if (!name || !p.id) continue

    const domain = domainOf(p.websiteUri)
    const normalized = normalizeName(name)

    // Domain first: two listings sharing a site are one prospect however they are named.
    // Name second: a chain with per-branch sites is still one pitch.
    if (domain && seenDomains.has(domain)) continue
    if (normalized && seenNames.has(normalized)) continue
    if (domain) seenDomains.add(domain)
    if (normalized) seenNames.add(normalized)

    pool.push({
      placeId: p.id,
      name,
      address: p.formattedAddress?.trim() ?? '',
      website: p.websiteUri,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      phone: p.nationalPhoneNumber,
      hasWebsite: !!p.websiteUri,
    })
  }

  return selectSpread(pool, capped)
}

/**
 * Take `count` businesses spread evenly across the whole ranked pool, rather than the first
 * `count`.
 *
 * This is the half of pagination that actually changes anything. Fetching sixty businesses
 * and then analysing the first ten returns the same ten as before and bills twice as much
 * for them - the deeper ranks have to be in the sample or the extra pages are wasted.
 *
 * An even stride keeps some of the top of the list, where a strong local competitor is
 * genuinely useful context for a pitch, while reaching the mid and deep ranks where the
 * fixable sites are. Order within the returned slice is preserved, so results still read
 * best-ranked first; the caller re-sorts by prospectRank anyway.
 */
function selectSpread<T>(pool: T[], count: number): T[] {
  if (pool.length <= count) return pool
  const stride = pool.length / count
  const picked: T[] = []
  for (let i = 0; i < count; i++) picked.push(pool[Math.floor(i * stride)])
  return picked
}
