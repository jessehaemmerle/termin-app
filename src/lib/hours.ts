import { db } from './db'
import { minutesToTime, isoWeekday, localMinuteOfDay, today } from './time'
import { WEEKDAYS } from './format'
import type { Tenant } from '@/generated/prisma/client'

export type DayHours = { weekday: number; label: string; ranges: { start: number; end: number }[] }

export async function openingHours(tenantId: string): Promise<DayHours[]> {
  const rows = await db.workingHours.findMany({
    where: { tenantId, staffId: null },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  })
  return WEEKDAYS.map((label, i) => ({
    weekday: i + 1,
    label,
    ranges: rows.filter((r) => r.weekday === i + 1).map((r) => ({ start: r.startMinute, end: r.endMinute })),
  }))
}

export function formatRanges(ranges: { start: number; end: number }[]): string {
  if (!ranges.length) return 'geschlossen'
  return ranges.map((r) => `${minutesToTime(r.start)}–${minutesToTime(r.end)}`).join(', ')
}

/** Kurzer Status für die Startseite, z. B. "Jetzt geöffnet bis 18:00 Uhr". */
export async function openStatus(tenant: Tenant, hours: DayHours[], now = new Date()): Promise<string> {
  const date = today(tenant.timezone, now)
  const closed = await db.timeOff.count({
    where: { tenantId: tenant.id, staffId: null, startsAt: { lte: now }, endsAt: { gt: now } },
  })
  if (closed) return 'Heute geschlossen'
  const ranges = hours.find((h) => h.weekday === isoWeekday(date))?.ranges ?? []
  const minute = localMinuteOfDay(now, tenant.timezone)
  const current = ranges.find((r) => r.start <= minute && minute < r.end)
  if (current) return `Jetzt geöffnet bis ${minutesToTime(current.end)} Uhr`
  const next = ranges.find((r) => r.start > minute)
  if (next) return `Heute ab ${minutesToTime(next.start)} Uhr geöffnet`
  return ranges.length ? 'Heute bereits geschlossen' : 'Heute geschlossen'
}
