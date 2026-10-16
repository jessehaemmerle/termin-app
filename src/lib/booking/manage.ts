import { db } from '../db'
import { sha256 } from '../crypto'
import type { Tenant } from '@/generated/prisma/client'

/** Termin über den geheimen Verwaltungslink finden (nur Hash wird verglichen). */
export async function findBookingByToken(tenant: Tenant, token: string) {
  if (!token || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) return null
  return db.booking.findFirst({
    where: { tenantId: tenant.id, manageTokenHash: sha256(token), anonymizedAt: null },
    include: { service: true, staff: true, customer: true, groupSession: true },
  })
}
