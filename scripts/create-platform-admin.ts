// Legt den ersten Plattform-Admin an bzw. setzt dessen Passwort neu.
// Aufruf: PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_NAME=… npm run platform-admin:create
// Das zufällige Startpasswort wird einmalig ausgegeben; beim ersten Login ist 2FA einzurichten.
import { randomBytes } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from '@node-rs/argon2'
import { PrismaClient } from '../src/generated/prisma/client'

const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase()
const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'Plattform-Admin'
if (!email || !email.includes('@')) {
  console.error('Bitte PLATFORM_ADMIN_EMAIL setzen.')
  process.exit(1)
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const password = randomBytes(18).toString('base64url')
const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 })

const existing = await db.user.findFirst({ where: { tenantId: null, email } })
if (existing) {
  await db.user.update({ where: { id: existing.id }, data: { passwordHash, role: 'PLATFORM_ADMIN', active: true, failedLogins: 0, lockedUntil: null } })
  await db.session.deleteMany({ where: { userId: existing.id } })
  console.log(`Passwort für ${email} neu gesetzt.`)
} else {
  await db.user.create({ data: { email, name, role: 'PLATFORM_ADMIN', passwordHash } })
  console.log(`Plattform-Admin ${email} angelegt.`)
}
console.log(`Startpasswort (nur jetzt sichtbar): ${password}`)
console.log('Beim ersten Login muss die Zwei-Faktor-Anmeldung eingerichtet werden.')
await db.$disconnect()
