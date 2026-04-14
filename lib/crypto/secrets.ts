import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

/**
 * AES-256-GCM wrapper for user secrets stored in DB.
 *
 * Key management:
 *   - `MASTER_SECRET_KEY` env var = 64-hex (32 bytes). Generate with:
 *     `openssl rand -hex 32`
 *   - Store in Doppler (prod) / .env.local (dev).
 *   - Rotation : see `reencrypt()` below (à implémenter avec un versioning si besoin).
 *
 * Output format : `base64(iv [12 bytes] || authTag [16 bytes] || ciphertext)`.
 * Prefix `v1:` to allow future versioning.
 */

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const VERSION = 'v1'

function getKey(): Buffer {
  const raw = process.env.MASTER_SECRET_KEY
  if (!raw) throw new Error('MASTER_SECRET_KEY is required to encrypt/decrypt secrets')
  if (raw.length !== 64) throw new Error('MASTER_SECRET_KEY must be 64 hex chars (32 bytes)')
  return Buffer.from(raw, 'hex')
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, authTag, encrypted])
  return `${VERSION}:${packed.toString('base64')}`
}

export function decryptSecret(token: string): string {
  const [version, payload] = token.split(':', 2)
  if (version !== VERSION) throw new Error(`Unsupported secret version: ${version}`)
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Deterministic fingerprint — safe to store/index in DB for lookup without exposing plaintext.
 * SHA-256(HMAC(key, plaintext)) — collision-resistant + stable.
 */
export function secretFingerprint(plaintext: string): string {
  const key = getKey()
  return createHash('sha256').update(Buffer.concat([key, Buffer.from(plaintext, 'utf8')])).digest('hex')
}
