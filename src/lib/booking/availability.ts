import { daysBetween, isoWeekday, localDate, localMinuteOfDay, MINUTE, overlaps, zonedInstant } from '../time'

// Reine Berechnung freier Zeitfenster – ohne Datenbankzugriff, vollständig testbar.

export type Range = { start: number; end: number }

/** Wochentag (1 = Mo … 7 = So) -> Zeitfenster in Minuten ab Mitternacht (Ortszeit). */
export type WeeklyHours = Record<number, Range[]>

export type StaffInput = {
  id: string
  hours: WeeklyHours
  /** Belegte Zeiträume anderer Termine inkl. Puffer – kollidieren mit unserem Zeitraum inkl. Puffer. */
  blocked: Range[]
  /** Abwesenheiten und Kursleitungen – kollidieren mit der eigentlichen Terminzeit. */
  absent: Range[]
}

export type ResourceInput = {
  id: string
  capacity: number
  /** Belegte Zeiträume (inkl. Puffer) der Termine, die diese Ressource nutzen. */
  blocked: Range[]
}

export type SlotQuery = {
  date: string
  timeZone: string
  now: number
  slotIntervalMinutes: number
  minLeadMinutes: number
  maxAdvanceDays: number
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  /** Schließtage/-zeiten des gesamten Betriebs. */
  closures: Range[]
  staff: StaffInput[]
  resources: ResourceInput[]
  /** Admin-Buchungen: Vorlauf, Horizont und Arbeitszeiten ignorieren. */
  ignoreRules?: boolean
}

export type Slot = { start: number; end: number; staffIds: string[] }

export function isDateInHorizon(date: string, timeZone: string, now: number, maxAdvanceDays: number): boolean {
  const todayLocal = localDate(new Date(now), timeZone)
  const diff = daysBetween(todayLocal, date)
  return diff >= 0 && diff <= maxAdvanceDays
}

function anyOverlap(ranges: Range[], start: number, end: number) {
  return ranges.some((r) => overlaps(r.start, r.end, start, end))
}

/** Prüft, ob ein konkreter Zeitraum für eine Person und alle Ressourcen frei ist. */
export function isFree(
  staff: Pick<StaffInput, 'blocked' | 'absent'>,
  resources: ResourceInput[],
  closures: Range[],
  window: { start: number; end: number; blockedStart: number; blockedEnd: number },
): boolean {
  if (anyOverlap(closures, window.start, window.end)) return false
  if (anyOverlap(staff.absent, window.start, window.end)) return false
  if (anyOverlap(staff.blocked, window.blockedStart, window.blockedEnd)) return false
  for (const resource of resources) {
    const used = resource.blocked.filter((r) => overlaps(r.start, r.end, window.blockedStart, window.blockedEnd)).length
    if (used >= resource.capacity) return false
  }
  return true
}

export function computeSlots(q: SlotQuery): Slot[] {
  if (!q.ignoreRules && !isDateInHorizon(q.date, q.timeZone, q.now, q.maxAdvanceDays)) return []
  const weekday = isoWeekday(q.date)
  const earliest = q.ignoreRules ? -Infinity : q.now + q.minLeadMinutes * MINUTE
  const interval = Math.max(5, q.slotIntervalMinutes)
  const duration = q.durationMinutes * MINUTE
  const byMinute = new Map<number, Slot>()

  for (const staff of q.staff) {
    const windows = staff.hours[weekday] ?? []
    for (const w of windows) {
      let minute = Math.ceil(w.start / interval) * interval
      while (minute + q.durationMinutes <= w.end) {
        const start = zonedInstant(q.date, minute, q.timeZone).getTime()
        const end = start + duration
        // In der Sommerzeit-Lücke (z. B. 02:00–03:00 Ende März) gibt es diese Uhrzeit nicht
        const exists = localMinuteOfDay(new Date(start), q.timeZone) === minute
        if (exists && start >= earliest) {
          const free = isFree(staff, q.resources, q.closures, {
            start,
            end,
            blockedStart: start - q.bufferBeforeMinutes * MINUTE,
            blockedEnd: end + q.bufferAfterMinutes * MINUTE,
          })
          if (free) {
            const slot = byMinute.get(minute) ?? { start, end, staffIds: [] }
            if (!slot.staffIds.includes(staff.id)) slot.staffIds.push(staff.id)
            byMinute.set(minute, slot)
          }
        }
        minute += interval
      }
    }
  }

  return [...byMinute.entries()].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot)
}

/** Teilt Slots für die Anzeige in Tageszeiten auf. */
export function groupSlotsByDaypart(slots: Slot[], minuteOf: (slot: Slot) => number) {
  const groups: { label: string; slots: Slot[] }[] = [
    { label: 'Vormittag', slots: [] },
    { label: 'Nachmittag', slots: [] },
    { label: 'Abend', slots: [] },
  ]
  for (const slot of slots) {
    const m = minuteOf(slot)
    groups[m < 12 * 60 ? 0 : m < 17 * 60 ? 1 : 2].slots.push(slot)
  }
  return groups.filter((g) => g.slots.length > 0)
}
