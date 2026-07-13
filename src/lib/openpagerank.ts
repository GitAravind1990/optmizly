if (typeof window !== 'undefined') {
  throw new Error('openpagerank.ts must only be used on the server')
}

const OPR_BASE = 'https://openpagerank.com/api/v1.0'

export type OPRResult = {
  domain: string
  page_rank_integer: number
  page_rank_decimal: number
  rank: string
  status_code: number
}

export async function fetchOPRScore(domain: string): Promise<OPRResult> {
  const key = process.env.OPENPAGERANK_API_KEY
  if (!key) throw new Error('OPENPAGERANK_API_KEY not configured')

  const res = await fetch(`${OPR_BASE}/getPageRank?domains[]=${encodeURIComponent(domain)}`, {
    headers: { 'API-OPR': key },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`OpenPageRank HTTP ${res.status}`)

  const json = await res.json() as {
    status_code: number
    status_message: string
    response: OPRResult[]
  }

  if (json.status_code !== 200) throw new Error(`OpenPageRank: ${json.status_message}`)
  const result = json.response?.[0]
  if (!result) throw new Error('No result from OpenPageRank')
  return result
}

/** Batch lookup (one HTTP call for up to 100 domains, per OPR's own limit). Each
 *  domain's own `status_code` (200 vs 404) says whether OPR actually has it indexed —
 *  distinct from this whole call throwing, which means the lookup itself failed. */
export async function fetchOPRScores(domains: string[]): Promise<Map<string, OPRResult>> {
  if (domains.length === 0) return new Map()
  const key = process.env.OPENPAGERANK_API_KEY
  if (!key) throw new Error('OPENPAGERANK_API_KEY not configured')

  const params = domains.map(d => `domains[]=${encodeURIComponent(d)}`).join('&')
  const res = await fetch(`${OPR_BASE}/getPageRank?${params}`, {
    headers: { 'API-OPR': key },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`OpenPageRank HTTP ${res.status}`)

  const json = await res.json() as {
    status_code: number
    status_message: string
    response: OPRResult[]
  }
  if (json.status_code !== 200) throw new Error(`OpenPageRank: ${json.status_message}`)

  const map = new Map<string, OPRResult>()
  for (const r of json.response ?? []) map.set(r.domain, r)
  return map
}
