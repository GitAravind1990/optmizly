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
  const message = error instanceof Error ? error.message : 'Internal server error'
  console.error('[API Error]', error)
  return NextResponse.json({ error: message }, { status: 500 })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
