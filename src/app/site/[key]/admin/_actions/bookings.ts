'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { can, requireStaff, type StaffContext } from '@/lib/auth/guards'
import { BookingError, cancelBooking, createIndividualBooking, rescheduleBooking, setBookingDecision, setBookingOutcome, type CustomerInput } from '@/lib/booking/service'
import { isValidDateString, timeToMinutes, zonedInstant } from '@/lib/time'
import { normalizePhone } from '@/lib/phone'
import { audit } from '@/lib/audit'
import { checkbox, formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

/** Mitarbeiter:innen dürfen nur eigene Termine bearbeiten. */
async function loadBooking(ctx: StaffContext, bookingId: string) {
  const booking = await db.booking.findFirst({ where: { id: bookingId, tenantId: ctx.tenant.id } })
  if (!booking) throw new BookingError('NOT_FOUND', 'Termin nicht gefunden.')
  if (!can(ctx.role, 'bookings.all') && booking.staffId !== ctx.staff?.id) throw new BookingError('NOT_FOUND', 'Termin nicht gefunden.')
  return booking
}

async function run(bookingId: string, fn: (ctx: StaffContext) => Promise<unknown>, success: string): Promise<ActionState> {
  const ctx = await requireStaff()
  try {
    await loadBooking(ctx, bookingId)
    await fn(ctx)
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  refresh()
  return { ok: true, message: success }
}

export async function approveBookingAction(bookingId: string, _prev: ActionState): Promise<ActionState> {
  return run(bookingId, async (ctx) => {
    await setBookingDecision(ctx.tenant, bookingId, 'CONFIRMED')
    await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'booking.status', entityType: 'Booking', entityId: bookingId, detail: 'bestätigt' })
  }, 'Termin bestätigt. Die Kundin bzw. der Kunde wird benachrichtigt.')
}

export async function declineBookingAction(bookingId: string, _prev: ActionState): Promise<ActionState> {
  return run(bookingId, async (ctx) => {
    await setBookingDecision(ctx.tenant, bookingId, 'DECLINED')
    await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'booking.status', entityType: 'Booking', entityId: bookingId, detail: 'abgelehnt' })
  }, 'Anfrage abgelehnt. Die Kundin bzw. der Kunde wird benachrichtigt.')
}

export async function cancelBookingByBusinessAction(bookingId: string, _prev: ActionState): Promise<ActionState> {
  return run(bookingId, async (ctx) => {
    await cancelBooking(ctx.tenant, bookingId, 'BUSINESS')
    await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'booking.status', entityType: 'Booking', entityId: bookingId, detail: 'vom Betrieb abgesagt' })
  }, 'Termin abgesagt. Die Kundin bzw. der Kunde wird benachrichtigt.')
}

export async function setOutcomeAction(bookingId: string, outcome: 'COMPLETED' | 'NO_SHOW', _prev: ActionState): Promise<ActionState> {
  return run(bookingId, async (ctx) => {
    await setBookingOutcome(ctx.tenant, bookingId, outcome)
  }, outcome === 'COMPLETED' ? 'Als erledigt markiert.' : 'Als nicht erschienen markiert.')
}

const rescheduleSchema = z.object({
  datum: z.string().refine(isValidDateString, 'Bitte ein gültiges Datum wählen.'),
  zeit: z.string().regex(/^\d{1,2}:\d{2}$/, 'Bitte eine gültige Uhrzeit wählen.'),
  person: z.string().max(40).optional(),
})

export async function rescheduleBookingAction(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = rescheduleSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  return run(bookingId, async (ctx) => {
    const minute = timeToMinutes(parsed.data.zeit)
    if (minute === null) throw new BookingError('INVALID_STATE', 'Ungültige Uhrzeit.')
    const staffId = can(ctx.role, 'bookings.all') ? parsed.data.person : undefined
    await rescheduleBooking(ctx.tenant, bookingId, zonedInstant(parsed.data.datum, minute, ctx.tenant.timezone), staffId)
    await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'booking.rescheduled', entityType: 'Booking', entityId: bookingId })
  }, 'Termin verschoben. Die Kundin bzw. der Kunde wird benachrichtigt.')
}

const newBookingSchema = z.object({
  leistung: z.string().min(1, 'Bitte eine Leistung wählen.').max(40),
  person: z.string().min(1, 'Bitte eine Person wählen.').max(40),
  datum: z.string().refine(isValidDateString, 'Bitte ein gültiges Datum wählen.'),
  zeit: z.string().regex(/^\d{1,2}:\d{2}$/, 'Bitte eine gültige Uhrzeit wählen.'),
  kunde: z.string().max(40).optional(),
  name: z.string().max(100).optional(),
  email: z.email({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }).max(200).optional(),
  telefon: z.string().max(30).optional(),
  notiz: z.string().max(500).optional(),
})

export async function createAdminBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff()
  const parsed = newBookingSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const data = parsed.data
  if (!can(ctx.role, 'bookings.all') && data.person !== ctx.staff?.id) return { error: 'Du kannst nur Termine für dich selbst anlegen.' }

  const phone = normalizePhone(data.telefon)
  if (data.telefon && !phone) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { telefon: 'Ungültige Telefonnummer.' } }

  let customer: CustomerInput
  if (data.kunde) {
    customer = { kind: 'account', customerId: data.kunde, phone }
  } else {
    if (!data.name || data.name.length < 2) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { name: 'Bitte den Namen angeben.' } }
    if (!data.email && !phone) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { email: 'Bitte E-Mail-Adresse oder Telefonnummer angeben.' } }
    customer = { kind: 'guest', name: data.name, email: data.email ?? null, phone }
  }

  const minute = timeToMinutes(data.zeit)
  if (minute === null) return { error: 'Ungültige Uhrzeit.' }
  let bookingId: string
  try {
    const { booking } = await createIndividualBooking({
      tenant: ctx.tenant,
      serviceId: data.leistung,
      staffId: data.person,
      start: zonedInstant(data.datum, minute, ctx.tenant.timezone),
      customer,
      note: data.notiz,
      notifyWhatsapp: checkbox(formData, 'whatsapp'),
      consentSource: 'admin_verbal',
      source: 'ADMIN',
      notifyEmail: checkbox(formData, 'benachrichtigen'),
    })
    bookingId = booking.id
    await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'booking.created', entityType: 'Booking', entityId: booking.id })
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  redirect(`/admin/termine/${bookingId}?neu=1`)
}
