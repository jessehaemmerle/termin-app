'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { platformPath, tenantUrl } from '@/lib/tenant'
import { isValidSlug } from '@/lib/hosts'
import { checkLogin, checkSecondFactor, loginErrorMessage } from '@/lib/auth/flows'
import { createSession, destroySession, markSessionMfaVerified, readPlatformSession } from '@/lib/auth/session'
import { requirePlatformAdmin } from '@/lib/auth/guards'
import { beginTotp, confirmTotp } from '@/lib/auth/two-factor'
import { createAuthToken } from '@/lib/auth/tokens'
import { sendInviteEmail } from '@/lib/notifications/auth-emails'
import { audit } from '@/lib/audit'
import { formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

const loginSchema = z.object({
  email: z.email({ error: 'Bitte die E-Mail-Adresse eingeben.' }).max(200),
  password: z.string().min(1, 'Bitte das Passwort eingeben.').max(200),
})

export async function platformLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe deine Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const email = parsed.data.email.toLowerCase()
  const user = await db.user.findFirst({ where: { tenantId: null, email, role: 'PLATFORM_ADMIN', active: true } })
  const result = await checkLogin('user', 'platform', email, user, parsed.data.password)
  if (result !== 'ok' || !user) return { error: loginErrorMessage(result, false) }
  await createSession('platform', { userId: user.id, tenantId: null }, !user.totpEnabledAt)
  await audit({ actorType: 'PLATFORM_ADMIN', actorId: user.id, action: 'auth.login' })
  redirect(platformPath(user.totpEnabledAt ? '/login/2fa' : '/konto?2fa=pflicht'))
}

export async function platformSecondFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await readPlatformSession()
  if (!session || session.user.role !== 'PLATFORM_ADMIN') redirect(platformPath('/login'))
  if (!(await checkSecondFactor('user', session.user, String(formData.get('code') ?? '')))) return { error: 'Der Code ist ungültig.' }
  await markSessionMfaVerified('platform')
  redirect(platformPath('/betriebe'))
}

export async function platformLogoutAction() {
  await destroySession('platform')
  redirect(platformPath('/login'))
}

export async function platformBeginTotpAction(_prev: ActionState): Promise<ActionState> {
  const user = await requirePlatformAdmin({ allowMissing2fa: true })
  if (user.totpEnabledAt) return { error: 'Bereits aktiv.' }
  await beginTotp('user', user.id)
  refresh()
  return { ok: true }
}

export async function platformConfirmTotpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePlatformAdmin({ allowMissing2fa: true })
  const codes = await confirmTotp('user', user.id, user.totpSecretEnc, String(formData.get('code') ?? ''))
  if (!codes) return { error: 'Der Code stimmt nicht.' }
  await markSessionMfaVerified('platform')
  await audit({ actorType: 'PLATFORM_ADMIN', actorId: user.id, action: 'auth.2fa_enabled' })
  return { ok: true, message: 'Zwei-Faktor-Anmeldung aktiv. Bewahre die Wiederherstellungscodes sicher auf.', data: { codes } }
}

const tenantSchema = z.object({
  name: z.string({ error: 'Bitte den Namen angeben.' }).min(2, 'Bitte den Namen angeben.').max(80),
  slug: z
    .string({ error: 'Bitte eine Subdomain angeben.' })
    .toLowerCase()
    .refine(isValidSlug, 'Nur Kleinbuchstaben, Ziffern und Bindestriche (nicht am Anfang/Ende); reservierte Namen sind nicht erlaubt.'),
  inhaberName: z.string({ error: 'Bitte den Namen der Inhaberin bzw. des Inhabers angeben.' }).min(2).max(80),
  inhaberEmail: z.email({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }).max(200),
})

