'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { parsePriceCents, parseWeeklyHours } from '@/lib/admin/forms'
import { isValidDateString, timeToMinutes, zonedInstant, addDays } from '@/lib/time'
import { cancelBooking, BookingError, createGroupBooking } from '@/lib/booking/service'
import { normalizePhone } from '@/lib/phone'
import { audit } from '@/lib/audit'
import { checkbox, formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

// ---------- Leistungen ----------

const serviceSchema = z.object({
  name: z.string({ error: 'Bitte einen Namen angeben.' }).min(2, 'Bitte einen Namen angeben.').max(100),
  beschreibung: z.string().max(500).optional(),
  kategorie: z.string().max(60).optional(),
  art: z.enum(['INDIVIDUAL', 'GROUP']),
  dauer: z.coerce.number({ error: 'Bitte die Dauer in Minuten angeben.' }).int().min(5, 'Mindestens 5 Minuten.').max(720, 'Höchstens 12 Stunden.'),
  pufferVor: z.coerce.number().int().min(0).max(240).default(0),
  pufferNach: z.coerce.number().int().min(0).max(240).default(0),
  preis: z.string().optional(),
  kapazitaet: z.coerce.number().int().min(1).max(500).optional(),
  reihenfolge: z.coerce.number().int().min(0).max(999).default(0),
})

export async function saveServiceAction(serviceId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const parsed = serviceSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const price = parsePriceCents(parsed.data.preis)
  if (price === 'invalid') return { error: 'Bitte prüfe die Angaben.', fieldErrors: { preis: 'Bitte einen Preis wie 52,50 angeben.' } }
  if (parsed.data.art === 'GROUP' && !parsed.data.kapazitaet) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { kapazitaet: 'Bitte die maximale Teilnehmerzahl angeben.' } }

  const tenantId = ctx.tenant.id
  const staffIds = (await db.staff.findMany({ where: { tenantId, id: { in: formData.getAll('personen').map(String) } }, select: { id: true } })).map((s) => s.id)
  const resourceIds = (await db.resource.findMany({ where: { tenantId, id: { in: formData.getAll('ressourcen').map(String) } }, select: { id: true } })).map((r) => r.id)
  const data = {
    name: parsed.data.name,
    description: parsed.data.beschreibung ?? null,
    category: parsed.data.kategorie ?? null,
    kind: parsed.data.art,
    durationMinutes: parsed.data.dauer,
    bufferBeforeMinutes: parsed.data.pufferVor,
    bufferAfterMinutes: parsed.data.pufferNach,
    priceCents: price,
    priceFrom: checkbox(formData, 'preisAb'),
    groupCapacity: parsed.data.art === 'GROUP' ? (parsed.data.kapazitaet ?? null) : null,
    sortOrder: parsed.data.reihenfolge,
    active: checkbox(formData, 'aktiv'),
  }

  if (serviceId) {
    const existing = await db.service.findFirst({ where: { id: serviceId, tenantId } })
    if (!existing) return { error: 'Leistung nicht gefunden.' }
    await db.$transaction([
      db.service.update({ where: { id: existing.id }, data }),
      db.staffService.deleteMany({ where: { serviceId: existing.id } }),
      db.serviceResource.deleteMany({ where: { serviceId: existing.id } }),
      db.staffService.createMany({ data: staffIds.map((staffId) => ({ staffId, serviceId: existing.id })) }),
      db.serviceResource.createMany({ data: resourceIds.map((resourceId) => ({ resourceId, serviceId: existing.id })) }),
    ])
  } else {
    await db.service.create({
      data: {
        ...data,
        tenantId,
        staff: { create: staffIds.map((staffId) => ({ staffId })) },
        resources: { create: resourceIds.map((resourceId) => ({ resourceId })) },
      },
    })
  }
  await audit({ tenantId, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', entityType: 'Service', entityId: serviceId ?? undefined, detail: `Leistung ${parsed.data.name}` })
  redirect('/admin/leistungen?gespeichert=1')
}

export async function deleteServiceAction(serviceId: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const service = await db.service.findFirst({ where: { id: serviceId, tenantId: ctx.tenant.id }, include: { _count: { select: { bookings: true } } } })
  if (!service) return { error: 'Leistung nicht gefunden.' }
  if (service._count.bookings > 0) {
    await db.service.update({ where: { id: service.id }, data: { active: false } })
    redirect('/admin/leistungen?deaktiviert=1')
  }
  await db.service.delete({ where: { id: service.id } })
  redirect('/admin/leistungen?geloescht=1')
}

// ---------- Ressourcen ----------

const resourceSchema = z.object({
  name: z.string({ error: 'Bitte einen Namen angeben.' }).min(2, 'Bitte einen Namen angeben.').max(80),
  kapazitaet: z.coerce.number({ error: 'Bitte eine Anzahl angeben.' }).int().min(1, 'Mindestens 1.').max(100),
})

export async function saveResourceAction(resourceId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const parsed = resourceSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const data = { name: parsed.data.name, capacity: parsed.data.kapazitaet, active: resourceId ? checkbox(formData, 'aktiv') : true }
  if (resourceId) {
    const updated = await db.resource.updateMany({ where: { id: resourceId, tenantId: ctx.tenant.id }, data })
    if (!updated.count) return { error: 'Ressource nicht gefunden.' }
  } else {
    await db.resource.create({ data: { ...data, tenantId: ctx.tenant.id } })
  }
  refresh()
  return { ok: true, message: 'Gespeichert.' }
}

// ---------- Öffnungszeiten und Schließtage ----------

export async function saveTenantHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const { rows, errors } = parseWeeklyHours(formData)
  if (Object.keys(errors).length) return { error: 'Bitte prüfe die Zeiten.', fieldErrors: errors }
  await db.$transaction([
    db.workingHours.deleteMany({ where: { tenantId: ctx.tenant.id, staffId: null } }),
    db.workingHours.createMany({ data: rows.map((r) => ({ ...r, tenantId: ctx.tenant.id, staffId: null })) }),
  ])
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', detail: 'Öffnungszeiten' })
  refresh()
  return { ok: true, message: 'Öffnungszeiten gespeichert.' }
}

const absenceSchema = z.object({
  von: z.string().refine(isValidDateString, 'Bitte ein Startdatum wählen.'),
  bis: z.string().refine(isValidDateString, 'Bitte ein Enddatum wählen.'),
  vonZeit: z.string().optional(),
  bisZeit: z.string().optional(),
  bezeichnung: z.string().max(80).optional(),
  person: z.string().max(40).optional(),
})

/** Abwesenheit einer Person (person gesetzt) oder Schließtag des Betriebs. */
export async function addAbsenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const parsed = absenceSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const tz = ctx.tenant.timezone
  const fromMinute = parsed.data.vonZeit ? timeToMinutes(parsed.data.vonZeit) : 0
  const toMinute = parsed.data.bisZeit ? timeToMinutes(parsed.data.bisZeit) : null
  if (fromMinute === null) return { error: 'Ungültige Uhrzeit.' }
  const startsAt = zonedInstant(parsed.data.von, fromMinute, tz)
  const endsAt = toMinute === null ? zonedInstant(addDays(parsed.data.bis, 1), 0, tz) : zonedInstant(parsed.data.bis, toMinute, tz)
  if (endsAt <= startsAt) return { error: 'Das Ende muss nach dem Beginn liegen.' }
  let staffId: string | null = null
  if (parsed.data.person) {
    const staff = await db.staff.findFirst({ where: { id: parsed.data.person, tenantId: ctx.tenant.id } })
    if (!staff) return { error: 'Person nicht gefunden.' }
    staffId = staff.id
  }
  await db.timeOff.create({ data: { tenantId: ctx.tenant.id, staffId, startsAt, endsAt, label: parsed.data.bezeichnung ?? null } })
  const conflicts = await db.booking.count({
    where: { tenantId: ctx.tenant.id, status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(staffId ? { staffId } : {}) },
  })
  refresh()
  return {
    ok: true,
    message: conflicts
      ? `Eingetragen. Achtung: In diesem Zeitraum ${conflicts === 1 ? 'liegt 1 bestehender Termin' : `liegen ${conflicts} bestehende Termine`} – bitte verschieben oder absagen.`
      : 'Eingetragen.',
  }
}

