import { db } from '../db'
import type { Prisma } from '@/generated/prisma/client'

// Löschung und Anonymisierung (Art. 17 DSGVO, Speicherbegrenzung Art. 5 Abs. 1 lit. e).
// Termine bleiben für Statistik und Kapazitätsplanung erhalten, verlieren aber
// jeden Personenbezug (Kund:in, Nachricht, Telefonnummer, Verwaltungslink).

const ANONYMIZED_BOOKING = {
  customerId: null,
  customerNote: null,
  phone: null,
  manageTokenHash: null,
  manageTokenEnc: null,
  notifyWhatsapp: false,
  notifyEmail: false,
} satisfies Prisma.BookingUncheckedUpdateManyInput

export async function anonymizeBookings(tx: Prisma.TransactionClient, where: Prisma.BookingWhereInput) {
  const affected = await tx.booking.findMany({ where: { ...where, anonymizedAt: null }, select: { id: true } })
  if (!affected.length) return 0
  const ids = affected.map((b) => b.id)
  // Versandprotokolle enthalten u. U. Adressen in Fehlermeldungen: mit dem Personenbezug löschen
  await tx.notification.deleteMany({ where: { bookingId: { in: ids } } })
  await tx.booking.updateMany({ where: { id: { in: ids } }, data: { ...ANONYMIZED_BOOKING, anonymizedAt: new Date() } })
  return ids.length
}

/**
 * Löscht eine Kund:in vollständig: zukünftige Termine werden abgesagt, alle
 * Termine anonymisiert, Einwilligungsnachweise, Warteliste, Sitzungen und
 * Konto gelöscht.
 */
export async function eraseCustomer(tenantId: string, customerId: string) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } })
    if (!customer) return false
    await tx.booking.updateMany({
      where: { tenantId, customerId, status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { gt: new Date() } },
      data: { status: 'CANCELLED_BY_BUSINESS', cancelledAt: new Date() },
    })
    await anonymizeBookings(tx, { tenantId, customerId })
    await tx.customer.delete({ where: { id: customer.id } })
    return true
  })
}
