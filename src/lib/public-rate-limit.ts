// Per-IP daily caps for endpoints that anyone on the internet can call.
//
// The middleware's global limiter (30 requests / 60s per IP) stops hammering but not
// cost: 30 requests a minute all day is thousands of model calls. Anything unauthenticated
// that spends money needs a second, slower bucket.
//
// SERVER ONLY.

import type { NextRequest } from 'next/server'

type Limiter = {
  consume: (key: string, limit: number, windowSeconds: number) => Promise<{ allowed: boolean; remaining: number }>
  refund: (key: string) => Promise<void>
}

let limiter: Limiter | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  limiter = {
    // A plain INCR with an expiry rather than @upstash/ratelimit's sliding window: the
    // window here is a whole day, and a fixed bucket that resets at a predictable time is
    // easier to explain to a user ("resets tomorrow") than a rolling one.
    consume: async (key, limit, windowSeconds) => {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSeconds)
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
    },
    refund: async key => {
      // DECR on a key that expired in between would create a fresh one at -1 with no TTL,
      // which then never clears. Deleting at or below zero keeps that from accumulating.
      const remaining = await redis.decr(key)
      if (remaining <= 0) await redis.del(key)
    },
  }
}

/** Best-effort client IP. Vercel sets x-forwarded-for; the first entry is the client. */
export function clientIp(req: NextRequest | Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export interface RateVerdict {
  allowed: boolean
  remaining: number
  /** True when no limiter is configured. Callers must refuse rather than serve. */
  unavailable?: boolean
  /**
   * Hands the consumed unit back. Present only on a verdict that actually took one.
   *
   * Call this when the work the unit paid for did not happen — a model that was
   * unreachable, or output that could not be parsed. Charging for that spends a
   * visitor's allowance on our failure, and with only five a day two bad generations
   * take almost half of it before they have seen the tool work at all.
   *
   * Never fails the request it is cleaning up after: a refund that throws would turn a
   * recoverable error into a 500.
   */
  refund?: () => Promise<void>
}

function dailyKey(req: NextRequest | Request, bucket: string): string {
  // UTC day in the key, so the bucket expires on its own and "resets tomorrow" is true.
  const day = new Date().toISOString().slice(0, 10)
  return `pub:${bucket}:${day}:${clientIp(req)}`
}

function monthlyKey(req: NextRequest | Request, bucket: string): string {
  // Same trick one unit up: the UTC month is in the key, so "resets on the 1st" is true
  // without a reset job, and a visitor cannot get a fresh allowance by waiting for midnight.
  const month = new Date().toISOString().slice(0, 7)
  return `pub:${bucket}:${month}:${clientIp(req)}`
}

/**
 * Consumes one unit of a per-IP **monthly** allowance.
 *
 * For tools where a daily allowance is too generous to give away. The prospect finder costs
 * three billed Google requests per run, so five a day per IP would be 150 searches a month
 * from a single visitor — far past the point where a free tool is a lead magnet rather than
 * a service.
 *
 * **Fails closed**, exactly like the daily version and for the same reason: with no Redis
 * there is no way to bound spend on a public endpoint.
 */
export async function consumeMonthlyIpQuota(
  req: NextRequest | Request,
  bucket: string,
  limit: number
): Promise<RateVerdict> {
  if (!limiter) return { allowed: false, remaining: 0, unavailable: true }

  const active = limiter
  const key = monthlyKey(req, bucket)
  // 32 days outlives the longest month, so a key set on the 1st survives to the 31st and
  // then clears itself rather than granting a second allowance mid-month.
  const verdict = await active.consume(key, limit, 32 * 24 * 60 * 60)

  return {
    ...verdict,
    refund: async () => {
      try {
        await active.refund(key)
      } catch {
        // A refund that throws would turn a recoverable error into a 500.
      }
    },
  }
}

/**
 * Consumes one unit of a per-IP daily allowance.
 *
 * **Fails closed.** With no Redis configured there is no way to bound spend on a public
 * endpoint, and serving anyway would leave an unmetered model call open to the internet.
 * The middleware makes the same choice for its own limiter in production.
 */
export async function consumeDailyIpQuota(
  req: NextRequest | Request,
  bucket: string,
  limit: number
): Promise<RateVerdict> {
  if (!limiter) return { allowed: false, remaining: 0, unavailable: true }

  const active = limiter
  const key = dailyKey(req, bucket)
  // 26h, comfortably past midnight UTC, so a key set at 23:59 still clears.
  const verdict = await active.consume(key, limit, 26 * 60 * 60)

  return {
    ...verdict,
    refund: async () => {
      try {
        await active.refund(key)
      } catch {
        // A lost refund costs the visitor one generation. Surfacing it would cost them
        // the error message explaining what actually went wrong, which is worth more.
      }
    },
  }
}
