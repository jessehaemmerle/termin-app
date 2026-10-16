import { cache } from 'react'
import { cookies } from 'next/headers'
import { db } from '../db'
import { env } from '../env'
import { randomToken, sha256 } from '../crypto'
import { DAY } from '../time'

// Sessions: zufälliges Token im HttpOnly-Cookie, in der Datenbank nur der
// SHA-256-Hash. Cookies sind host-gebunden (__Host-Präfix), damit Sitzungen
// verschiedener Betriebe strikt getrennt bleiben.

export type SessionRealm = 'staff' | 'customer' | 'platform'

const SESSION_DAYS = 30

export function cookieName(realm: SessionRealm): string {
  const base = realm === 'staff' ? 'tb_team' : realm === 'customer' ? 'tb_kunde' : 'tb_plattform'
  return env().COOKIE_SECURE ? `__Host-${base}` : base
}

export async function createSession(
  realm: SessionRealm,
  subject: { userId?: string; customerId?: string; tenantId: string | null },
  mfaVerified: boolean,
) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY)
  await db.session.create({
    data: {
      id: sha256(token),
      userId: subject.userId ?? null,
      customerId: subject.customerId ?? null,
      tenantId: subject.tenantId,
      mfaVerified,
      expiresAt,
    },
  })
  const jar = await cookies()
  jar.set(cookieName(realm), token, {
    httpOnly: true,
    secure: env().COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

async function sessionId(realm: SessionRealm): Promise<string | null> {
  const token = (await cookies()).get(cookieName(realm))?.value
  return token ? sha256(token) : null
}

async function readUserSession(realm: 'staff' | 'platform') {
  const id = await sessionId(realm)
  if (!id) return null
  const session = await db.session.findUnique({ where: { id }, include: { user: true } })
  if (!session?.user || session.expiresAt < new Date() || !session.user.active) return null
  return { ...session, user: session.user }
}

export const readStaffSession = cache(() => readUserSession('staff'))
export const readPlatformSession = cache(() => readUserSession('platform'))

export const readCustomerSession = cache(async () => {
  const id = await sessionId('customer')
  if (!id) return null
  const session = await db.session.findUnique({ where: { id }, include: { customer: true } })
  if (!session?.customer || session.expiresAt < new Date() || !session.customer.passwordHash) return null
  return { ...session, customer: session.customer }
})

export async function markSessionMfaVerified(realm: SessionRealm) {
  const id = await sessionId(realm)
  if (id) await db.session.update({ where: { id }, data: { mfaVerified: true } })
}

export async function destroySession(realm: SessionRealm) {
  const id = await sessionId(realm)
  if (id) await db.session.deleteMany({ where: { id } })
  const jar = await cookies()
  jar.delete({ name: cookieName(realm), path: '/', secure: env().COOKIE_SECURE })
}

/** Beendet alle anderen Sitzungen eines Kontos (z. B. nach Passwortänderung). */
export async function revokeOtherSessions(realm: SessionRealm, subject: { userId?: string; customerId?: string }) {
  const current = await sessionId(realm)
  await db.session.deleteMany({
    where: {
      ...(subject.userId ? { userId: subject.userId } : { customerId: subject.customerId }),
      ...(current ? { NOT: { id: current } } : {}),
    },
  })
}