export async function createTenantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePlatformAdmin()
  const parsed = tenantSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  if (await db.tenant.findUnique({ where: { slug: parsed.data.slug } })) return { error: 'Diese Subdomain ist bereits vergeben.', fieldErrors: { slug: 'Bereits vergeben.' } }

  const tenant = await db.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: { name: parsed.data.name, slug: parsed.data.slug, domainVerificationToken: randomBytes(16).toString('hex'), email: parsed.data.inhaberEmail.toLowerCase() },
    })
    const owner = await tx.user.create({ data: { tenantId: created.id, email: parsed.data.inhaberEmail.toLowerCase(), name: parsed.data.inhaberName, role: 'OWNER' } })
    await tx.staff.create({ data: { tenantId: created.id, userId: owner.id, name: parsed.data.inhaberName.split(' ')[0] } })
    // Startwerte: Mo–Fr 9–17 Uhr, im Verwaltungsbereich anpassbar
    await tx.workingHours.createMany({ data: [1, 2, 3, 4, 5].map((weekday) => ({ tenantId: created.id, weekday, startMinute: 540, endMinute: 1020 })) })
    return created
  })
  const owner = await db.user.findFirstOrThrow({ where: { tenantId: tenant.id, role: 'OWNER' } })
  const token = await createAuthToken('INVITE', { userId: owner.id })
  const link = tenantUrl(tenant, `/admin/einladung/${token}`)
  let mailed = true
  await sendInviteEmail(tenant, owner.email, 'Das Plattform-Team', link).catch((e) => {
    mailed = false
    console.error('Einladung an Inhaber:in fehlgeschlagen', e)
  })
  await audit({ tenantId: tenant.id, actorType: 'PLATFORM_ADMIN', actorId: admin.id, action: 'tenant.created', detail: tenant.slug })
  refresh()
  return {
    ok: true,
    message: mailed ? `${tenant.name} angelegt, Einladung an ${owner.email} gesendet.` : `${tenant.name} angelegt. Die E-Mail konnte nicht gesendet werden – gib den Link persönlich weiter.`,
    data: { inviteLink: link },
  }
}

export async function setTenantStatusAction(tenantId: string, status: 'ACTIVE' | 'SUSPENDED', _prev: ActionState): Promise<ActionState> {
  const admin = await requirePlatformAdmin()
  await db.tenant.update({ where: { id: tenantId }, data: { status } })
  if (status === 'SUSPENDED') await db.session.deleteMany({ where: { tenantId } })
  await audit({ tenantId, actorType: 'PLATFORM_ADMIN', actorId: admin.id, action: 'tenant.status', detail: status })
  refresh()
  return { ok: true, message: status === 'ACTIVE' ? 'Betrieb freigeschaltet.' : 'Betrieb gesperrt, alle Sitzungen beendet.' }
}

export async function resendOwnerInviteAction(tenantId: string, _prev: ActionState): Promise<ActionState> {
  await requirePlatformAdmin()
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  const owner = tenant ? await db.user.findFirst({ where: { tenantId, role: 'OWNER', passwordHash: null } }) : null
  if (!tenant || !owner) return { error: 'Keine offene Einladung vorhanden.' }
  const token = await createAuthToken('INVITE', { userId: owner.id })
  const link = tenantUrl(tenant, `/admin/einladung/${token}`)
  await sendInviteEmail(tenant, owner.email, 'Das Plattform-Team', link).catch((e) => console.error(e))
  return { ok: true, message: 'Neue Einladung erstellt.', data: { inviteLink: link } }
}

/**
 * Löscht einen Betrieb mit allen Daten endgültig (Vertragsende, Art. 28 Abs. 3 lit. g DSGVO).
 * Nur für gesperrte Betriebe; Bestätigung durch Eingabe der Subdomain.
 */
export async function deleteTenantAction(tenantId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePlatformAdmin()
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return { error: 'Betrieb nicht gefunden.' }
  if (tenant.status !== 'SUSPENDED') return { error: 'Bitte den Betrieb zuerst sperren und den Datenexport abwarten.' }
  if (String(formData.get('bestaetigung') ?? '').trim() !== tenant.slug) return { error: `Bitte zur Bestätigung „${tenant.slug}“ eingeben.` }
  await db.tenant.delete({ where: { id: tenant.id } })
  await audit({ actorType: 'PLATFORM_ADMIN', actorId: admin.id, action: 'tenant.status', detail: `Betrieb ${tenant.slug} endgültig gelöscht` })
  redirect(platformPath('/betriebe'))
}
