import { describe, expect, it } from 'vitest'
import { computeSlots, groupSlotsByDaypart, isFree, type SlotQuery } from '@/lib/booking/availability'
import { localMinuteOfDay, zonedInstant } from '@/lib/time'

const TZ = 'Europe/Vienna'
// Montag, 19. Oktober 2026
const MONDAY = '2026-10-19'
const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return zonedInstant(date, h * 60 + m, TZ).getTime()
}

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: MONDAY,
    timeZone: TZ,
    now: at('2026-10-18', '12:00'),
    slotIntervalMinutes: 30,
    minLeadMinutes: 0,
    maxAdvanceDays: 60,
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    closures: [],
    staff: [{ id: 'anna', hours: { 1: [{ start: 9 * 60, end: 12 * 60 }] }, blocked: [], absent: [] }],
    resources: [],
    ...overrides,
  }
}

const times = (slots: { start: number }[]) => slots.map((s) => localMinuteOfDay(new Date(s.start), TZ)).map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)

describe('computeSlots', () => {
  it('bietet in der Sommerzeit-Lücke keine doppelten Zeiten an', () => {
    // Sonntag, 29. März 2026: 02:00 springt auf 03:00
    const slots = computeSlots(
      query({
        date: '2026-03-29',
        now: at('2026-03-20', '12:00'),
        durationMinutes: 30,
        staff: [{ id: 'anna', hours: { 7: [{ start: 60, end: 4 * 60 }] }, blocked: [], absent: [] }],
      }),
    )
    const starts = slots.map((s) => s.start)
    expect(new Set(starts).size).toBe(starts.length)
    expect(times(slots)).toEqual(['01:00', '01:30', '03:00', '03:30'])
  })

  it('liefert Slots im Raster, die vollständig in die Arbeitszeit passen', () => {
    expect(times(computeSlots(query()))).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00'])
  })

  it('berücksichtigt den Mindestvorlauf', () => {
    const slots = computeSlots(query({ now: at(MONDAY, '09:10'), minLeadMinutes: 60 }))
    expect(times(slots)).toEqual(['10:30', '11:00'])
  })

  it('liefert nichts außerhalb des Buchungshorizonts oder in der Vergangenheit', () => {
    expect(computeSlots(query({ maxAdvanceDays: 0 }))).toEqual([])
    expect(computeSlots(query({ now: at('2026-10-20', '08:00') }))).toEqual([])
  })

  it('blockiert Zeiten mit bestehenden Terminen inklusive Pufferzeiten', () => {
    const blocked = [{ start: at(MONDAY, '10:00'), end: at(MONDAY, '10:30') }]
    const slots = computeSlots(
      query({
        bufferAfterMinutes: 15,
        staff: [{ id: 'anna', hours: { 1: [{ start: 540, end: 720 }] }, blocked, absent: [] }],
      }),
    )
    // 09:00 + 60 + 15 Puffer = 10:15 > 10:00 -> kollidiert; 10:30 frei; 11:00 frei
    expect(times(slots)).toEqual(['10:30', '11:00'])
  })

  it('beachtet Schließtage des Betriebs und Abwesenheiten', () => {
    const closures = [{ start: at(MONDAY, '00:00'), end: at('2026-10-20', '00:00') }]
    expect(computeSlots(query({ closures }))).toEqual([])
    const absent = [{ start: at(MONDAY, '09:00'), end: at(MONDAY, '10:00') }]
    expect(times(computeSlots(query({ staff: [{ id: 'anna', hours: { 1: [{ start: 540, end: 720 }] }, blocked: [], absent }] })))).toEqual([
      '10:00',
      '10:30',
      '11:00',
    ])
  })

  it('respektiert die Kapazität von Ressourcen', () => {
    const lift = { id: 'hebebuehne', capacity: 2, blocked: [{ start: at(MONDAY, '09:00'), end: at(MONDAY, '10:00') }] }
    expect(times(computeSlots(query({ resources: [lift] })))).toContain('09:00')
    const full = { ...lift, blocked: [...lift.blocked, { start: at(MONDAY, '09:00'), end: at(MONDAY, '10:00') }] }
    expect(times(computeSlots(query({ resources: [full] })))).not.toContain('09:00')
    expect(times(computeSlots(query({ resources: [full] })))).toContain('10:00')
  })

  it('führt mehrere Personen zusammen und listet, wer frei ist', () => {
    const slots = computeSlots(
      query({
        staff: [
          { id: 'anna', hours: { 1: [{ start: 540, end: 600 }] }, blocked: [], absent: [] },
          { id: 'ben', hours: { 1: [{ start: 540, end: 660 }] }, blocked: [], absent: [] },
        ],
      }),
    )
    expect(slots[0].staffIds.sort()).toEqual(['anna', 'ben'])
    expect(slots.at(-1)?.staffIds).toEqual(['ben'])
  })

  it('rechnet am Tag der Zeitumstellung korrekt (Sommerzeit-Ende 25.10.2026)', () => {
    const slots = computeSlots(query({ date: '2026-10-25', staff: [{ id: 'anna', hours: { 7: [{ start: 540, end: 600 }] }, blocked: [], absent: [] }] }))
    expect(slots).toHaveLength(1)
    // 09:00 MEZ = 08:00 UTC
    expect(new Date(slots[0].start).toISOString()).toBe('2026-10-25T08:00:00.000Z')
  })

  it('ignoriert Regeln für Buchungen durch den Betrieb, nicht aber Kollisionen', () => {
    const slots = computeSlots(query({ now: at(MONDAY, '11:30'), minLeadMinutes: 600, ignoreRules: true }))
    expect(slots.length).toBeGreaterThan(0)
  })
})

describe('isFree', () => {
  it('erkennt Überschneidungen an den Rändern korrekt (halboffene Intervalle)', () => {
    const staff = { blocked: [{ start: 100, end: 200 }], absent: [] }
    expect(isFree(staff, [], [], { start: 200, end: 300, blockedStart: 200, blockedEnd: 300 })).toBe(true)
    expect(isFree(staff, [], [], { start: 199, end: 300, blockedStart: 199, blockedEnd: 300 })).toBe(false)
  })
})

describe('groupSlotsByDaypart', () => {
  it('teilt in Vormittag, Nachmittag und Abend', () => {
    const slots = [9 * 60, 13 * 60, 18 * 60].map((m) => ({ start: m, end: m + 30, staffIds: [] }))
    expect(groupSlotsByDaypart(slots, (s) => s.start).map((g) => g.label)).toEqual(['Vormittag', 'Nachmittag', 'Abend'])
  })
})
