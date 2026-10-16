// Anzeigeformate in österreichischem Deutsch (z. B. "Jänner").

const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('de-AT', { timeZone, ...options })
    cache.set(key, f)
  }
  return f
}

export function formatTime(date: Date, timeZone: string) {
  return formatter(timeZone, { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatDate(date: Date, timeZone: string) {
  return formatter(timeZone, { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' }).format(date)
}

export function formatDateLong(date: Date, timeZone: string) {
  return formatter(timeZone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function formatDateShort(date: Date, timeZone: string) {
  return formatter(timeZone, { weekday: 'short', day: 'numeric', month: 'numeric' }).format(date)
}

export function formatDateTime(date: Date, timeZone: string) {
  return `${formatDate(date, timeZone)}, ${formatTime(date, timeZone)} Uhr`
}

/** Kalendertag (YYYY-MM-DD) als lesbarer Text, unabhängig von Zeitzonen. */
export function formatDayString(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const [y, m, d] = date.split('-').map(Number)
  return formatter('UTC', options).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export function formatPrice(cents: number | null | undefined, from = false) {
  if (cents === null || cents === undefined) return null
  const value = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(cents / 100)
  return from ? `ab ${value}` : value
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} Min.`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`
}

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
