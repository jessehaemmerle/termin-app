import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

/** Normalisiert eine Telefonnummer auf E.164 (Standardland Österreich). */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed, 'AT')
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

export function isMobileCapable(e164: string): boolean {
  const parsed = parsePhoneNumberFromString(e164)
  const type = parsed?.getType()
  return type === undefined || type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE'
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatInternational() : e164
}

/** wa.me erwartet die Nummer ohne "+" und ohne Leerzeichen. */
export function waMeNumber(e164: string): string {
  return e164.replace(/[^0-9]/g, '')
}

export function waMeLink(e164: string, text?: string): string {
  const base = `https://wa.me/${waMeNumber(e164)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
