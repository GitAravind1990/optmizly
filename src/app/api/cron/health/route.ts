import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callLLM } from '@/lib/llm'
import { fetchOPRScore } from '@/lib/openpagerank'
import { sendHealthAlertEmail } from '@/lib/email'
import { cronAuthFailure, recordCronRun } from '@/lib/cron'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Four-times-daily proof that the things we pay for still answer.
 *
 * Written after a Groq key expired and took every AI tool on the site down for three
 * days without anyone noticing. Nothing was broken in the code and nothing was logged:
 * the provider error was being swallowed, so a total outage and one flaky generation
 * looked identical from the outside. It surfaced by accident, while testing something
 * unrelated.
 *
 * The shape of that failure is what this guards against, and it is not specific to Groq.
 * Every dependency below is reached with a credential that can be revoked, expire, or run
 * out of money, and in every case the product keeps serving pages and simply stops
 * working. A check that only pinged our own site would have caught none of it.
 *
 * So each check spends a real call against the real credential. Cheap, but not free — an
 * LLM completion costs a fraction of a cent, and that is the price of knowing.
 *
 * Ran daily until 2026-08-18. Groq retired two models mid-morning on the 17th, hours
 * after that day's check had passed, so a total outage would have gone unreported until
 * the following morning had it not been found by accident first — the second time an
 * outage here surfaced that way. Every six hours caps that exposure at six, for four
 * fractions of a cent instead of one.
 *
 * Scheduled as four separate daily crons on this one path rather than a single
 * six-hourly expression, which this plan refuses at deploy time. See CRON_JOBS in
 * src/lib/cron.ts for why, and change both together.
 */

const TIMEOUT_MS = 12_000

/** Balance below this is reported as unhealthy. At roughly $1/day of DataForSEO spend
 *  this is about a week of notice — enough to top up before tools start failing, which
 *  is the same silent death as an expired key. */
const DFS_LOW_BALANCE_USD = 10

type Check = { name: string; ok: boolean; detail: string; ms: number }

