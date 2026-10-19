'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { parseWeeklyHours } from '@/lib/admin/forms'
import { isHexColor } from '@/lib/color'
import { createAuthToken } from '@/lib/auth/tokens'
import { sendInviteEmail } from '@/lib/notifications/auth-emails'
import { tenantUrl } from '@/lib/tenant'
import { audit } from '@/lib/audit'
import { boundId, checkbox, formObject, zodFieldErrors, type ActionState } from '@/lib/actions'
import { logError } from '@/lib/log'

const staffSchema = z.object({
  name: z.string({ error: 'Bitte einen Namen angeben.' }).min(2, 'Bitte einen Namen angeben.').max(80),
  bio: z.string().max(200).optional(),
  farbe: z.string().refine(isHexColor, 'Ungültige Farbe.').default('#1f5f8b'),
  reihenfolge: z.coerce.number().int().min(0).max(999).default(0),
})

export async function saveStaffAction(staffId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (staffId !== null) boundId(staffId)
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const parsed = staffSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const data = { name: parsed.data.name, bio: parsed.data.bio ?? null, color: parsed.data.farbe, sortOrder: parsed.data.reihenfolge }
  if (!staffId) {
    const services = await db.service.findMany({ where: { tenantId: ctx.tenant.id, active: true }, select: { id: true } })
    const created = await db.staff.create({
      data: { ...data, tenantId: ctx.tenant.id, services: { create: services.map((s) => ({ serviceId: s.id })) } },
    })
    redirect(`/admin/team/${created.id}?neu=1`)
  }
  const staff = await db.staff.findFirst({ where: { id: staffId, tenantId: ctx.tenant.id } })
  if (!staff) return { error: 'Person nicht gefunden.' }
  const serviceIds = (await db.service.findMany({ where: { tenantId: ctx.tenant.id, id: { in: formData.getAll('leistungen').map(String) } }, select: { id: true } })).map((s) => s.id)
  await db.$transaction([
    db.staff.update({ where: { id: staff.id }, data: { ...data, active: checkbox(formData, 'aktiv') } }),
    db.staffService.deleteMany({ where: { staffId: staff.id } }),
    db.staffService.createMany({ data: serviceIds.map((serviceId) => ({ serviceId, staffId: staff.id })) }),
  ])
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'team.updated', entityType: 'Staff', entityId: staff.id })
  refresh()
  return { ok: true, message: 'Gespeichert.' }
}

export async function saveStaffHoursAction(staffId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  boundId(staffId)
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const staff = await db.staff.findFirst({ where: { id: staffId, tenantId: ctx.tenant.id } })
  if (!staff) return { error: 'Person nicht gefunden.' }
  const usesTenantHours = checkbox(formData, 'betriebszeiten')
  const { rows, errors } = parseWeeklyHours(formData)
  if (!usesTenantHours && Object.keys(errors).length) return { error: 'Bitte prüfe die Zeiten.', fieldErrors: errors }
  await db.$transaction([
    db.staff.update({ where: { id: staff.id }, data: { usesTenantHours } }),
    db.workingHours.deleteMany({ where: { tenantId: ctx.tenant.id, staffId: staff.id } }),
    ...(usesTenantHours ? [] : [db.workingHours.createMany({ data: rows.map((r) => ({ ...r, tenantId: ctx.tenant.id, staffId: staff.id })) })]),
  ])
  refresh()
  return { ok: true, message: 'Arbeitszeiten gespeichert.' }
}

const inviteSchema = z.object({
  name: z.string({ error: 'Bitte einen Namen angeben.' }).min(2, 'Bitte einen Namen angeben.').max(80),
  email: z.email({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }).max(200),
  rolle: z.enum(['OWNER', 'MANAGER', 'STAFF']),
  person: z.string().max(40).optional(),
})

export async function inviteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'team.manage' })
  const parsed = inviteSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const email = parsed.data.email.toLowerCase()
  const exists = await db.user.findUnique({ where: { tenantId_email: { tenantId: ctx.tenant.id, email } } })
  if (exists) return { error: 'Für diese E-Mail-Adresse gibt es bereits einen Zugang.' }
  let staffId: string | null = null
  if (parsed.data.person) {
    const staff = await db.staff.findFirst({ where: { id: parsed.data.person, tenantId: ctx.tenant.id, userId: null } })
    if (!staff) return { error: 'Diese Person hat bereits einen Zugang.' }
    staffId = staff.id
  }
  const user = await db.user.create({ data: { tenantId: ctx.tenant.id, email, name: parsed.data.name, role: parsed.data.rolle } })
  if (staffId) await db.staff.update({ where: { id: staffId }, data: { userId: user.id } })
  const token = await createAuthToken('INVITE', { userId: user.id })
  const link = tenantUrl(ctx.tenant, `/admin/einladung/${token}`)
  let mailed = true
  try {
    await sendInviteEmail(ctx.tenant, email, ctx.user.name, link)
  } catch (error) {
    mailed = false
    logError('Einladung konnte nicht gesendet werden', error)
  }
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'team.invited', entityType: 'User', entityId: user.id })
  refresh()
  return {
    ok: true,
    message: mailed ? `Einladung an ${email} gesendet.` : 'Zugang angelegt, die E-Mail konnte aber nicht gesendet werden. Gib den Link unten persönlich weiter.',
    data: { inviteLink: link },
  }
}

export async function resendInviteAction(userId: string, _prev: ActionState): Promise<ActionState> {
  boundId(userId)
  const ctx = await requireStaff({ permission: 'team.manage' })
  const user = await db.user.findFirst({ where: { id: userId, tenantId: ctx.tenant.id, passwordHash: null } })
  if (!user) return { error: 'Einladung nicht gefunden oder bereits angenommen.' }
  const token = await createAuthToken('INVITE', { userId: user.id })
  const link = tenantUrl(ctx.tenant, `/admin/einladung/${token}`)
  await sendInviteEmail(ctx.tenant, user.email, ctx.user.name, link).catch((e) => logError('Einladung fehlgeschlagen', e))
  return { ok: true, message: 'Neue Einladung erstellt.', data: { inviteLink: link } }
}

const userSchema = z.object({ rolle: z.enum(['OWNER', 'MANAGER', 'STAFF']) })

export async function updateUserAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  boundId(userId)
  const ctx = await requireStaff({ permission: 'team.manage' })
  const parsed = userSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Ungültige Rolle.' }
  const user = await db.user.findFirst({ where: { id: userId, tenantId: ctx.tenant.id } })
  if (!user) return { error: 'Zugang nicht gefunden.' }
  const active = checkbox(formData, 'aktiv')
  if (user.role === 'OWNER' && (parsed.data.rolle !== 'OWNER' || !active)) {
    const owners = await db.user.count({ where: { tenantId: ctx.tenant.id, role: 'OWNER', active: true } })
    if (owners <= 1) return { error: 'Es muss mindestens eine aktive Inhaberin bzw. ein aktiver Inhaber bleiben.' }
  }
  await db.user.update({ where: { id: user.id }, data: { role: parsed.data.rolle, active } })
  if (!active) await db.session.deleteMany({ where: { userId: user.id } })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'team.updated', entityType: 'User', entityId: user.id, detail: `Rolle ${parsed.data.rolle}, ${active ? 'aktiv' : 'deaktiviert'}` })
  refresh()
  return { ok: true, message: active ? 'Gespeichert.' : 'Zugang deaktiviert und auf allen Geräten abgemeldet.' }
}
