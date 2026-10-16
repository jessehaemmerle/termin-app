import { db } from '../db'
import { encrypt, randomToken, sha256 } from '../crypto'
import { endOfDay, localDate, MINUTE, startOfDay, HOUR, addDays } from '../time'
import { WHATSAPP_CONSENT_VERSION } from '../legal/consent'
import { enqueueCustomerNotification, enqueueStaffNotifications } from '../notifications/enqueue'
import { isFree } from './availability'
import { ACTIVE_STATUSES, loadService, loadSlotContext, slotsForDate, type DbClient } from './data'
import type { Booking, BookingStatus, Customer, Prisma, Tenant } from '@/generated/prisma/client'

export type BookingErrorCode = 'SLOT_TAKEN' | 'NOT_FOUND' | 'FULL' | 'ALREADY_BOOKED' | 'DEADLINE_PASSED' | 'INVALID_STATE'

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export type CustomerInput =
  | { kind: 'account'; customerId: string; phone?: string | null }
  | { kind: 'guest'; name: string; email: string | null; phone?: string | null }

type CommonInput = {
  tenant: Tenant
  customer: CustomerInput
  note?: string | null
  notifyWhatsapp: boolean
  source: 'ONLINE' | 'ADMIN'
  /** Wer hat die WhatsApp-Einwilligung erfasst (Formular, Konto, mündlich beim Betrieb) */
  consentSource?: string
  /** E-Mails an die Kundin bzw. den Kunden senden (Standard: ja) */
  notifyEmail?: boolean
}

