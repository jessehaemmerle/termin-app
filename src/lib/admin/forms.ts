import { timeToMinutes } from '../time'

/** "52", "52,50" oder "52.50" -> Cent; leer -> null. */
export function parsePriceCents(value: string | undefined | null): number | null | 'invalid' {
  if (!value || !value.trim()) return null
  const normalized = value.trim().replace(/\s|€/g, '').replace(',', '.')
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return 'invalid'
  return Math.round(Number(normalized) * 100)
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export type HoursRow = { weekday: number; startMinute: number; endMinute: number }

/**
 * Liest Wochenzeiten aus Formularfeldern d{1-7}_s{1-2} / d{1-7}_e{1-2} (HH:MM).
 * Liefert Fehlertext je Wochentag, wenn Zeiten ungültig sind oder sich überschneiden.
 */
export function parseWeeklyHours(formData: FormData): { rows: HoursRow[]; errors: Record<string, string> } {
  const rows: HoursRow[] = []
  const errors: Record<string, string> = {}
  for (let day = 1; day <= 7; day++) {
    const ranges: { start: number; end: number }[] = []
    for (let slot = 1; slot <= 2; slot++) {
      const s = String(formData.get(`d${day}_s${slot}`) ?? '').trim()
      const e = String(formData.get(`d${day}_e${slot}`) ?? '').trim()
      if (!s && !e) continue
      const start = timeToMinutes(s)
      const end = timeToMinutes(e)
      if (start === null || end === null || end <= start) {
        errors[`d${day}`] = 'Bitte Beginn und Ende angeben; das Ende muss nach dem Beginn liegen.'
        continue
      }
      ranges.push({ start, end })
    }
    ranges.sort((a, b) => a.start - b.start)
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start < ranges[i - 1].end) errors[`d${day}`] = 'Die beiden Zeitfenster überschneiden sich.'
    }
    for (const r of ranges) rows.push({ weekday: day, startMinute: r.start, endMinute: r.end })
  }
  return { rows, errors }
}
