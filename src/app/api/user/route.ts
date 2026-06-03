import { NextRequest } from 'next/server'
import { getUserUsage } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  try {
    const usage = await getUserUsage()
    return apiSuccess(usage)
  } catch (e) {
    return apiError(e)
  }
}
