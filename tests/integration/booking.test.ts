import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { BookingError, cancelBooking, createGroupBooking, createIndividualBooking, joinWaitlist } from '@/lib/booking/service'
import { getSlots, loadService } from '@/lib/booking/data'
import { runRetention } from '@/lib/jobs/maintenance'
import { eraseCustomer } from '@/lib/privacy/erase'
import { exportCustomerData } from '@/lib/privacy/export'
import { addDays, today, zonedInstant } from '@/lib/time'
import type { Tenant } from '@/generated/prisma/client'

const TZ = 'Europe/Vienna'
let tenant: Tenant
let serviceId: string
let staffId: string
let liftId: string

async function setup() {
  await db.tenant.deleteMany({ where: { slug: { startsWith: 'it-' } } })
  tenant = await db.tenant.create({
    data: { slug: `it-${randomBytes(3).toString('hex')}`, name: 'Testbetrieb', domainVerificationToken: 'x', minLeadMinutes: 0, dpaAcceptedAt: new Date(), dpaVersion: 'avv-2026-10-v1', waitlistEnabled: true },
  })
  // jeden Tag 08–18 Uhr geöffnet
  await db.workingHours.createMany({ data: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ tenantId: tenant.id, weekday, startMinute: 480, endMinute: 1080 })) })
  const staff = await db.staff.create({ data: { tenantId: tenant.id, name: 'Anna' } })
  staffId = staff.id
  const lift = await db.resource.create({ data: { tenantId: tenant.id, name: 'Platz', capacity: 1 } })
  liftId = lift.id
  const service = await db.service.create({
    data: { tenantId: tenant.id, name: 'Haarschnitt', durationMinutes: 60, bufferAfterMinutes: 15, staff: { create: [{ staffId }] } },
  })
  serviceId = service.id
}

const tomorrow = () => addDays(today(TZ), 1)
const guest = (n: number) => ({ kind: 'guest' as const, name: `Gast ${n}`, email: `gast${n}@example.com`, phone: null })

beforeEach(setup)
afterAll(async () => {
  await db.tenant.deleteMany({ where: { slug: { startsWith: 'it-' } } })
  await db.$disconnect()
})

