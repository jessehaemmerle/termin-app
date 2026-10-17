'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { findBookingByToken } from '@/lib/booking/manage'
import { BookingError, cancelBooking } from '@/lib/booking/service'
import { WHATSAPP_CONSENT_VERSION } from '@/lib/legal/consent'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'
import { audit } from '@/lib/audit'
import type { ActionState } from '@/lib/actions'

async function guard() {
  const limit = rateLimit(`manage:${await clientIp()}`, 30, 10 * 60 * 1000)
  if (!limit.ok) throw new BookingError('INVALID_STATE', 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.')
}

export async function cancelByTokenAction(token: string, _prev: ActionState): Promise<ActionState> {
  const tenant = await requireTenant()
  try {
    await guard()
    const booking = await findBookingByToken(tenant, token)
    if (!booking) return { error: 'Termin nicht gefunden.' }
    await cancelBooking(tenant, booking.id, 'CUSTOMER')
    await audit({ tenantId: tenant.id, actorType: 'CUSTOMER', actorId: booking.customerId, action: 'booking.status', entityType: 'Booking', entityId: booking.id, detail: 'Absage über Verwaltungslink' })
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  redirect(`/termin/${token}?abgesagt=1`)
}

/** Widerruf der WhatsApp-Einwilligung (Art. 7 Abs. 3 DSGVO) – so einfach wie die Erteilung. */
export async function withdrawWhatsappAction(token: string, _prev: ActionState): Promise<ActionState> {
  const tenant = await requireTenant()
  try {
    await guard()
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  const booking = await findBookingByToken(tenant, token)
  if (!booking?.customerId || !booking.customer) return { error: 'Termin nicht gefunden.' }
  const { customerId, phone } = booking
  if (phone) {
    // Der Link belegt nur die bei dieser Buchung angegebene Nummer. Die gespeicherte Einwilligung
    // wird nur widerrufen, wenn sie genau diese Nummer betrifft – sonst könnte jemand mit einer
    // fremden E-Mail-Adresse buchen und die Einwilligung einer anderen Person widerrufen.
    const consented = phone === booking.customer.phone
    await db.$transaction([
      db.booking.updateMany({ where: { tenantId: tenant.id, customerId, phone, startsAt: { gt: new Date() } }, data: { notifyWhatsapp: false } }),
      db.notification.updateMany({
        where: { tenantId: tenant.id, channel: 'WHATSAPP', status: 'PENDING', booking: { customerId, phone } },
        data: { status: 'SKIPPED' },
      }),
      ...(consented
        ? [
            db.customer.update({ where: { id: customerId }, data: { whatsappOptIn: false } }),
            db.consentRecord.create({
              data: { tenantId: tenant.id, customerId, channel: 'WHATSAPP', granted: false, textVersion: WHATSAPP_CONSENT_VERSION, source: 'manage_link' },
            }),
          ]
        : []),
    ])
  }
  await audit({ tenantId: tenant.id, actorType: 'CUSTOMER', actorId: booking.customerId, action: 'customer.consent', entityType: 'Customer', entityId: booking.customerId, detail: 'WhatsApp widerrufen' })
  return { ok: true, message: 'WhatsApp-Benachrichtigungen sind beendet. Sie erhalten weiterhin E-Mails zu Ihren Terminen.' }
}
