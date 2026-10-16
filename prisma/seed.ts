// Demo-Daten für Entwicklung und Tests. Läuft nicht in Produktion, außer
// SEED_DEMO=true ist ausdrücklich gesetzt.
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from '@node-rs/argon2'
import { PrismaClient } from '../src/generated/prisma/client'

if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
  console.error('Seed in Produktion abgebrochen (SEED_DEMO=true setzen, falls wirklich gewünscht).')
  process.exit(1)
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 }
const DEMO_PASSWORD = 'demo-passwort-123'
const DPA_VERSION = 'avv-2026-10-v1'

async function hours(tenantId: string, plan: Record<number, [number, number][]>, staffId: string | null = null) {
  await db.workingHours.deleteMany({ where: { tenantId, staffId } })
  for (const [weekday, ranges] of Object.entries(plan)) {
    for (const [startMinute, endMinute] of ranges) {
      await db.workingHours.create({ data: { tenantId, staffId, weekday: Number(weekday), startMinute, endMinute } })
    }
  }
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, ARGON)

  // Plattform-Admin (ohne 2FA – muss beim ersten Login eingerichtet werden)
  const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'admin@example.at').toLowerCase()
  const existingAdmin = await db.user.findFirst({ where: { tenantId: null, email: adminEmail } })
  if (!existingAdmin) {
    await db.user.create({
      data: { email: adminEmail, name: process.env.PLATFORM_ADMIN_NAME || 'Plattform Admin', role: 'PLATFORM_ADMIN', passwordHash },
    })
  }

  // ---------- Friseur ----------
  await db.tenant.deleteMany({ where: { slug: { in: ['mayer', 'huber'] } } })
  const mayer = await db.tenant.create({
    data: {
      slug: 'mayer',
      name: 'Friseur Mayer',
      tagline: 'Haarschnitt, Farbe und Styling in der Linzer Altstadt',
      description: 'Seit 1998 schneiden, färben und stylen wir in familiärer Atmosphäre. Parkplätze im Hof.',
      primaryColor: '#7a3e65',
      domainVerificationToken: randomBytes(16).toString('hex'),
      legalName: 'Anna Mayer',
      legalForm: 'Einzelunternehmen',
      street: 'Hauptplatz 12',
      postalCode: '4020',
      city: 'Linz',
      phone: '+43732123456',
      email: 'salon@friseur-mayer.example',
      uidNumber: 'ATU12345678',
      businessPurpose: 'Friseurgewerbe',
      supervisoryAuthority: 'Magistrat der Landeshauptstadt Linz',
      chamber: 'Wirtschaftskammer Oberösterreich, Landesinnung der Friseure',
      privacyContactEmail: 'datenschutz@friseur-mayer.example',
      whatsappDisplayNumber: '+436641234567',
      dpaAcceptedAt: new Date(),
      dpaVersion: DPA_VERSION,
      minLeadMinutes: 60,
    },
  })
  await hours(mayer.id, { 2: [[540, 1080]], 3: [[540, 1080]], 4: [[540, 1200]], 5: [[540, 1080]], 6: [[480, 780]] })

  const owner = await db.user.create({
    data: { tenantId: mayer.id, email: 'anna@friseur-mayer.example', name: 'Anna Mayer', role: 'OWNER', passwordHash },
  })
  const staffUser = await db.user.create({
    data: { tenantId: mayer.id, email: 'ben@friseur-mayer.example', name: 'Ben Huber', role: 'STAFF', passwordHash },
  })
  const anna = await db.staff.create({ data: { tenantId: mayer.id, userId: owner.id, name: 'Anna', bio: 'Inhaberin, Schnitt & Farbe', color: '#7a3e65', sortOrder: 1 } })
  const ben = await db.staff.create({ data: { tenantId: mayer.id, userId: staffUser.id, name: 'Ben', bio: 'Herrenschnitt & Bart', color: '#2f6f5e', sortOrder: 2, usesTenantHours: false } })
  await hours(mayer.id, { 2: [[600, 1080]], 3: [[600, 1080]], 5: [[600, 1080]], 6: [[480, 780]] }, ben.id)

  const colorChair = await db.resource.create({ data: { tenantId: mayer.id, name: 'Färbeplatz', capacity: 1 } })

  const services = [
    { name: 'Damenhaarschnitt', category: 'Schneiden', durationMinutes: 60, priceCents: 5200, priceFrom: true, staff: [anna.id] },
    { name: 'Herrenhaarschnitt', category: 'Schneiden', durationMinutes: 30, bufferAfterMinutes: 5, priceCents: 3200, staff: [anna.id, ben.id] },
    { name: 'Bartpflege', category: 'Schneiden', durationMinutes: 20, priceCents: 1800, staff: [ben.id] },
    { name: 'Färben', category: 'Farbe', durationMinutes: 90, bufferAfterMinutes: 15, priceCents: 7500, priceFrom: true, staff: [anna.id], resources: [colorChair.id] },
  ]
  for (const [i, s] of services.entries()) {
    await db.service.create({
      data: {
        tenantId: mayer.id,
        name: s.name,
        category: s.category,
        durationMinutes: s.durationMinutes,
        bufferAfterMinutes: s.bufferAfterMinutes ?? 0,
        priceCents: s.priceCents,
        priceFrom: s.priceFrom ?? false,
        sortOrder: i,
        staff: { create: s.staff.map((staffId) => ({ staffId })) },
        resources: { create: (s.resources ?? []).map((resourceId) => ({ resourceId })) },
      },
    })
  }
  const workshop = await db.service.create({
    data: {
      tenantId: mayer.id,
      name: 'Workshop Hochsteckfrisuren',
      description: 'Lernen Sie drei Hochsteckfrisuren für Feste – mit Übungskopf.',
      kind: 'GROUP',
      durationMinutes: 120,
      groupCapacity: 6,
      priceCents: 4900,
      sortOrder: 10,
      staff: { create: [{ staffId: anna.id }] },
    },
  })
  const now = new Date()
  for (const offset of [9, 23]) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, 17, 0))
    await db.groupSession.create({
      data: { tenantId: mayer.id, serviceId: workshop.id, staffId: anna.id, startsAt: start, endsAt: new Date(+start + 120 * 60_000), capacity: 6 },
    })
  }

  // ---------- Werkstatt ----------
  const huber = await db.tenant.create({
    data: {
      slug: 'huber',
      name: 'Kfz-Werkstatt Huber',
      tagline: 'Service, Pickerl und Reifenwechsel in Graz-Liebenau',
      primaryColor: '#f2b705',
      domainVerificationToken: randomBytes(16).toString('hex'),
      legalName: 'Huber Kfz-Technik GmbH',
      legalForm: 'GmbH',
      street: 'Liebenauer Hauptstraße 80',
      postalCode: '8041',
      city: 'Graz',
      email: 'werkstatt@huber.example',
      phone: '+43316987654',
      uidNumber: 'ATU87654321',
      companyRegisterNumber: 'FN 123456a',
      companyRegisterCourt: 'Landesgericht für ZRS Graz',
      businessPurpose: 'Kraftfahrzeugtechnik',
      supervisoryAuthority: 'Magistrat Graz',
      chamber: 'Wirtschaftskammer Steiermark, Landesinnung Fahrzeugtechnik',
      dpaAcceptedAt: new Date(),
      dpaVersion: DPA_VERSION,
      slotIntervalMinutes: 30,
      requireApproval: true,
      requirePhone: true,
    },
  })
  await hours(huber.id, { 1: [[450, 1020]], 2: [[450, 1020]], 3: [[450, 1020]], 4: [[450, 1020]], 5: [[450, 780]] })
  const hOwner = await db.user.create({
    data: { tenantId: huber.id, email: 'chef@huber.example', name: 'Karl Huber', role: 'OWNER', passwordHash },
  })
  const mech1 = await db.staff.create({ data: { tenantId: huber.id, userId: hOwner.id, name: 'Karl', sortOrder: 1 } })
  const mech2 = await db.staff.create({ data: { tenantId: huber.id, name: 'Lena', sortOrder: 2 } })
  const mech3 = await db.staff.create({ data: { tenantId: huber.id, name: 'Murat', sortOrder: 3 } })
  const lift = await db.resource.create({ data: { tenantId: huber.id, name: 'Hebebühne', capacity: 2 } })
  for (const [i, s] of [
    { name: 'Reifenwechsel', durationMinutes: 30, priceCents: 4500 },
    { name: '§57a-Begutachtung (Pickerl)', durationMinutes: 60, priceCents: 6900 },
    { name: 'Jahresservice', durationMinutes: 120, priceCents: 18900, priceFrom: true },
  ].entries()) {
    await db.service.create({
      data: {
        tenantId: huber.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
        priceFrom: s.priceFrom ?? false,
        sortOrder: i,
        staff: { create: [mech1, mech2, mech3].map((m) => ({ staffId: m.id })) },
        resources: { create: [{ resourceId: lift.id }] },
      },
    })
  }

  console.log('Demo-Daten angelegt.')
  console.log(`  Plattform-Admin: ${adminEmail} / ${DEMO_PASSWORD} (2FA muss eingerichtet werden)`)
  console.log(`  Friseur Mayer:   anna@friseur-mayer.example / ${DEMO_PASSWORD} (Inhaberin)`)
  console.log(`                   ben@friseur-mayer.example / ${DEMO_PASSWORD} (Mitarbeiter)`)
  console.log(`  Werkstatt Huber: chef@huber.example / ${DEMO_PASSWORD} (Inhaber)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
