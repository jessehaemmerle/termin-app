import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from './env'

function key(): Buffer {
  return Buffer.from(env().APP_ENCRYPTION_KEY, 'base64')
}

/** Verschlüsselt Geheimnisse (SMTP-Passwort, API-Token, TOTP) mit AES-256-GCM. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join(':')
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(':')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unbekanntes Verschlüsselungsformat')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export function decryptOrNull(payload: string | null | undefined): string | null {
  if (!payload) return null
  try {
    return decrypt(payload)
  } catch {
    return null
  }
}

/** Zufälliges, URL-sicheres Token mit 256 Bit Entropie. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
