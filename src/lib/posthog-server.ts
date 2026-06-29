import { PostHog } from 'posthog-node'

// Creates a fresh client per call — correct for serverless (no persistent memory).
// flushAt:1 + flushInterval:0 means the event is sent immediately on .capture().
// shutdown() flushes any pending events and closes the connection before the
// serverless function exits.
function makeClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
}

/**
 * Capture a server-side PostHog event.
 *
 * Uses the Clerk user ID as distinct_id — same value posthog.identify() uses
 * on the client, so server and client events resolve to the same person.
 *
 * Pass $set in properties to update PostHog person properties (e.g. plan).
 *
 * Never throws — all errors are swallowed so a failed analytics call
 * cannot break an API route.
 */
export async function captureServerEvent(
  clerkId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = makeClient()
  if (!client) return
  try {
    client.capture({ distinctId: clerkId, event, properties })
    await client.shutdown()
  } catch {
    // intentional no-op
  }
}
