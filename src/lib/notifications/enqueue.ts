import type { Booking, NotificationType, Tenant } from '@/generated/prisma/client'
import type { DbClient } from '../booking/data'

// Legt Benachrichtigungen in der Outbox ab. Der Worker erzeugt die Inhalte
// erst beim Versand – so stehen keine Nachrichtentexte in der Datenbank.

const WHATSAPP_TYPES: NotificationType[] = [
  'BOOKING_CONFIRMED',
  'BOOKING_RESCHEDULED',
  'BOOKING_REMINDER',
  'BOOKING_CANCELLED',
  'BOOKING_DECLINED',
]

type BookingForNotify = Pick<Booking, 'id' | 'staffId' | 'notifyEmail' | 'notifyWhatsapp' | 'phone'> & {
  customer: { email: string | null } | null
}

export async function enqueueCustomerNotification(
  client: DbClient,
  tenant: Tenant,
  booking: BookingForNotify,
  type: NotificationType,
  options: { sendAfter?: Date } = {},
) {
  const rows: { channel: 'EMAIL' | 'WHATSAPP' }[] = []
  if (booking.notifyEmail && booking.customer?.email) rows.push({ channel: 'EMAIL' })
  if (booking.notifyWhatsapp && booking.phone && tenant.whatsappEnabled && WHATSAPP_TYPES.includes(type)) {
    rows.push({ channel: 'WHATSAPP' })
  }
  if (!rows.length) return
  await client.notification.createMany({
    data: rows.map((r) => ({
      tenantId: tenant.id,
      bookingId: booking.id,
      channel: r.channel,
      type,
      nextAttemptAt: options.sendAfter ?? new Date(),
    })),
  })
}

/** Benachrichtigt die zugeordnete Person sowie Inhaber:innen und Leitung. */
export async function enqueueStaffNotifications(
  client: DbClient,
  tenant: Tenant,
  booking: Pick<Booking, 'id' | 'staffId'>,
  type: 'STAFF_NEW_BOOKING' | 'STAFF_BOOKING_CANCELLED',
) {
  const assigned = booking.staffId
    ? await client.staff.findUnique({ where: { id: booking.staffId }, select: { userId: true } })
    : null
  const leads = await client.user.findMany({
    where: { tenantId: tenant.id, active: true, role: { in: ['OWNER', 'MANAGER'] } },
    select: { id: true },
  })
  const userIds = new Set(leads.map((u) => u.id))
  if (assigned?.userId) userIds.add(assigned.userId)
  if (!userIds.size) return

  const withPush = await client.pushSubscription.findMany({
    where: { userId: { in: [...userIds] } },
    select: { userId: true },
    distinct: ['userId'],
  })
  const data: { tenantId: string; bookingId: string; userId: string; channel: 'EMAIL' | 'PUSH'; type: NotificationType }[] = []
  for (const userId of userIds) {
    if (tenant.notifyStaffByEmail) data.push({ tenantId: tenant.id, bookingId: booking.id, userId, channel: 'EMAIL', type })
  }
  for (const { userId } of withPush) {
    data.push({ tenantId: tenant.id, bookingId: booking.id, userId, channel: 'PUSH', type })
  }
  if (data.length) await client.notification.createMany({ data })
}
