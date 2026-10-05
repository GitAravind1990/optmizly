import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminAuth'

/**
 * Where a user lands once Clerk has signed them in.
 *
 * `redirect_url` carries the page the middleware guard bounced them away from, so
 * following a deep link into the dashboard while signed out returns them to that page
 * rather than dropping them on the dashboard home.
 *
 * It arrives from the query string, so it is attacker-controllable and must never be
 * trusted as a destination. Only same-site absolute paths are honoured.
 */
function safeInternalPath(raw: string | undefined): string | null {
  if (!raw) return null

  // May arrive percent-encoded; a malformed encoding is simply not a path we will use.
  let value: string
  try {
    value = decodeURIComponent(raw)
  } catch {
    return null
  }

  // Must be a single leading slash. This rejects absolute URLs ("https://evil.com"),
  // scheme-relative ones ("//evil.com", which browsers treat as absolute), and
  // backslash variants that some parsers normalise into "//".
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null

  // An allowlist of destinations, not an allowlist of characters: the shape checks above stop
  // an attacker sending someone off-site, and this stops them being sent anywhere on-site that
  // we have not thought about.
  //
  //   /dashboard — the only guarded area, so the only place a middleware bounce originates.
  //   /pricing   — a visitor who followed a launch link with a discount code is sent to sign
  //                up and must come back to the page that holds their code. Landing them on
  //                the dashboard instead loses the purchase they were two clicks from making.
  //
  // Both are pages we would happily send anyone to; neither takes a destructive action on
  // load. Add to this list only with that test in mind.
  const allowed = ['/dashboard', '/pricing']
  if (!allowed.some(prefix => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`))) {
    return null
  }

  return value
}

export default async function AuthRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/login')

  const params = await searchParams
  const raw = params.redirect_url
  const target = safeInternalPath(Array.isArray(raw) ? raw[0] : raw)

  const admin = await requireAdmin()

  // An explicit destination wins for ordinary users. Admins still go to their own
  // dashboard by default, but not when they deliberately followed a link into the
  // normal dashboard — that would make those links unusable for them.
  if (target) redirect(target)
  redirect(admin.ok ? '/admin/dashboard' : '/dashboard')
}