describe('Buchung', () => {
  it('vergibt einen Slot bei gleichzeitigen Anfragen genau einmal', async () => {
    const start = zonedInstant(tomorrow(), 10 * 60, TZ)
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        createIndividualBooking({ tenant, serviceId, staffId: 'any', start, customer: guest(i), notifyWhatsapp: false, source: 'ONLINE' }),
      ),
    )
    const ok = attempts.filter((a) => a.status === 'fulfilled')
    const failed = attempts.filter((a) => a.status === 'rejected') as PromiseRejectedResult[]
    expect(ok).toHaveLength(1)
    expect(failed.every((f) => f.reason instanceof BookingError && f.reason.code === 'SLOT_TAKEN')).toBe(true)
    expect(await db.booking.count({ where: { tenantId: tenant.id } })).toBe(1)
  })

  it('blockiert den Puffer nach einem Termin und gibt den Slot nach Absage wieder frei', async () => {
    const start = zonedInstant(tomorrow(), 10 * 60, TZ)
    const { booking } = await createIndividualBooking({ tenant, serviceId, staffId, start, customer: guest(1), notifyWhatsapp: false, source: 'ONLINE' })
    const service = (await loadService(db, tenant.id, serviceId))!
    let times = (await getSlots(tenant, service, tomorrow())).slots.map((s) => s.start)
    expect(times).not.toContain(zonedInstant(tomorrow(), 11 * 60, TZ).getTime()) // 11:00 liegt im 15-Min-Puffer
    expect(times).toContain(zonedInstant(tomorrow(), 11 * 60 + 15, TZ).getTime())
    await cancelBooking(tenant, booking.id, 'CUSTOMER')
    times = (await getSlots(tenant, service, tomorrow())).slots.map((s) => s.start)
    expect(times).toContain(start.getTime())
  })

  it('verhindert Doppelbuchungen auch auf Datenbankebene (Exclusion-Constraint)', async () => {
    const start = zonedInstant(tomorrow(), 9 * 60, TZ)
    await createIndividualBooking({ tenant, serviceId, staffId, start, customer: guest(1), notifyWhatsapp: false, source: 'ONLINE' })
    const customer = await db.customer.create({ data: { tenantId: tenant.id, name: 'Direkt' } })
    await expect(
      db.booking.create({
        data: { tenantId: tenant.id, customerId: customer.id, serviceId, staffId, startsAt: start, endsAt: new Date(+start + 3_600_000), blockedFrom: start, blockedUntil: new Date(+start + 3_600_000), status: 'CONFIRMED' },
      }),
    ).rejects.toThrow()
  })

  it('beachtet die Kapazität einer Ressource über mehrere Personen hinweg', async () => {
    const ben = await db.staff.create({ data: { tenantId: tenant.id, name: 'Ben' } })
    await db.staffService.create({ data: { staffId: ben.id, serviceId } })
    await db.serviceResource.create({ data: { serviceId, resourceId: liftId } })
    const start = zonedInstant(tomorrow(), 14 * 60, TZ)
    await createIndividualBooking({ tenant, serviceId, staffId: 'any', start, customer: guest(1), notifyWhatsapp: false, source: 'ONLINE' })
    await expect(
      createIndividualBooking({ tenant, serviceId, staffId: 'any', start, customer: guest(2), notifyWhatsapp: false, source: 'ONLINE' }),
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN' })
  })

  it('legt Benachrichtigungen in der Outbox ab, WhatsApp nur mit Einwilligung', async () => {
    await db.tenant.update({ where: { id: tenant.id }, data: { whatsappEnabled: true } })
    tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
    const start = zonedInstant(tomorrow(), 12 * 60, TZ)
    const { booking } = await createIndividualBooking({
      tenant,
      serviceId,
      staffId,
      start,
      customer: { kind: 'guest', name: 'Maria', email: 'maria@example.com', phone: '+436641234567' },
      notifyWhatsapp: true,
      source: 'ONLINE',
    })
    const channels = (await db.notification.findMany({ where: { bookingId: booking.id, userId: null } })).map((n) => n.channel).sort()
    expect(channels).toEqual(['EMAIL', 'WHATSAPP'])
    const consent = await db.consentRecord.findFirst({ where: { customerId: booking.customerId! } })
    expect(consent).toMatchObject({ granted: true, channel: 'WHATSAPP' })
  })

  it('lässt Gastbuchungen mit fremder E-Mail-Adresse den bestehenden Datensatz weder ändern noch auslesen', async () => {
    await db.tenant.update({ where: { id: tenant.id }, data: { whatsappEnabled: true } })
    tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
    const victim = await db.customer.create({
      data: { tenantId: tenant.id, name: 'Vera Echt', email: 'vera@example.com', phone: '+436641111111', passwordHash: 'x' },
    })
    const { booking } = await createIndividualBooking({
      tenant,
      serviceId,
      staffId,
      start: zonedInstant(tomorrow(), 14 * 60, TZ),
      customer: { kind: 'guest', name: 'Angreifer', email: 'VERA@example.com', phone: '+436649999999' },
      notifyWhatsapp: true,
      source: 'ONLINE',
    })
    const after = await db.customer.findUniqueOrThrow({ where: { id: victim.id } })
    expect(after).toMatchObject({ name: 'Vera Echt', phone: '+436641111111', whatsappOptIn: false })
    expect(await db.consentRecord.count({ where: { customerId: victim.id } })).toBe(0)
    expect(booking).toMatchObject({ customerId: victim.id, phone: '+436649999999', notifyWhatsapp: false })

    // ohne eigene Nummer wird die gespeicherte nicht übernommen
    const second = await createIndividualBooking({
      tenant,
      serviceId,
      staffId,
      start: zonedInstant(tomorrow(), 16 * 60, TZ),
      customer: { kind: 'guest', name: 'Angreifer', email: 'vera@example.com', phone: null },
      notifyWhatsapp: false,
      source: 'ONLINE',
    })
    expect(second.booking.phone).toBeNull()
  })

  it('verhindert Überbuchung von Kursen und benachrichtigt die Warteliste bei Absage', async () => {
    const course = await db.service.create({ data: { tenantId: tenant.id, name: 'Kurs', kind: 'GROUP', durationMinutes: 60, groupCapacity: 1 } })
    const startsAt = zonedInstant(addDays(today(TZ), 3), 18 * 60, TZ)
    const session = await db.groupSession.create({ data: { tenantId: tenant.id, serviceId: course.id, startsAt, endsAt: new Date(+startsAt + 3_600_000), capacity: 1 } })
    const { booking } = await createGroupBooking({ tenant, sessionId: session.id, customer: guest(1), notifyWhatsapp: false, source: 'ONLINE' })
    await expect(createGroupBooking({ tenant, sessionId: session.id, customer: guest(2), notifyWhatsapp: false, source: 'ONLINE' })).rejects.toMatchObject({ code: 'FULL' })
    await joinWaitlist({ tenant, serviceId: course.id, groupSessionId: session.id, customer: guest(2), notifyWhatsapp: false })
    await cancelBooking(tenant, booking.id, 'CUSTOMER')
    const notified = await db.notification.count({ where: { tenantId: tenant.id, type: 'WAITLIST_AVAILABLE' } })
    expect(notified).toBe(1)
  })
})

