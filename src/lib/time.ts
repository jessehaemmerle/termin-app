import { TZDate } from '@date-fns/tz'

// Hilfsfunktionen für Ortszeit <-> UTC. Kalendertage werden als
// "YYYY-MM-DD"-Strings in der Zeitzone des Betriebs behandelt.

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDateString(value: string | null | undefined): value is string {
  if (!value) return false
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [, y, mo, d] = m.map(Number)
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

function parts(date: string): [number, number, number] {
  const m = DATE_RE.exec(date)
  if (!m) throw new Error(`Ungültiges Datum: ${date}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Zeitpunkt (UTC) für einen Kalendertag + Minuten ab Mitternacht in der Zeitzone. */
export function zonedInstant(date: string, minuteOfDay: number, timeZone: string): Date {
  const [y, m, d] = parts(date)
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  if (hours >= 24) {
    const next = addDays(date, 1)
    return zonedInstant(next, minuteOfDay - 24 * 60, timeZone)
  }
  return new Date(new TZDate(y, m - 1, d, hours, minutes, timeZone).getTime())
}

export function startOfDay(date: string, timeZone: string): Date {
  return zonedInstant(date, 0, timeZone)
}

export function endOfDay(date: string, timeZone: string): Date {
  return zonedInstant(addDays(date, 1), 0, timeZone)
}

/** Kalendertag (YYYY-MM-DD) eines Zeitpunkts in der Zeitzone. */
export function localDate(instant: Date, timeZone: string): string {
  const z = new TZDate(instant.getTime(), timeZone)
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`
}

export function localMinuteOfDay(instant: Date, timeZone: string): number {
  const z = new TZDate(instant.getTime(), timeZone)
  return z.getHours() * 60 + z.getMinutes()
}

/** ISO-Wochentag 1 = Montag … 7 = Sonntag. */
export function isoWeekday(date: string): number {
  const [y, m, d] = parts(date)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from)
  const [y2, m2, d2] = parts(to)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY)
}

/** Montag der Woche, in der `date` liegt. */
export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date))
}

export function today(timeZone: string, now = new Date()): string {
  return localDate(now, timeZone)
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function timeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null
  return h * 60 + min
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Liegt der Zeitpunkt innerhalb des Mindestvorlaufs (oder in der Vergangenheit)? */
export function isPastLeadTime(start: Date, minLeadMinutes: number, now = Date.now()): boolean {
  return start.getTime() < now + minLeadMinutes * MINUTE
}
