import { isIP } from 'net'
import dns from 'dns/promises'

function isPrivateIP(ip: string): boolean {
  return [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,   // link-local + AWS IMDS endpoint
    /^0\./,
    /^::1$/,
    /^fc/i,
    /^fd/i,
  ].some(r => r.test(ip))
}

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
    const { address } = await dns.lookup(hostname)
    if (isPrivateIP(address)) throw new Error('Private/internal URLs are not allowed')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    throw new Error(msg.includes('not allowed') ? msg : 'Could not resolve hostname')
  }
}