describe('Datenschutz', () => {
  it('anonymisiert alte Termine und löscht Kund:innen ohne Termine nach der Frist', async () => {
    const customer = await db.customer.create({ data: { tenantId: tenant.id, name: 'Alt', email: 'alt@example.com', lastActivityAt: new Date('2024-01-01') } })
    const old = new Date('2024-01-10T09:00:00Z')
    await db.booking.create({
      data: { tenantId: tenant.id, customerId: customer.id, serviceId, staffId, startsAt: old, endsAt: new Date(+old + 3_600_000), blockedFrom: old, blockedUntil: new Date(+old + 3_600_000), status: 'COMPLETED', customerNote: 'Notiz', phone: '+436641234567', manageTokenHash: randomBytes(8).toString('hex') },
    })
    await runRetention(new Date())
    const booking = await db.booking.findFirstOrThrow({ where: { tenantId: tenant.id } })
    expect(booking).toMatchObject({ customerId: null, customerNote: null, phone: null, manageTokenHash: null })
    expect(booking.anonymizedAt).not.toBeNull()
    expect(await db.customer.count({ where: { id: customer.id } })).toBe(0)
  })

  it('exportiert alle Daten einer Person und löscht sie auf Antrag vollständig', async () => {
    const start = zonedInstant(tomorrow(), 15 * 60, TZ)
    const { booking } = await createIndividualBooking({ tenant, serviceId, staffId, start, customer: guest(7), notifyWhatsapp: false, source: 'ONLINE', note: 'Bitte kurz' })
    const data = await exportCustomerData(tenant, booking.customerId!)
    expect(data?.stammdaten.email).toBe('gast7@example.com')
    expect(data?.termine[0].nachricht).toBe('Bitte kurz')
    expect(JSON.stringify(data)).not.toContain('passwordHash')
    await eraseCustomer(tenant.id, booking.customerId!)
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } })
    expect(after.status).toBe('CANCELLED_BY_BUSINESS')
    expect(after.customerId).toBeNull()
    expect(after.customerNote).toBeNull()
    expect(await db.customer.count({ where: { tenantId: tenant.id } })).toBe(0)
  })
})
