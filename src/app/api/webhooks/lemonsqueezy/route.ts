import { NextResponse } from 'next/server'

// Replaced by /api/webhooks/paddle
export async function POST() {
  return NextResponse.json({ error: 'Deprecated' }, { status: 410 })
}
