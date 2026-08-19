// A local mirror of Groq's per-minute token bucket, so we queue against it instead of
// discovering it as a 429.
//
// WHY THIS EXISTS, and why the obvious mental model of it is wrong:
//
// Groq charges the bucket `prompt_tokens + max_tokens` at the moment the request is
// accepted — the *reservation*, not what the call ends up using — and the unused portion
// is never refunded. Measured 2026-08-19 against gpt-oss-20b: a call with max_tokens=3000
// whose completion was 41 tokens decremented `x-ratelimit-remaining-tokens` by 3,028, and
// three probes over the following 16 seconds showed the bucket climbing back at the plain
// refill rate with no refund. So an over-provisioned max_tokens is spent whether the model
// needs it or not, and sizing budgets generously is not free — it is the single largest
// consumer of a Free-plan bucket.
//
// The refill is continuous at capacity/60 per second (measured ~133/s on an 8,000 bucket),
// not a step reset at the top of each minute.
//
// The limit is per model and ORG-WIDE: every environment shares it, local development
// included, and gpt-oss-20b and gpt-oss-120b hold separate buckets. That means this
// process's arithmetic is always an underestimate of what has been spent — hence sync()
// below, which folds the authoritative number from each response's headers back in.

/** Tokens per minute per model. 8,000 on the current Free plan; the Developer plan is
 *  ~250k–300k, at which point this limiter simply stops being the thing that waits. */
const CAPACITY = Number(process.env.GROQ_TPM ?? 8_000)

/** Refill is continuous, so capacity/60 is tokens per second. */
const REFILL_PER_MS = CAPACITY / 60 / 1000

/** Leave a little of the bucket unclaimed. The estimate of prompt_tokens below is
 *  approximate, and a request whose true cost overshoots the bucket is refused outright
 *  ("Request too large") rather than queued by Groq. */
const HEADROOM = 200

/** Thrown when a call cannot get bucket capacity inside the caller's deadline. Distinct
 *  from a 429 so routes can say "the per-minute limit is saturated" rather than a generic
 *  failure — the user's content was never sent and nothing was charged. */
export class GroqCapacityError extends Error {
  constructor(public waitedMs: number, public neededMs: number) {
    super(
      `Groq per-minute token limit saturated: needed about ${Math.ceil(neededMs / 1000)}s ` +
      `of capacity, waited ${Math.ceil(waitedMs / 1000)}s. Nothing was sent.`
    )
    this.name = 'GroqCapacityError'
  }
}

interface Bucket {
  tokens: number
  lastRefillAt: number
  /** Serializes reservations. Two callers that both read a bucket with room for one of
   *  them would both proceed, which is precisely the seven-way collision this exists to
   *  prevent, so admissions are chained rather than concurrent. */
  chain: Promise<void>
}

const buckets = new Map<string, Bucket>()

function bucketFor(model: string): Bucket {
  let b = buckets.get(model)
  if (!b) {
    b = { tokens: CAPACITY, lastRefillAt: Date.now(), chain: Promise.resolve() }
    buckets.set(model, b)
  }
  return b
}

