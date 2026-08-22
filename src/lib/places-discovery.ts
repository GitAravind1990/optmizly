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

interface PlacesResponse {
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

  const capped = Math.max(1, Math.min(20, limit))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  let data: PlacesResponse | null = null
  try {
    const res = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `${industry} in ${location}`,
        // Asking for more than needed, because dedupe below removes some and chains often
        // return the same brand repeatedly.
        maxResultCount: Math.min(20, capped * 2),
        languageCode: 'en',
      }),
    })
    data = await res.json().catch(() => null)
    if (!res.ok) {
      console.error(`[places-discovery] HTTP ${res.status}: ${data?.error?.status ?? ''} ${data?.error?.message ?? ''}`.trim())
      return []
    }
  } catch (e) {
    console.error('[places-discovery] request failed:', e instanceof Error ? e.message : e)
    return []
  } finally {
    clearTimeout(timer)
  }

  const seenDomains = new Set<string>()
  const seenNames = new Set<string>()
  const out: DiscoveredBusiness[] = []

  for (const p of data?.places ?? []) {
    if (out.length >= capped) break

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

    out.push({
      placeId: p.id,
      name,
      address: p.formattedAddress?.trim() ?? '',
      website: p.websiteUri,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      phone: p.nationalPhoneNumber,
      hasWebsite: !!p.websiteUri,
    })
  }

  return out
}
