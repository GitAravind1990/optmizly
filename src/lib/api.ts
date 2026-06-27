import { NextResponse } from 'next/server'
import { AuthError } from './auth'
import { ZodError } from 'zod'

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 })
  }
  // Plain validation objects: { message: string, status: 4xx } — used for user-facing route errors
  if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
    const obj = error as Record<string, unknown>
    if (typeof obj.status === 'number' && obj.status >= 400 && obj.status < 500 && typeof obj.message === 'string') {
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
