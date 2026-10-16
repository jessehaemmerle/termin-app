import { db } from '../db'
import { sendMail } from '../notifications/mailer'
import { sendWhatsappTemplate, WhatsappError } from '../notifications/whatsapp'
import { sendPushToUser } from '../notifications/push'
import { customerWhatsapp, renderCustomerEmail, renderStaffEmail, renderWaitlistEmail, staffPush, waitlistWhatsapp } from '../notifications/render'
import type { Notification } from '@/generated/prisma/client'

// Verarbeitet die Outbox. Mehrere Worker sind möglich (FOR UPDATE SKIP LOCKED).

const MAX_ATTEMPTS = 5
const BACKOFF_MINUTES = [1, 5, 15, 60, 180]

class Skip extends Error {}

async function claim(limit: number): Promise<string[]> {
  // Hängengebliebene Einträge (Worker-Absturz) wieder freigeben
  await db.notification.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: 'PENDING' },
  })
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Notification" SET "status" = 'PROCESSING', "lockedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "Notification"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= now()
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`
  return rows.map((r) => r.id)
}

async function deliver(n: Notification): Promise<string | undefined> {
  const tenant = await db.tenant.findUnique({ where: { id: n.tenantId } })
  if (!tenant || tenant.status !== 'ACTIVE') throw new Skip('Betrieb inaktiv')

  if (n.waitlistEntryId) {
    const entry = await db.waitlistEntry.findUnique({ where: { id: n.waitlistEntryId }, include: { customer: true, service: true, groupSession: true } })
    if (!entry || entry.expiresAt < new Date()) throw new Skip('Wartelisten-Eintrag nicht mehr gültig')
    if (n.channel === 'EMAIL') {
      if (!entry.customer.email) throw new Skip('keine E-Mail-Adresse')
      const mail = renderWaitlistEmail(tenant, entry)
      return sendMail({ to: entry.customer.email, ...mail }, tenant)
    }
    if (n.channel === 'WHATSAPP') {
      if (!entry.notifyWhatsapp || !entry.customer.whatsappOptIn || !entry.customer.phone) throw new Skip('keine WhatsApp-Einwilligung')
      const { kind, params } = waitlistWhatsapp(tenant, entry)
      return sendWhatsappTemplate(tenant, entry.customer.phone, kind, params)
    }
    throw new Skip('Kanal nicht unterstützt')
  }

  const booking = n.bookingId
    ? await db.booking.findUnique({ where: { id: n.bookingId }, include: { service: true, staff: true, customer: true } })
    : null
  if (!booking || booking.anonymizedAt) throw new Skip('Termin nicht mehr vorhanden')

  // Nachrichten an das Team
  if (n.userId) {
    const user = await db.user.findFirst({ where: { id: n.userId, tenantId: tenant.id, active: true } })
    if (!user) throw new Skip('Teamzugang inaktiv')
    if (n.channel === 'EMAIL') {
      const mail = renderStaffEmail(n.type, tenant, booking)
      return sendMail({ to: user.email, ...mail }, tenant)
    }
    if (n.channel === 'PUSH') {
      const result = await sendPushToUser(user.id, staffPush(n.type, tenant, booking))
      if (result.skipped || result.sent === 0) throw new Skip('kein Push-Abo')
      return `push:${result.sent}`
    }
    throw new Skip('Kanal nicht unterstützt')
  }

  // Erinnerungen nur für weiterhin bestätigte, zukünftige Termine
  if (n.type === 'BOOKING_REMINDER' && (booking.status !== 'CONFIRMED' || booking.startsAt < new Date())) throw new Skip('Termin nicht mehr aktiv')

  if (n.channel === 'EMAIL') {
    if (!booking.notifyEmail || !booking.customer?.email) throw new Skip('keine E-Mail-Benachrichtigung')
    const mail = renderCustomerEmail(n.type, tenant, booking)
    if (!mail) throw new Skip('kein Inhalt')
    return sendMail({ to: booking.customer.email, ...mail }, tenant)
  }
  if (n.channel === 'WHATSAPP') {
    if (!tenant.whatsappEnabled || !booking.notifyWhatsapp || !booking.phone || !booking.customer?.whatsappOptIn) throw new Skip('keine WhatsApp-Einwilligung')
    const message = customerWhatsapp(n.type, tenant, booking)
    if (!message) throw new Skip('kein Inhalt')
    return sendWhatsappTemplate(tenant, booking.phone, message.kind, message.params)
  }
  throw new Skip('Kanal nicht unterstützt')
}

export async function processNotifications(limit = 20) {
  const ids = await claim(limit)
  const result = { sent: 0, skipped: 0, failed: 0, retried: 0 }
  for (const id of ids) {
    const n = await db.notification.findUnique({ where: { id } })
    if (!n) continue
    try {
      const ref = await deliver(n)
      await db.notification.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), providerRef: ref?.slice(0, 200), lockedAt: null, lastError: null } })
      result.sent++
    } catch (error) {
      if (error instanceof Skip) {
        await db.notification.update({ where: { id }, data: { status: 'SKIPPED', lockedAt: null, lastError: error.message } })
        result.skipped++
        continue
      }
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300)
      const permanent = error instanceof WhatsappError && error.permanent
      if (permanent || n.attempts >= MAX_ATTEMPTS) {
        await db.notification.update({ where: { id }, data: { status: 'FAILED', lockedAt: null, lastError: message } })
        result.failed++
      } else {
        const delay = BACKOFF_MINUTES[Math.min(n.attempts - 1, BACKOFF_MINUTES.length - 1)] * 60_000
        await db.notification.update({ where: { id }, data: { status: 'PENDING', lockedAt: null, lastError: message, nextAttemptAt: new Date(Date.now() + delay) } })
        result.retried++
      }
      console.error(`Benachrichtigung ${id} (${n.channel}/${n.type}) fehlgeschlagen: ${message}`)
    }
  }
  return result
}
