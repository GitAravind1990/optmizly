import { NextResponse } from 'next/server'
import { AuthError } from './auth'
import { ZodError } from 'zod'
import { AIResponseParseError } from './anthropic'

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 })
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
  // All other errors (Prisma, Anthropic SDK, network, etc.) — log internally, never expose details
  console.error('[API Error]', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
