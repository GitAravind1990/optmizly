import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY
  if (!b64) throw new Error('ENCRYPTION_KEY not configured')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must decode to 32 bytes (generate with: openssl rand -base64 32)')
  return key
}

/** Encrypts a string for storage at rest. Format: "<iv>.<authTag>.<ciphertext>", each base64. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload')
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
