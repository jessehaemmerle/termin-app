import { db } from '../db'
import { can, type StaffContext } from '../auth/guards'
import type { Prisma } from '@/generated/prisma/client'

/** Sichtbarkeit von Terminen je Rolle (Mitarbeiter:innen: nur eigene). */
export function bookingScope(ctx: StaffContext): Prisma.BookingWhereInput {
  if (can(ctx.role, 'bookings.all')) return { tenantId: ctx.tenant.id }
  return { tenantId: ctx.tenant.id, staffId: ctx.staff?.id ?? '__keine_person__' }
}

export const agendaInclude = {
  service: { select: { name: true, kind: true } },
  staff: { select: { id: true, name: true, color: true } },
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.BookingInclude

export type AgendaBooking = Prisma.BookingGetPayload<{ include: typeof agendaInclude }>

export async function loadAgenda(ctx: StaffContext, from: Date, to: Date, extra: Prisma.BookingWhereInput = {}) {
  return db.booking.findMany({
    where: { ...bookingScope(ctx), startsAt: { gte: from, lt: to }, ...extra },
    include: agendaInclude,
    orderBy: [{ startsAt: 'asc' }],
  })
}
