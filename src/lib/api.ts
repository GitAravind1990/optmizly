import { NextResponse } from 'next/server'
import { AuthError } from './auth'
import { ZodError } from 'zod'
import { AIResponseParseError, AIEmptyCompletionError, GroqCapacityError } from './llm'

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 })
  }
  // Both of these used to match none of the branches below and fall through to a bare 500
  // "Internal server error", which is wrong twice over: the condition is transient and
  // retryable, and the generic message sends people looking for a server fault. Mapped here
  // rather than per route so every caller of apiError gets it — /api/citation was the one
  // caught in the act, but nothing made it special.
  if (error instanceof GroqCapacityError) {
    console.error('[API Error] AI provider per-minute limit saturated:', error.message)
    return NextResponse.json(
      { error: 'The AI provider is at its per-minute limit right now. Nothing was saved — please try again in a minute.' },
      { status: 503 }
    )
  }
  if (error instanceof AIEmptyCompletionError) {
    // Logged in full because the message carries the token budget that ran out, which is
    // the number to raise if this stops being occasional.
    console.error('[API Error] AI returned an empty completion:', error.message)
    return NextResponse.json(
      { error: 'The AI ran out of room before writing an answer. This is usually transient — please try again.' },
      { status: 502 }
    )
  }
  if (error instanceof AIResponseParseError) {
    // The AI call itself succeeded but returned something we couldn't parse — a
    // transient/retryable condition, not a server failure. Log for visibility but
    // tell the user to retry rather than showing a scary "internal server error".
    console.error('[API Error] AI response parse failure:', error.message)
    return NextResponse.json({ error: 'The AI response could not be processed. Please try again.' }, { status: 502 })
  }
  // Plain validation/upstream-error objects: { message: string, status: 4xx|5xx } — used
  // for user-facing route errors, including intentional 502s like "upstream API failed"
  // (previously capped at <500, which silently downgraded those into a bare "Internal
  // server error" and threw away the actual message).
  if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
    const obj = error as Record<string, unknown>
    if (typeof obj.status === 'number' && obj.status >= 400 && obj.status < 600 && typeof obj.message === 'string') {
      return NextResponse.json({ error: obj.message }, { status: obj.status })
    }
  }
  // All other errors (Prisma, LLM SDK, network, etc.) — log internally, never expose details
  console.error('[API Error]', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
