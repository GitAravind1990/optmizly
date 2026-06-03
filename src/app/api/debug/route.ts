import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const ADMIN_EMAIL = 'gkm.aravind@gmail.com'

function check(key: string) {
  const val = process.env[key]
  return val ? `SET (${val.length} chars)` : 'MISSING'
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  return Response.json({
    DATABASE_URL:                     check('DATABASE_URL'),
    CLERK_SECRET_KEY:                 check('CLERK_SECRET_KEY'),
    CLERK_WEBHOOK_SECRET:             check('CLERK_WEBHOOK_SECRET'),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: check('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    ANTHROPIC_API_KEY:                check('ANTHROPIC_API_KEY'),
    DODO_API_KEY:                     check('DODO_API_KEY'),
    DODO_WEBHOOK_SECRET:              check('DODO_WEBHOOK_SECRET'),
    RESEND_API_KEY:                   check('RESEND_API_KEY'),
    NEXT_PUBLIC_APP_URL:              check('NEXT_PUBLIC_APP_URL'),
    VERCEL_ENV:                       process.env['VERCEL_ENV'] ?? '(not set)',
    NODE_ENV:                         process.env['NODE_ENV'],
  })
}
