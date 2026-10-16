import { db } from '../db'
import { HOUR } from '../time'
import { enqueueCustomerNotification } from '../notifications/enqueue'
import { anonymizeBookings } from '../privacy/erase'
import { audit } from '../audit'

/** Legt Erinnerungen an – nur für Termine, die vor Beginn des Erinnerungsfensters gebucht wurden. */
export async function queueReminders(now = new Date()) {
  const tenants = await db.tenant.findMany({ where: { status: 'ACTIVE', reminderHoursBefore: { gt: 0 } } })
  let queued = 0
  for (const tenant of tenants) {
    const windowEnd = new Date(now.getTime() + tenant.reminderHoursBefore * HOUR)
    const bookings = await db.booking.findMany({
      where: { tenantId: tenant.id, status: 'CONFIRMED', reminderQueuedAt: null, anonymizedAt: null, startsAt: { gt: now, lte: windowEnd } },
      include: { customer: true },
    })
    for (const booking of bookings) {
      const bookedEarlyEnough = booking.createdAt.getTime() <= booking.startsAt.getTime() - tenant.reminderHoursBefore * HOUR
      await db.$transaction(async (tx) => {
        const updated = await tx.booking.updateMany({ where: { id: booking.id, reminderQueuedAt: null }, data: { reminderQueuedAt: now } })
        if (updated.count && bookedEarlyEnough) {
          await enqueueCustomerNotification(tx, tenant, booking, 'BOOKING_REMINDER')
          queued++
        }
      })
    }
  }
  return queued
}

/** Status-Pflege: unbestätigte Anfragen verfallen, vergangene Termine gelten als erledigt. */
export async function housekeeping(now = new Date()) {
  const expired = await db.booking.findMany({ where: { status: 'PENDING', startsAt: { lt: now } }, include: { customer: true, tenant: true } })
  for (const booking of expired) {
    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } })
      await enqueueCustomerNotification(tx, booking.tenant, booking, 'BOOKING_DECLINED')
    })
  }
  const completed = await db.booking.updateMany({ where: { status: 'CONFIRMED', endsAt: { lt: new Date(now.getTime() - 24 * HOUR) } }, data: { status: 'COMPLETED' } })
  return { expired: expired.length, completed: completed.count }
}

function monthsAgo(now: Date, months: number) {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return d
}

/**
 * Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO):
 * - Termine älter als die Frist des Betriebs werden anonymisiert,
 * - Gastkund:innen ohne Termine werden nach 30 Tagen gelöscht,
 * - Kundenkonten ohne Termine und ohne Aktivität innerhalb der Frist werden gelöscht,
 * - abgelaufene Wartelisten, Sitzungen, Tokens, Versand- und Aktivitätsprotokolle werden entfernt.
 */
export async function runRetention(now = new Date()) {
  const summary = { bookings: 0, customers: 0 }
  const tenants = await db.tenant.findMany({ select: { id: true, retentionMonths: true } })
  for (const tenant of tenants) {
    const cutoff = monthsAgo(now, tenant.retentionMonths)
    const anonymized = await db.$transaction((tx) => anonymizeBookings(tx, { tenantId: tenant.id, endsAt: { lt: cutoff } }))
    const guests = await db.customer.deleteMany({
      where: { tenantId: tenant.id, passwordHash: null, bookings: { none: {} }, waitlistEntries: { none: {} }, lastActivityAt: { lt: new Date(now.getTime() - 30 * 24 * HOUR) } },
    })
    const accounts = await db.customer.deleteMany({
      where: { tenantId: tenant.id, passwordHash: { not: null }, bookings: { none: {} }, waitlistEntries: { none: {} }, lastActivityAt: { lt: cutoff } },
    })
    const removed = guests.count + accounts.count
    summary.bookings += anonymized
    summary.customers += removed
    if (anonymized || removed) {
      await audit({ tenantId: tenant.id, actorType: 'SYSTEM', action: 'retention.run', detail: `${anonymized} Termine anonymisiert, ${removed} Kundendatensätze gelöscht` })
    }
  }
  await db.waitlistEntry.deleteMany({ where: { expiresAt: { lt: now } } })
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } })
  await db.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 24 * HOUR) } }, { usedAt: { lt: new Date(now.getTime() - 24 * HOUR) } }] } })
  await db.notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * 24 * HOUR) }, status: { in: ['SENT', 'SKIPPED', 'FAILED'] } } })
  await db.auditLog.deleteMany({ where: { createdAt: { lt: monthsAgo(now, 12) } } })
  await db.pushSubscription.deleteMany({ where: { user: { active: false } } })
  return summary
}