export async function deleteAbsenceAction(id: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  await db.timeOff.deleteMany({ where: { id, tenantId: ctx.tenant.id } })
  refresh()
  return { ok: true, message: 'Entfernt.' }
}

// ---------- Kurse ----------

const sessionSchema = z.object({
  leistung: z.string().min(1, 'Bitte einen Kurs wählen.'),
  person: z.string().max(40).optional(),
  datum: z.string().refine(isValidDateString, 'Bitte ein Datum wählen.'),
  zeit: z.string().regex(/^\d{1,2}:\d{2}$/, 'Bitte eine Uhrzeit wählen.'),
  kapazitaet: z.coerce.number().int().min(1).max(500).optional(),
  hinweis: z.string().max(300).optional(),
  wiederholen: z.coerce.number().int().min(0).max(26).default(0),
})

export async function createSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const parsed = sessionSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const service = await db.service.findFirst({ where: { id: parsed.data.leistung, tenantId: ctx.tenant.id, kind: 'GROUP' } })
  if (!service) return { error: 'Kurs nicht gefunden.' }
  const staff = parsed.data.person ? await db.staff.findFirst({ where: { id: parsed.data.person, tenantId: ctx.tenant.id } }) : null
  const minute = timeToMinutes(parsed.data.zeit)
  if (minute === null) return { error: 'Ungültige Uhrzeit.' }
  const capacity = parsed.data.kapazitaet ?? service.groupCapacity ?? 1
  const data = Array.from({ length: parsed.data.wiederholen + 1 }, (_, week) => {
    const startsAt = zonedInstant(addDays(parsed.data.datum, week * 7), minute, ctx.tenant.timezone)
    return {
      tenantId: ctx.tenant.id,
      serviceId: service.id,
      staffId: staff?.id ?? null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60_000),
      capacity,
      note: parsed.data.hinweis ?? null,
    }
  })
  await db.groupSession.createMany({ data })
  refresh()
  return { ok: true, message: data.length === 1 ? 'Kurstermin angelegt.' : `${data.length} Kurstermine angelegt.` }
}

