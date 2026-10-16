import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { normalizePhone, waMeLink } from '@/lib/phone'
import { parsePriceCents, parseWeeklyHours } from '@/lib/admin/forms'
import { addDays, isoWeekday, isValidDateString, startOfWeek, timeToMinutes, zonedInstant } from '@/lib/time'
import { generateRecoveryCodes, generateTotpSecret, matchRecoveryCode, verifyTotp } from '@/lib/auth/totp'
import { TOTP, Secret } from 'otpauth'

beforeAll(() => {
  process.env.DATABASE_URL ??= 'postgresql://test@localhost/test'
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('Verschlüsselung', () => {
  it('verschlüsselt mit AES-GCM und erkennt Manipulation', async () => {
    const { encrypt, decrypt, decryptOrNull } = await import('@/lib/crypto')
    const cipher = encrypt('geheimes-token')
    expect(cipher).not.toContain('geheimes')
    expect(decrypt(cipher)).toBe('geheimes-token')
    expect(encrypt('x')).not.toBe(encrypt('x'))
    const parts = cipher.split(':')
    parts[3] = Buffer.from('manipuliert').toString('base64url')
    expect(decryptOrNull(parts.join(':'))).toBeNull()
  })
})

describe('Telefonnummern', () => {
  it('normalisiert österreichische Nummern nach E.164', () => {
    expect(normalizePhone('0664 1234567')).toBe('+436641234567')
    expect(normalizePhone('+43 (0) 664/123 45 67')).toBe('+436641234567')
    expect(normalizePhone('+49 151 23456789')).toBe('+4915123456789')
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })

  it('baut wa.me-Links ohne Pluszeichen mit kodiertem Text', () => {
    expect(waMeLink('+436641234567', 'Hallo & Grüße')).toBe('https://wa.me/436641234567?text=Hallo%20%26%20Gr%C3%BC%C3%9Fe')
  })
})

describe('Formular-Hilfen', () => {
  it('liest Preise in Cent', () => {
    expect(parsePriceCents('52,50')).toBe(5250)
    expect(parsePriceCents('€ 32')).toBe(3200)
    expect(parsePriceCents('')).toBeNull()
    expect(parsePriceCents('abc')).toBe('invalid')
  })

  it('liest Wochenzeiten und erkennt Fehler', () => {
    const fd = new FormData()
    fd.set('d1_s1', '09:00')
    fd.set('d1_e1', '12:00')
    fd.set('d1_s2', '13:00')
    fd.set('d1_e2', '18:00')
    fd.set('d2_s1', '10:00')
    fd.set('d2_e1', '09:00')
    const { rows, errors } = parseWeeklyHours(fd)
    expect(rows).toEqual([
      { weekday: 1, startMinute: 540, endMinute: 720 },
      { weekday: 1, startMinute: 780, endMinute: 1080 },
    ])
    expect(errors.d2).toBeDefined()
  })
})

describe('Zeit', () => {
  it('rechnet Kalendertage und Wochentage', () => {
    expect(isValidDateString('2026-02-29')).toBe(false)
    expect(isValidDateString('2028-02-29')).toBe(true)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(isoWeekday('2026-10-18')).toBe(7)
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12')
    expect(timeToMinutes('24:00')).toBe(1440)
    expect(timeToMinutes('25:00')).toBeNull()
  })

  it('wandelt Ortszeit Wien korrekt in UTC (Sommer- und Winterzeit)', () => {
    expect(zonedInstant('2026-07-01', 600, 'Europe/Vienna').toISOString()).toBe('2026-07-01T08:00:00.000Z')
    expect(zonedInstant('2026-12-01', 600, 'Europe/Vienna').toISOString()).toBe('2026-12-01T09:00:00.000Z')
  })
})

describe('Zwei-Faktor', () => {
  it('prüft TOTP-Codes und Wiederherstellungscodes', () => {
    const secret = generateTotpSecret()
    const code = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30, algorithm: 'SHA1' }).generate()
    expect(verifyTotp(secret, code)).toBe(true)
    expect(verifyTotp(secret, '000000') && code !== '000000').toBe(false)
    const { codes, hashes } = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
    expect(matchRecoveryCode(hashes, codes[3].toUpperCase())).toBe(hashes[3])
    expect(matchRecoveryCode(hashes, 'falsch-1234')).toBeNull()
  })
})