function refill(b: Bucket): void {
  const now = Date.now()
  b.tokens = Math.min(CAPACITY, b.tokens + (now - b.lastRefillAt) * REFILL_PER_MS)
  b.lastRefillAt = now
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Rough token count for a prompt. Deliberately an overestimate (real English on these
 * models measured ~5.3 chars/token; this assumes 4), because reserving slightly too much
 * only costs a little pacing while reserving too little means a 429 the caller has to
 * absorb. Drift is corrected by sync() after every call anyway.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * The largest max_tokens that can still fit alongside this prompt.
 *
 * Groq rejects a request outright when prompt + max_tokens exceeds the whole bucket, so a
 * budget that is legal on its own can still be refused once a long prompt is attached —
 * GROQ_MAX_REQUEST_TOKENS caps the budget at 7,500 but says nothing about the prompt in
 * front of it, and 7,500 + an 800-token prompt is over an 8,000 bucket.
 */
export function fitBudget(estimatedInput: number, wanted: number): number {
  return Math.max(256, Math.min(wanted, CAPACITY - HEADROOM - estimatedInput))
}

/**
 * Wait until `cost` tokens of bucket are available, then claim them.
 *
 * Returns the milliseconds spent queuing, for logging. Throws GroqCapacityError rather
 * than blocking past `maxWaitMs`: every caller is inside a serverless function with a wall
 * clock, and a clear error beats being killed mid-request with no response at all.
 */
export async function reserve(model: string, cost: number, maxWaitMs: number): Promise<number> {
  const b = bucketFor(model)
  const startedAt = Date.now()

  // Join the queue: each caller waits for the one before it to be admitted.
  const admitted = b.chain.then(async () => {
    // A cost larger than the whole bucket can never be satisfied. fitBudget() should have
    // prevented it; clamp rather than spin forever if some caller bypasses it.
    const want = Math.min(cost, CAPACITY - HEADROOM)

    for (;;) {
      refill(b)
      if (b.tokens >= want) {
        b.tokens -= want
        return
      }
      const needMs = (want - b.tokens) / REFILL_PER_MS
      const waitedSoFar = Date.now() - startedAt
      if (waitedSoFar + needMs > maxWaitMs) {
        throw new GroqCapacityError(waitedSoFar, needMs)
      }
      // Sleep in slices so a sync() from a concurrent response is picked up rather than
      // slept through.
      await sleep(Math.min(needMs, 1_000) + 25)
    }
  })

  // The chain must advance whether this caller was admitted or gave up, or one timeout
  // would wedge every later call behind it. It carries no value and never rejects.
  b.chain = admitted.then(() => undefined, () => undefined)

  await admitted
  return Date.now() - startedAt
}

/**
 * Hand back capacity that was reserved but provably not charged.
 *
 * Only ever used for the difference between our estimated prompt size and the
 * `prompt_tokens` the response reports, which Groq bills exactly. The unused part of
 * max_tokens is NOT refundable — Groq keeps it — so nothing else may be released here.
 */
export function release(model: string, amount: number): void {
  if (!(amount > 0)) return
  const b = bucketFor(model)
  refill(b)
  b.tokens = Math.min(CAPACITY, b.tokens + amount)
}

/**
 * Fold the authoritative remaining-token count from a response header into the local
 * bucket.
 *
 * Only ever lowers it. The header is the org-wide truth and this process sees just its own
 * share of the traffic, so a header lower than the local count means someone else spent
 * it; a header higher usually means our own reservation has not been reflected yet, and
 * raising the local count on that basis would hand out capacity twice.
 */
export function sync(model: string, remaining: number): void {
  if (!Number.isFinite(remaining)) return
  const b = bucketFor(model)
  refill(b)
  if (remaining < b.tokens) {
    b.tokens = Math.max(0, remaining)
    b.lastRefillAt = Date.now()
  }
}

/**
 * Record that Groq refused a call for capacity.
 *
 * A fresh process starts this bucket full, because it has no way to know what the rest of
 * the org has spent and starting it empty would make every cold start wait a minute for a
 * bucket that is probably fine. The cost of that optimism is that the first call after a
 * cold start can be refused — and without this, nothing corrects the belief: the local
 * bucket still reads "plenty left", so every other queued call is admitted straight into
 * the same 429. One refusal would become a cascade.
 *
 * A 429 is the provider stating the bucket is empty, which is better information than any
 * local estimate, so it is taken literally.
 */
export function markExhausted(model: string): void {
  const b = bucketFor(model)
  refill(b)
  b.tokens = 0
  b.lastRefillAt = Date.now()
}

/** Seconds until the bucket could satisfy `cost` — for user-facing "try again in N". */
export function secondsUntilAvailable(model: string, cost: number): number {
  const b = bucketFor(model)
  refill(b)
  const want = Math.min(cost, CAPACITY - HEADROOM)
  if (b.tokens >= want) return 0
  return Math.ceil((want - b.tokens) / REFILL_PER_MS / 1000)
}
