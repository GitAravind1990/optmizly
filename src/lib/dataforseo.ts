if (typeof window !== 'undefined') {
  throw new Error('dataforseo.ts must only be used on the server')
}

const BASE = 'https://api.dataforseo.com/v3'

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN ?? ''
  const pass  = process.env.DATAFORSEO_PASSWORD ?? ''
  return 'Basic ' + Buffer.from(`${login}:${pass}`).toString('base64')
}

async function dfsPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DataForSEO ${path} → HTTP ${res.status}`)
  const json = await res.json() as { status_code: number; tasks: Array<{ status_code: number; result: T[] }> }
  if (json.status_code !== 20000) throw new Error(`DataForSEO error: ${json.status_code}`)
  const task = json.tasks?.[0]
  if (!task || task.status_code !== 20000) throw new Error(`DataForSEO task error: ${task?.status_code}`)
  return task.result?.[0] as T
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type DFSSummary = {
  target: string
  rank_absolute: number
  backlinks: number
  dofollow: number
  nofollow: number
  referring_domains: number
  referring_ips: number
  spam_score: number
  broken_backlinks: number
  new_backlinks_14d?: number
  lost_backlinks_14d?: number
  new_referring_domains_14d?: number
  lost_referring_domains_14d?: number
}

export type DFSBacklinkItem = {
  url_from: string
  domain_from: string
  url_to: string
  domain_to: string
  anchor: string
  dofollow: boolean
  domain_from_rank: number
  page_from_rank: number
  first_seen: string
  last_seen: string
  is_new: boolean
  is_lost: boolean
  attributes: string[]
  item_type: string
  spam_score?: number
}

export type DFSReferringDomain = {
  domain: string
  rank: number
  backlinks: number
  dofollow: number
  nofollow: number
  is_new: boolean
  is_lost: boolean
  first_seen: string
  last_seen: string
  spam_score?: number
}

// ─── API calls ──────────────────────────────────────────────────────────────

export async function fetchBacklinkSummary(domain: string): Promise<DFSSummary> {
  return dfsPost<DFSSummary>('/backlinks/summary/live', [{ target: domain, include_subdomains: true }])
}

export async function fetchBacklinks(domain: string, limit = 100): Promise<DFSBacklinkItem[]> {
  const result = await dfsPost<{ items: DFSBacklinkItem[] }>('/backlinks/backlinks/live', [{
    target: domain,
    limit,
    include_subdomains: true,
    order_by: ['domain_from_rank,desc'],
    filters: ['dofollow,=,true'],
  }])
  return result?.items ?? []
}

export async function fetchReferringDomains(domain: string, limit = 50): Promise<DFSReferringDomain[]> {
  const result = await dfsPost<{ items: DFSReferringDomain[] }>('/backlinks/referring_domains/live', [{
    target: domain,
    limit,
    include_subdomains: true,
    order_by: ['rank,desc'],
  }])
  return result?.items ?? []
}
