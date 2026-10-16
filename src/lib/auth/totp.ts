import { Secret, TOTP } from 'otpauth'
import QRCode from 'qrcode'
import { randomBytes } from 'node:crypto'
import { sha256 } from '../crypto'

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32
}

function totp(secret: string, issuer = 'Termin-App', label = 'Konto') {
  return new TOTP({ issuer, label, algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(secret) })
}

export function totpUri(secret: string, issuer: string, label: string): string {
  return totp(secret, issuer, label).toString()
}

export async function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
}

export function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  return totp(secret).validate({ token: clean, window: 1 }) !== null
}

/** Einmal-Wiederherstellungscodes (Format xxxx-xxxx), gespeichert nur als Hash. */
export function generateRecoveryCodes(count = 8): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').slice(0, 8)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
  })
  return { codes, hashes: codes.map((c) => sha256(c)) }
}

export function matchRecoveryCode(hashes: string[], input: string): string | null {
  const normalized = input.trim().toLowerCase()
  const h = sha256(normalized)
  return hashes.includes(h) ? h : null
}