/** Serialisiert Buchungen je Betrieb, damit keine zwei Anfragen denselben Platz erhalten. */
async function lockTenant(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))::text AS locked`
}

function isOverlapViolation(error: unknown) {
  const text = String((error as { message?: string })?.message ?? error)
  return text.includes('Booking_staff_no_overlap') || text.includes('23P01')
}

async function resolveCustomer(tx: Prisma.TransactionClient, tenantId: string, input: CustomerInput): Promise<Customer> {
  if (input.kind === 'account') {
    const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId } })
    if (!customer) throw new BookingError('NOT_FOUND', 'Kundenkonto nicht gefunden.')
    return tx.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date(), ...(input.phone && !customer.phone ? { phone: input.phone } : {}) },
    })
  }
  if (!input.email) {
    // Telefonische Buchung ohne E-Mail: über die Telefonnummer zuordnen, sonst neu anlegen
    const byPhone = input.phone ? await tx.customer.findFirst({ where: { tenantId, phone: input.phone, email: null } }) : null
    if (byPhone) return tx.customer.update({ where: { id: byPhone.id }, data: { name: input.name, lastActivityAt: new Date() } })
    return tx.customer.create({ data: { tenantId, name: input.name, email: null, phone: input.phone ?? null } })
  }
  const email = input.email.toLowerCase()
  const existing = await tx.customer.findUnique({ where: { tenantId_email: { tenantId, email } } })
  if (existing) {
    // Daten eines Kundenkontos werden durch Gastbuchungen nicht überschrieben.
    const update = existing.passwordHash ? {} : { name: input.name, ...(input.phone ? { phone: input.phone } : {}) }
    return tx.customer.update({ where: { id: existing.id }, data: { ...update, lastActivityAt: new Date() } })
  }
  return tx.customer.create({ data: { tenantId, name: input.name, email, phone: input.phone ?? null } })
}

async function recordWhatsappConsent(tx: Prisma.TransactionClient, tenantId: string, customer: Customer, source: string) {
  await tx.consentRecord.create({
    data: { tenantId, customerId: customer.id, channel: 'WHATSAPP', granted: true, textVersion: WHATSAPP_CONSENT_VERSION, source },
  })
  if (!customer.whatsappOptIn) await tx.customer.update({ where: { id: customer.id }, data: { whatsappOptIn: true } })
}

function newManageToken() {
  const token = randomToken()
  return { token, hash: sha256(token), enc: encrypt(token) }
}

/** Bucht einen Einzeltermin. `staffId = 'any'` wählt die am wenigsten ausgelastete freie Person. */
export async function createIndividualBooking(
  input: CommonInput & { serviceId: string; staffId: string | 'any'; start: Date },
): Promise<{ booking: Booking; manageToken: string }> {
  const { tenant } = input
  const manage = newManageToken()

  try {
    const booking = await db.$transaction(
      async (tx) => {
        await lockTenant(tx, tenant.id)
        const service = await loadService(tx, tenant.id, input.serviceId)
        if (!service || service.kind !== 'INDIVIDUAL') throw new BookingError('NOT_FOUND', 'Diese Leistung ist nicht buchbar.')

        const date = localDate(input.start, tenant.timezone)
        const staffFilter = input.staffId === 'any' ? undefined : [input.staffId]
        const context = await loadSlotContext(
          tx,
          tenant,
          service,
          { from: startOfDay(date, tenant.timezone), to: endOfDay(date, tenant.timezone) },
          { staffIds: staffFilter },
        )

        const start = input.start.getTime()
        const end = start + service.durationMinutes * MINUTE
        const window = {
          start,
          end,
          blockedStart: start - service.bufferBeforeMinutes * MINUTE,
          blockedEnd: end + service.bufferAfterMinutes * MINUTE,
        }

        let candidates: string[]
        if (input.source === 'ONLINE') {
          const slot = slotsForDate(tenant, service, context, date).find((s) => s.start === start)
          candidates = slot?.staffIds ?? []
        } else {
          candidates = context.staff.filter((s) => isFree(s, context.resources, context.closures, window)).map((s) => s.id)
        }
        if (!candidates.length) throw new BookingError('SLOT_TAKEN', 'Dieser Zeitpunkt ist leider nicht mehr frei.')

        let staffId = candidates[0]
        if (candidates.length > 1) {
          const counts = await tx.booking.groupBy({
            by: ['staffId'],
            where: {
              tenantId: tenant.id,
              staffId: { in: candidates },
              status: { in: [...ACTIVE_STATUSES] },
              startsAt: { gte: startOfDay(date, tenant.timezone), lt: endOfDay(date, tenant.timezone) },
            },
            _count: true,
          })
          const load = new Map(counts.map((c) => [c.staffId, c._count]))
          staffId = [...candidates].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0]
        }

        const customer = await resolveCustomer(tx, tenant.id, input.customer)
        const phone = (input.customer.kind === 'guest' ? input.customer.phone : input.customer.phone) ?? customer.phone
        const notifyWhatsapp = input.notifyWhatsapp && !!phone && tenant.whatsappEnabled
        if (notifyWhatsapp) await recordWhatsappConsent(tx, tenant.id, customer, input.consentSource ?? 'booking_form')

        const status: BookingStatus = input.source === 'ONLINE' && tenant.requireApproval ? 'PENDING' : 'CONFIRMED'
        const created = await tx.booking.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            serviceId: service.id,
            staffId,
            startsAt: new Date(start),
            endsAt: new Date(end),
            blockedFrom: new Date(window.blockedStart),
            blockedUntil: new Date(window.blockedEnd),
            status,
            source: input.source,
            customerNote: input.note || null,
            phone: phone ?? null,
            notifyEmail: input.notifyEmail ?? true,
            notifyWhatsapp,
            manageTokenHash: manage.hash,
            manageTokenEnc: manage.enc,
            resources: { create: context.resources.map((r) => ({ resourceId: r.id })) },
          },
          include: { customer: true },
        })

        await enqueueCustomerNotification(tx, tenant, created, status === 'PENDING' ? 'BOOKING_RECEIVED' : 'BOOKING_CONFIRMED')
        if (input.source === 'ONLINE') await enqueueStaffNotifications(tx, tenant, created, 'STAFF_NEW_BOOKING')
        return created
      },
      { timeout: 15_000 },
    )
    return { booking, manageToken: manage.token }
  } catch (error) {
    if (isOverlapViolation(error)) throw new BookingError('SLOT_TAKEN', 'Dieser Zeitpunkt ist leider nicht mehr frei.')
    throw error
  }
}

/** Bucht einen Platz in einem Gruppentermin (Kurs). */
export async function createGroupBooking(input: CommonInput & { sessionId: string }) {
  const { tenant } = input
  const manage = newManageToken()
  const booking = await db.$transaction(
    async (tx) => {
      await lockTenant(tx, tenant.id)
      const session = await tx.groupSession.findFirst({
        where: { id: input.sessionId, tenantId: tenant.id, cancelledAt: null },
        include: { service: true },
      })
      if (!session || !session.service.active) throw new BookingError('NOT_FOUND', 'Dieser Kurstermin ist nicht buchbar.')
      if (input.source === 'ONLINE' && session.startsAt.getTime() < Date.now() + tenant.minLeadMinutes * MINUTE) {
        throw new BookingError('NOT_FOUND', 'Für diesen Kurstermin ist keine Online-Buchung mehr möglich.')
      }
      const taken = await tx.booking.count({ where: { groupSessionId: session.id, status: { in: [...ACTIVE_STATUSES] } } })
      if (taken >= session.capacity) throw new BookingError('FULL', 'Dieser Kurstermin ist leider ausgebucht.')

      const customer = await resolveCustomer(tx, tenant.id, input.customer)
      const already = await tx.booking.count({
        where: { groupSessionId: session.id, customerId: customer.id, status: { in: [...ACTIVE_STATUSES] } },
      })
      if (already) throw new BookingError('ALREADY_BOOKED', 'Sie haben für diesen Kurstermin bereits einen Platz.')

      const phone = (input.customer.kind === 'guest' ? input.customer.phone : input.customer.phone) ?? customer.phone
      const notifyWhatsapp = input.notifyWhatsapp && !!phone && tenant.whatsappEnabled
      if (notifyWhatsapp) await recordWhatsappConsent(tx, tenant.id, customer, input.consentSource ?? 'booking_form')

      const status: BookingStatus = input.source === 'ONLINE' && tenant.requireApproval ? 'PENDING' : 'CONFIRMED'
      const created = await tx.booking.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          serviceId: session.serviceId,
          staffId: session.staffId,
          groupSessionId: session.id,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          blockedFrom: session.startsAt,
          blockedUntil: session.endsAt,
          status,
          source: input.source,
          customerNote: input.note || null,
          phone: phone ?? null,
          notifyEmail: input.notifyEmail ?? true,
          notifyWhatsapp,
          manageTokenHash: manage.hash,
          manageTokenEnc: manage.enc,
        },
        include: { customer: true },
      })
      await enqueueCustomerNotification(tx, tenant, created, status === 'PENDING' ? 'BOOKING_RECEIVED' : 'BOOKING_CONFIRMED')
      if (input.source === 'ONLINE') await enqueueStaffNotifications(tx, tenant, created, 'STAFF_NEW_BOOKING')
      return created
    },
    { timeout: 15_000 },
  )
  return { booking, manageToken: manage.token }
}

/** Kulanzfrist: Kurz nach der Buchung ist eine Absage immer möglich (Tippfehler, Fehlbuchung). */
export const CANCEL_GRACE_MINUTES = 30

export function canCustomerCancel(tenant: Tenant, booking: Pick<Booking, 'status' | 'startsAt' | 'createdAt'>, now = Date.now()) {
  if (!(ACTIVE_STATUSES as readonly string[]).includes(booking.status)) return false
  if (booking.startsAt.getTime() <= now) return false
  if (now - booking.createdAt.getTime() <= CANCEL_GRACE_MINUTES * MINUTE) return true
  return booking.startsAt.getTime() - tenant.cancellationDeadlineHours * HOUR > now
}

/** Benachrichtigt Wartelisten-Einträge, wenn durch eine Absage etwas frei wird. */
async function notifyWaitlist(client: DbClient, tenant: Tenant, booking: Booking) {
  if (!tenant.waitlistEnabled || booking.startsAt.getTime() < Date.now()) return
  const where: Prisma.WaitlistEntryWhereInput = booking.groupSessionId
    ? { groupSessionId: booking.groupSessionId }
    : {
        serviceId: booking.serviceId,
        groupSessionId: null,
        date: localDate(booking.startsAt, tenant.timezone),
        OR: [{ staffId: null }, { staffId: booking.staffId }],
      }
  const entries = await client.waitlistEntry.findMany({
    where: { tenantId: tenant.id, notifiedAt: null, expiresAt: { gt: new Date() }, ...where },
  })
  for (const entry of entries) {
    const channels: ('EMAIL' | 'WHATSAPP')[] = ['EMAIL']
    if (entry.notifyWhatsapp && tenant.whatsappEnabled) channels.push('WHATSAPP')
    await client.notification.createMany({
      data: channels.map((channel) => ({ tenantId: tenant.id, waitlistEntryId: entry.id, channel, type: 'WAITLIST_AVAILABLE' as const })),
    })
    await client.waitlistEntry.update({ where: { id: entry.id }, data: { notifiedAt: new Date() } })
  }
}

export async function cancelBooking(tenant: Tenant, bookingId: string, by: 'CUSTOMER' | 'BUSINESS') {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, tenantId: tenant.id }, include: { customer: true } })
    if (!booking) throw new BookingError('NOT_FOUND', 'Termin nicht gefunden.')
    if (!(ACTIVE_STATUSES as readonly string[]).includes(booking.status)) {
      throw new BookingError('INVALID_STATE', 'Dieser Termin ist nicht mehr aktiv.')
    }
    if (by === 'CUSTOMER' && !canCustomerCancel(tenant, booking)) {
      throw new BookingError('DEADLINE_PASSED', 'Die Frist für eine Online-Absage ist abgelaufen. Bitte kontaktieren Sie uns direkt.')
    }
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: by === 'CUSTOMER' ? 'CANCELLED_BY_CUSTOMER' : 'CANCELLED_BY_BUSINESS', cancelledAt: new Date() },
      include: { customer: true },
    })
    await tx.notification.updateMany({
      where: { bookingId: booking.id, status: 'PENDING', type: 'BOOKING_REMINDER' },
      data: { status: 'SKIPPED' },
    })
    await enqueueCustomerNotification(tx, tenant, updated, 'BOOKING_CANCELLED')
    if (by === 'CUSTOMER') await enqueueStaffNotifications(tx, tenant, updated, 'STAFF_BOOKING_CANCELLED')
    await notifyWaitlist(tx, tenant, updated)
    return updated
  })
}

export async function setBookingDecision(tenant: Tenant, bookingId: string, decision: 'CONFIRMED' | 'DECLINED') {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, tenantId: tenant.id, status: 'PENDING' } })
    if (!booking) throw new BookingError('INVALID_STATE', 'Diese Anfrage wurde bereits bearbeitet.')
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: decision, ...(decision === 'DECLINED' ? { cancelledAt: new Date() } : {}) },
      include: { customer: true },
    })
    await enqueueCustomerNotification(tx, tenant, updated, decision === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : 'BOOKING_DECLINED')
    if (decision === 'DECLINED') await notifyWaitlist(tx, tenant, updated)
    return updated
  })
}

export async function setBookingOutcome(tenant: Tenant, bookingId: string, status: 'COMPLETED' | 'NO_SHOW') {
  const booking = await db.booking.findFirst({ where: { id: bookingId, tenantId: tenant.id, status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } } })
  if (!booking) throw new BookingError('INVALID_STATE', 'Status kann nicht geändert werden.')
  if (booking.startsAt.getTime() > Date.now()) throw new BookingError('INVALID_STATE', 'Der Termin liegt in der Zukunft.')
  return db.booking.update({ where: { id: booking.id }, data: { status } })
}

/** Verschiebt einen Einzeltermin (durch den Betrieb). Arbeitszeiten werden nicht erzwungen, Kollisionen schon. */
export async function rescheduleBooking(tenant: Tenant, bookingId: string, newStart: Date, staffId?: string) {
  try {
    return await db.$transaction(
      async (tx) => {
        await lockTenant(tx, tenant.id)
        const booking = await tx.booking.findFirst({
          where: { id: bookingId, tenantId: tenant.id, groupSessionId: null, status: { in: [...ACTIVE_STATUSES] } },
        })
        if (!booking) throw new BookingError('NOT_FOUND', 'Termin nicht gefunden oder nicht verschiebbar.')
        const service = await tx.service.findFirst({
          where: { id: booking.serviceId, tenantId: tenant.id },
          include: { staff: true, resources: { include: { resource: true } } },
        })
        if (!service) throw new BookingError('NOT_FOUND', 'Leistung nicht gefunden.')
        const targetStaff = staffId ?? booking.staffId
        if (!targetStaff || !service.staff.some((s) => s.staffId === targetStaff)) {
          throw new BookingError('INVALID_STATE', 'Diese Person bietet die Leistung nicht an.')
        }
        const date = localDate(newStart, tenant.timezone)
        const context = await loadSlotContext(
          tx,
          tenant,
          service,
          { from: startOfDay(date, tenant.timezone), to: startOfDay(addDays(date, 1), tenant.timezone) },
          { staffIds: [targetStaff], excludeBookingId: booking.id },
        )
        const staff = context.staff[0]
        const start = newStart.getTime()
        const end = start + service.durationMinutes * MINUTE
        const window = {
          start,
          end,
          blockedStart: start - service.bufferBeforeMinutes * MINUTE,
          blockedEnd: end + service.bufferAfterMinutes * MINUTE,
        }
        if (!staff || !isFree(staff, context.resources, context.closures, window)) {
          throw new BookingError('SLOT_TAKEN', 'Zu diesem Zeitpunkt gibt es eine Überschneidung.')
        }
        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            staffId: targetStaff,
            startsAt: new Date(start),
            endsAt: new Date(end),
            blockedFrom: new Date(window.blockedStart),
            blockedUntil: new Date(window.blockedEnd),
            reminderQueuedAt: null,
            resources: { deleteMany: {}, create: context.resources.map((r) => ({ resourceId: r.id })) },
          },
          include: { customer: true },
        })
        await tx.notification.updateMany({
          where: { bookingId: booking.id, status: 'PENDING', type: 'BOOKING_REMINDER' },
          data: { status: 'SKIPPED' },
        })
        if (updated.status === 'CONFIRMED') await enqueueCustomerNotification(tx, tenant, updated, 'BOOKING_RESCHEDULED')
        return updated
      },
      { timeout: 15_000 },
    )
  } catch (error) {
    if (isOverlapViolation(error)) throw new BookingError('SLOT_TAKEN', 'Zu diesem Zeitpunkt gibt es eine Überschneidung.')
    throw error
  }
}

/** Trägt eine Person auf die Warteliste ein und liefert das Austragungs-Token. */
export async function joinWaitlist(input: {
  tenant: Tenant
  serviceId: string
  date?: string
  staffId?: string | null
  groupSessionId?: string
  customer: CustomerInput
  notifyWhatsapp: boolean
}) {
  const { tenant } = input
  const token = randomToken()
  await db.$transaction(async (tx) => {
    const service = await tx.service.findFirst({ where: { id: input.serviceId, tenantId: tenant.id, active: true } })
    if (!service) throw new BookingError('NOT_FOUND', 'Leistung nicht gefunden.')
    let expiresAt: Date
    if (input.groupSessionId) {
      const session = await tx.groupSession.findFirst({ where: { id: input.groupSessionId, tenantId: tenant.id, serviceId: service.id, cancelledAt: null } })
      if (!session) throw new BookingError('NOT_FOUND', 'Kurstermin nicht gefunden.')
      expiresAt = session.startsAt
    } else if (input.date) {
      expiresAt = endOfDay(input.date, tenant.timezone)
    } else {
      throw new BookingError('NOT_FOUND', 'Bitte einen Tag wählen.')
    }
    if (expiresAt.getTime() < Date.now()) throw new BookingError('INVALID_STATE', 'Dieser Tag liegt in der Vergangenheit.')
    const customer = await resolveCustomer(tx, tenant.id, input.customer)
    const phone = (input.customer.kind === 'guest' ? input.customer.phone : input.customer.phone) ?? customer.phone
    const notifyWhatsapp = input.notifyWhatsapp && !!phone && tenant.whatsappEnabled
    if (notifyWhatsapp) await recordWhatsappConsent(tx, tenant.id, customer, 'waitlist_form')
    await tx.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        serviceId: service.id,
        staffId: input.staffId ?? null,
        date: input.groupSessionId ? null : input.date,
        groupSessionId: input.groupSessionId ?? null,
        notifyWhatsapp,
        tokenHash: sha256(token),
        tokenEnc: encrypt(token),
        expiresAt,
      },
    })
  })
  return token
}
