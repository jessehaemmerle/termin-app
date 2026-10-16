import { db } from '../db'
import { randomToken, sha256 } from '../crypto'
import type { AuthTokenPurpose } from '@/generated/prisma/client'

const TTL_HOURS: Record<AuthTokenPurpose, number> = {
  INVITE: 72,
  PASSWORD_RESET: 1,
  EMAIL_VERIFY: 48,
}

/** Erzeugt ein Einmal-Token und gibt den Klartext zurück (nur für den Link). */
export async function createAuthToken(purpose: AuthTokenPurpose, subject: { userId?: string; customerId?: string }) {
  const token = randomToken()
  await db.authToken.deleteMany({
    where: { purpose, usedAt: null, ...(subject.userId ? { userId: subject.userId } : { customerId: subject.customerId }) },
  })
  await db.authToken.create({
    data: {
      tokenHash: sha256(token),
      purpose,
      userId: subject.userId ?? null,
      customerId: subject.customerId ?? null,
      expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3_600_000),
    },
  })
  return token
}

export async function findValidAuthToken(purpose: AuthTokenPurpose, token: string) {
  if (!token || token.length > 100) return null
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } })
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) return null
  return record
}

export async function markAuthTokenUsed(id: string) {
  await db.authToken.update({ where: { id }, data: { usedAt: new Date() } })
}
