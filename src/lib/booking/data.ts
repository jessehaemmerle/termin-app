import { db } from '../db'
import { addDays, endOfDay, isoWeekday, startOfDay, DAY } from '../time'
import { computeSlots, type Range, type ResourceInput, type Slot, type StaffInput, type WeeklyHours } from './availability'
import type { Prisma, PrismaClient, Service, Staff, Tenant } from '@/generated/prisma/client'

export type DbClient = PrismaClient | Prisma.TransactionClient

export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const

export type ServiceForBooking = Service & {
  staff: { staffId: string }[]
  resources: { resourceId: string; resource: { id: string; capacity: number; active: boolean } }[]
}

export async function loadService(client: DbClient, tenantId: string, serviceId: string): Promise<ServiceForBooking | null> {
  return client.service.findFirst({
    where: { id: serviceId, tenantId, active: true },
    include: { staff: true, resources: { include: { resource: true } } },
  })
}

function toWeekly(rows: { weekday: number; startMinute: number; endMinute: number }[]): WeeklyHours {
  const hours: WeeklyHours = {}
  for (const r of rows) (hours[r.weekday] ??= []).push({ start: r.startMinute, end: r.endMinute })
  for (const list of Object.values(hours)) list.sort((a, b) => a.start - b.start)
  return hours
}

export async function loadTenantHours(client: DbClient, tenantId: string): Promise<WeeklyHours> {
  const rows = await client.workingHours.findMany({ where: { tenantId, staffId: null } })
  return toWeekly(rows)
}

export type SlotContext = {
  staff: (StaffInput & { entity: Staff })[]
  resources: ResourceInput[]
  closures: Range[]
}

/**
 * Lädt alles, was für die Verfügbarkeit einer Leistung im Zeitraum [from, to)
 * nötig ist. `excludeBookingId` blendet einen Termin aus (Verschieben).
 */
export async function loadSlotContext(
  client: DbClient,
  tenant: Tenant,
  service: ServiceForBooking,
  range: { from: Date; to: Date },
  options: { staffIds?: string[]; excludeBookingId?: string } = {},
): Promise<SlotContext> {
  const offeredBy = service.staff.map((s) => s.staffId)
  const staffIds = options.staffIds ? offeredBy.filter((id) => options.staffIds!.includes(id)) : offeredBy
  // Puffer können über Tagesgrenzen reichen -> Zeitraum großzügig erweitern.
  const from = new Date(range.from.getTime() - DAY)
  const to = new Date(range.to.getTime() + DAY)
  const notExcluded = options.excludeBookingId ? { NOT: { id: options.excludeBookingId } } : {}

  const [staff, tenantHours, ownHours, bookings, timeOff, sessions] = await Promise.all([
    client.staff.findMany({ where: { tenantId: tenant.id, id: { in: staffIds }, active: true }, orderBy: { sortOrder: 'asc' } }),
    loadTenantHours(client, tenant.id),
    client.workingHours.findMany({ where: { tenantId: tenant.id, staffId: { in: staffIds } } }),
    client.booking.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: [...ACTIVE_STATUSES] },
        groupSessionId: null,
        blockedFrom: { lt: to },
        blockedUntil: { gt: from },
        ...notExcluded,
      },
      select: { staffId: true, blockedFrom: true, blockedUntil: true, resources: { select: { resourceId: true } } },
    }),
    client.timeOff.findMany({ where: { tenantId: tenant.id, startsAt: { lt: to }, endsAt: { gt: from } } }),
    client.groupSession.findMany({
      where: { tenantId: tenant.id, cancelledAt: null, startsAt: { lt: to }, endsAt: { gt: from }, staffId: { not: null } },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
  ])

  const closures = timeOff.filter((t) => t.staffId === null).map((t) => ({ start: +t.startsAt, end: +t.endsAt }))

  const staffInputs = staff.map((s) => ({
    id: s.id,
    entity: s,
    hours: s.usesTenantHours ? tenantHours : toWeekly(ownHours.filter((h) => h.staffId === s.id)),
    blocked: bookings.filter((b) => b.staffId === s.id).map((b) => ({ start: +b.blockedFrom, end: +b.blockedUntil })),
    absent: [
      ...timeOff.filter((t) => t.staffId === s.id).map((t) => ({ start: +t.startsAt, end: +t.endsAt })),
      ...sessions.filter((g) => g.staffId === s.id).map((g) => ({ start: +g.startsAt, end: +g.endsAt })),
    ],
  }))

  const resources = service.resources
    .filter((r) => r.resource.active)
    .map((r) => ({
      id: r.resourceId,
      capacity: r.resource.capacity,
      blocked: bookings
        .filter((b) => b.resources.some((br) => br.resourceId === r.resourceId))
        .map((b) => ({ start: +b.blockedFrom, end: +b.blockedUntil })),
    }))

  return { staff: staffInputs, resources, closures }
}

export function slotsForDate(tenant: Tenant, service: Service, context: SlotContext, date: string, now = Date.now(), ignoreRules = false): Slot[] {
  return computeSlots({
    date,
    timeZone: tenant.timezone,
    now,
    slotIntervalMinutes: tenant.slotIntervalMinutes,
    minLeadMinutes: tenant.minLeadMinutes,
    maxAdvanceDays: tenant.maxAdvanceDays,
    durationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    closures: context.closures,
    staff: context.staff,
    resources: context.resources,
    ignoreRules,
  })
}

/** Freie Slots für einen Tag. */
export async function getSlots(tenant: Tenant, service: ServiceForBooking, date: string, staffIds?: string[]) {
  const context = await loadSlotContext(db, tenant, service, { from: startOfDay(date, tenant.timezone), to: endOfDay(date, tenant.timezone) }, { staffIds })
  return { slots: slotsForDate(tenant, service, context, date), staff: context.staff.map((s) => s.entity) }
}

/** Anzahl freier Slots je Tag für einen Datumsbereich (für die Tagesauswahl). */
export async function getDayAvailability(tenant: Tenant, service: ServiceForBooking, fromDate: string, days: number, staffIds?: string[]) {
  const toDate = addDays(fromDate, days)
  const context = await loadSlotContext(
    db,
    tenant,
    service,
    { from: startOfDay(fromDate, tenant.timezone), to: startOfDay(toDate, tenant.timezone) },
    { staffIds },
  )
  const result: { date: string; count: number; open: boolean; first?: number }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i)
    const slots = slotsForDate(tenant, service, context, date)
    const weekday = isoWeekday(date)
    const dayStart = +startOfDay(date, tenant.timezone)
    const dayEnd = +endOfDay(date, tenant.timezone)
    const closedAllDay = context.closures.some((c) => c.start <= dayStart && c.end >= dayEnd)
    const open = !closedAllDay && context.staff.some((s) => (s.hours[weekday] ?? []).length > 0)
    result.push({ date, count: slots.length, open, first: slots[0]?.start })
  }
  return result
}
