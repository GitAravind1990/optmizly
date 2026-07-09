import { requireToolAccess } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { revokeGoogleToken } from '@/lib/google-oauth'
import { listSearchConsoleSites } from '@/lib/search-console'
import { captureServerException } from '@/lib/posthog-server'

export const runtime = 'nodejs'

// GET → connection status + a fresh sites.list call (also refreshes the cache)
export async function GET() {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('search-console')
    clerkId = user.clerkId

    const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId: user.userId } })
    if (!conn) return apiSuccess({ data: { connected: false } })

    const sites = await listSearchConsoleSites(user.userId)

    return apiSuccess({
      data: {
        connected: true,
        // null distinctly means "couldn't reach Google right now" — not "zero properties"
        sites,
        connectedAt: conn.createdAt,
      },
    })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/integrations/search-console' })
    return apiError(e)
  }
}

// DELETE → best-effort revoke with Google, then remove the local connection regardless
export async function DELETE() {
  let clerkId: string | null = null
  try {
    const user = await requireToolAccess('search-console')
    clerkId = user.clerkId

    const conn = await prisma.searchConsoleConnection.findUnique({ where: { userId: user.userId } })
    if (conn) {
      try {
        await revokeGoogleToken(decrypt(conn.refreshTokenEnc))
      } catch {
        // if decryption itself fails, there's nothing valid to revoke — still delete locally
      }
      await prisma.searchConsoleConnection.delete({ where: { userId: user.userId } })
    }

    return apiSuccess({ data: { deleted: true } })
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/integrations/search-console' })
    return apiError(e)
  }
}
