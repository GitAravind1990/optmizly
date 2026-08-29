import { isIP } from 'net'
import type { LookupFunction } from 'net'
import dns from 'dns/promises'
import dnsCallback from 'dns'
import type { LookupAddress } from 'dns'

/**
 * Address ranges nothing on the public internet should be serving a website from.
 *
 * Checked against the address we are actually about to connect to, not against a name.
 * The list is deliberately broader than "RFC1918 plus loopback", because an SSRF target
 * only has to be reachable, not routable on the internet.
 */
function isPrivateIP(ip: string): boolean {
  // ::ffff:127.0.0.1 is a loopback address wearing an IPv6 costume, and every one of the
  // IPv4 patterns below would miss it. Unwrap before testing.
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  const addr = (v4Mapped ? v4Mapped[1] : ip).toLowerCase()

  return [
    /^127\./,                        // loopback
    /^10\./,                         // RFC1918
    /^172\.(1[6-9]|2\d|3[01])\./,    // RFC1918
    /^192\.168\./,                   // RFC1918
    /^169\.254\./,                   // link-local, and where the cloud metadata endpoint lives
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64/10 carrier-grade NAT
    /^192\.0\.0\./,                  // IETF protocol assignments
    /^192\.0\.2\./,                  // TEST-NET-1
    /^198\.1[89]\./,                 // 198.18/15 benchmarking
    /^198\.51\.100\./,               // TEST-NET-2
    /^203\.0\.113\./,                // TEST-NET-3
    /^(22[4-9]|23\d)\./,             // 224/4 multicast
    /^(24\d|25[0-5])\./,             // 240/4 reserved, includes 255.255.255.255
    /^0\./,                          // "this network"
    /^::1$/,                         // IPv6 loopback
    /^::$/,                          // unspecified
    /^fe[89ab]/i,                    // fe80::/10 IPv6 link-local
    /^f[cd]/i,                       // fc00::/7 unique local
    /^ff/i,                          // IPv6 multicast
  ].some(r => r.test(addr))
}

/**
 * Pre-flight check on a URL before any request is made.
 *
 * This rejects the obvious cases early and gives the caller a usable error message. It is
 * NOT what makes a fetch safe on its own: between this lookup and the connection, the name
 * can resolve to something else. `safeLookup` below is what actually closes that.
 */
export async function validateUrl(urlStr: string): Promise<void> {
  let parsed: URL
  try { parsed = new URL(urlStr) } catch { throw new Error('Invalid URL') }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are allowed')
  }

  const hostname = parsed.hostname
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('Private/internal URLs are not allowed')
    return
  }

  try {
    // `all` so a name that resolves to both a public and a private address is refused
    // rather than judged on whichever one happened to come back first.
    const addresses = await dns.lookup(hostname, { all: true })
    if (addresses.some(a => isPrivateIP(a.address))) {
      throw new Error('Private/internal URLs are not allowed')
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    throw new Error(msg.includes('not allowed') ? msg : 'Could not resolve hostname')
  }
}

/** Thrown by `safeLookup` when the address a connection resolved to is not allowed. */
export class BlockedAddressError extends Error {}

/**
 * A `lookup` implementation for `http.request` / `https.request` that refuses private
 * addresses **at connect time**.
 *
 * This is the part that closes DNS rebinding. `validateUrl` resolves a name and approves
 * it; the connection then resolves the same name again, and an attacker who controls the
 * authoritative server can answer differently the second time — a public address for the
 * check, 127.0.0.1 or 169.254.169.254 for the connection. Nothing about validating first
 * prevents that, because the two resolutions are separate events.
 *
 * Passing this as the request's `lookup` removes the second resolution as a separate event:
 * the address this function approves is the exact address the socket connects to. There is
 * no window in between to swap it.
 *
 * Node calls this with the same signature as `dns.lookup`, including the `all` form, so
 * both are handled.
 */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsCallback.lookup(hostname, options as never, (err, address, family) => {
    const cb = callback as (
      err: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number
    ) => void

    if (err) return cb(err, address as never, family)

    const results: LookupAddress[] = Array.isArray(address)
      ? address
      : [{ address: address as string, family: family as number }]

    const blocked = results.find(r => isPrivateIP(r.address))
    if (blocked) {
      return cb(
        new BlockedAddressError(`Refusing to connect to ${hostname}: resolves to ${blocked.address}`),
        address as never,
        family
      )
    }

    cb(null, address as never, family)
  })
}