async function withTimeout<T>(label: string, p: Promise<T>): Promise<T> {
  // The timer is cleared on the winning path too. Left pending it keeps the event loop
  // busy for a further 12s after the response has already been sent, which on a
  // serverless function means the invocation cannot be frozen when it is actually done.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)),
          TIMEOUT_MS
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function run(name: string, fn: () => Promise<string>): Promise<Check> {
  const started = Date.now()
  try {
    const detail = await withTimeout(name, fn())
    return { name, ok: true, detail, ms: Date.now() - started }
  } catch (e) {
    return {
      name,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      ms: Date.now() - started,
    }
  }
}

// ─── The checks ───────────────────────────────────────────────────────────────

const checkDatabase = () =>
  run('database', async () => {
    const n = await prisma.user.count()
    return `${n} users`
  })

/** The one that actually failed. Smallest model tier and a five-token ceiling, because
 *  this proves the credential works — it is not a quality test. An empty completion counts
 *  as a failure: a provider that answers 200 with nothing is still a broken tool. */
const checkLLM = () =>
  run('llm', async () => {
    const text = await callLLM(
      'You are a health check. Reply with exactly: OK',
      'Reply with exactly: OK',
      5,
      'claude-haiku-4-5-20251001'
    )
    if (!text.trim()) throw new Error('provider returned an empty completion')
    return `${process.env.LLM_PROVIDER ?? 'anthropic'} responded: ${text.trim().slice(0, 20)}`
  })

/** appendix/user_data is DataForSEO's own free endpoint, so this verifies the credential
 *  without spending any of the balance it reports. */
const checkDataForSEO = () =>
  run('dataforseo', async () => {
    const login = process.env.DATAFORSEO_LOGIN
    const password = process.env.DATAFORSEO_PASSWORD
    if (!login || !password) throw new Error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not configured')

    const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      headers: { Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64') },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = (await res.json()) as {
      tasks?: { result?: { money?: { balance?: number } }[] }[]
    }
    const balance = json.tasks?.[0]?.result?.[0]?.money?.balance
    if (typeof balance !== 'number') throw new Error('credential accepted but no balance in response')
    if (balance < DFS_LOW_BALANCE_USD) throw new Error(`balance is $${balance.toFixed(2)} — top up`)
    return `balance $${balance.toFixed(2)}`
  })

const checkOpenPageRank = () =>
  run('openpagerank', async () => {
    const r = await fetchOPRScore('google.com')
    return `google.com scored ${r.page_rank_decimal}`
  })

/** Load-bearing since the public AI Regex tool shipped: that endpoint fails closed, so no
 *  Redis means a page that is linked from the sitemap answers 503 to every visitor. */
const checkRedis = () =>
  run('redis', async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL / _TOKEN not configured')

    const res = await fetch(`${url}/set/health:ping/ok?EX=60`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return 'reachable'
  })

/**
 * PageSpeed Insights: that Google still accepts our key.
 *
 * The thing this catches is specific and would otherwise be silent. **PSI accepts requests
 * without a key**, so nothing 401s — but the anonymous quota is shared per-IP and measured
 * 2026-09-20 to be exhausted already: a keyless call returned 429 on the first try. So a
 * missing or rejected key does not degrade Core Web Vitals, it removes them. Both callers
 * treat PSI as optional: `performance-fixer` only sets `key` when one exists, and
 * `fetchPSIMetrics` returns null on any failure so the SEO Audit quietly keeps its heuristic
 * result. Correct for a user-facing request, and exactly why a revoked key is invisible.
 *
 * So an unset `GOOGLE_API_KEY` is a failure here rather than a reason to skip the check.
 *
 * **The url is deliberately invalid.** Google validates the API key at the gateway before the
 * request reaches PSI, measured 2026-09-20: a rejected key answers "API key not valid" in
 * 0.5-1.9s whether the url is good or junk, while an accepted key gets far enough to complain
 * about the url instead. Neither runs Lighthouse.
 *
 * Running a real audit was the first design and it was wrong. Four consecutive runs against a
 * valid key returned 152ms, 7.2s, an HTTP 500 at 38.8s, and a timeout — PSI's audit latency
 * is its own business and swings by two orders of magnitude. A check that fails on a healthy
 * credential a quarter of the time is one nobody reads, which is worse than not having it.
 * This deliberately trades "PSI can complete an audit", which varies by the minute and is not
 * actionable, for "PSI accepts our key", which is the thing that breaks silently and is.
 */
const checkPageSpeed = () =>
  run('pagespeed', async () => {
    const key = process.env.GOOGLE_API_KEY
    if (!key) throw new Error('GOOGLE_API_KEY not configured — keyless PSI is 429-limited, so CWV data disappears')

    const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    u.searchParams.set('url', 'not-a-url')
    u.searchParams.set('key', key)

    const res = await fetch(u.toString(), { cache: 'no-store' })
    const body = await res.text().catch(() => '')

    // Name a rejected key rather than reporting a bare 400: "key rejected" and "Google is
    // having a bad day" call for different responses from us.
    if (/API key not valid|API_KEY_INVALID|keyInvalid|PERMISSION_DENIED|blocked|disabled/i.test(body)) {
      throw new Error(`key rejected (HTTP ${res.status})`)
    }
    // A keyed request that still hits a quota wall means the key is not being applied, or its
    // own daily limit is gone — either way CWV data stops, which is what we are watching for.
    if (res.status === 429) throw new Error('quota exceeded — key not applied, or daily limit reached')

    return `key accepted (HTTP ${res.status} on a deliberately invalid url)`
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const denied = cronAuthFailure(req)
  if (denied) return denied

  const started = Date.now()

  // Parallel, and each already catches its own failure — one dead provider must not hide
  // the state of the other five, which is exactly what a sequential run would do.
  const checks = await Promise.all([
    checkDatabase(),
    checkLLM(),
    checkDataForSEO(),
    checkOpenPageRank(),
    checkRedis(),
    checkPageSpeed(),
  ])

  const failed = checks.filter(c => !c.ok)
  const healthy = failed.length === 0
  const summary = { healthy, checks, ms: Date.now() - started }

  console.log(`[Health] ${JSON.stringify(summary)}`)

  // The only evidence a *passing* run leaves: alerts are failure-only and this plan
  // retains no runtime logs, so without a row there is no way to tell a healthy check
  // from one that quietly stopped being invoked. The full Check[] is kept, not just the
  // verdict, so a past failure can be read back with its original message.
  //
  // A database outage takes this down with it — the one failure the record cannot capture
  // is the one that stops it being written. That is why the email and the 503 both stay:
  // three signals that fail independently.
  await recordCronRun('health', healthy, summary.ms, checks)

  if (!healthy) {
    // Emailed on every failing run rather than once on transition, so four times a day
    // while something stays broken. Tracking transitions needs somewhere to store the
    // previous verdict, and a nag about a real outage is the failure mode worth having —
    // the alternative is one message lost in a busy inbox and another three-day silence.
    await sendHealthAlertEmail(failed, checks)
  }

  // Non-200 so the run is marked failed in Vercel's cron dashboard. That signal costs
  // nothing and does not depend on Resend, which is itself a service that can stop
  // working — an alert that can only arrive by email cannot report a broken mailer.
  return Response.json(summary, { status: healthy ? 200 : 503 })
}