export async function cancelSessionAction(sessionId: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const session = await db.groupSession.findFirst({ where: { id: sessionId, tenantId: ctx.tenant.id, cancelledAt: null }, include: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } })
  if (!session) return { error: 'Kurstermin nicht gefunden.' }
  for (const b of session.bookings) await cancelBooking(ctx.tenant, b.id, 'BUSINESS')
  await db.groupSession.update({ where: { id: session.id }, data: { cancelledAt: new Date() } })
  await db.waitlistEntry.deleteMany({ where: { groupSessionId: session.id } })
  redirect('/admin/kurse?abgesagt=1')
}

const participantSchema = z.object({
  name: z.string().min(2, 'Bitte den Namen angeben.').max(100),
  email: z.email({ error: 'Ungültige E-Mail-Adresse.' }).max(200).optional(),
  telefon: z.string().max(30).optional(),
})

export async function addParticipantAction(sessionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const parsed = participantSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const phone = normalizePhone(parsed.data.telefon)
  if (!parsed.data.email && !phone) return { error: 'Bitte E-Mail-Adresse oder Telefonnummer angeben.' }
  try {
    await createGroupBooking({
      tenant: ctx.tenant,
      sessionId,
      customer: { kind: 'guest', name: parsed.data.name, email: parsed.data.email ?? null, phone },
      notifyWhatsapp: false,
      source: 'ADMIN',
      notifyEmail: checkbox(formData, 'benachrichtigen'),
    })
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  refresh()
  return { ok: true, message: 'Teilnehmer:in eingetragen.' }
}
