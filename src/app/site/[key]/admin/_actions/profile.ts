'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/auth/password'
import { revokeOtherSessions } from '@/lib/auth/session'
import { beginTotp, confirmTotp, disableTotp } from '@/lib/auth/two-factor'
import { audit } from '@/lib/audit'
import { formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

const changeSchema = z
  .object({ aktuell: z.string().min(1, 'Bitte das aktuelle Passwort eingeben.'), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Die Passwörter stimmen nicht überein.' })

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ allowMissing2fa: true })
  const parsed = changeSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  if (!ctx.user.passwordHash || !(await verifyPassword(ctx.user.passwordHash, parsed.data.aktuell))) {
    return { error: 'Das aktuelle Passwort ist nicht korrekt.', fieldErrors: { aktuell: 'Nicht korrekt.' } }
  }
  await db.user.update({ where: { id: ctx.user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } })
  await revokeOtherSessions('staff', { userId: ctx.user.id })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'auth.password_changed' })
  return { ok: true, message: 'Passwort geändert. Andere Geräte wurden abgemeldet.' }
}

export async function beginTotpAction(_prev: ActionState): Promise<ActionState> {
  const ctx = await requireStaff({ allowMissing2fa: true })
  if (ctx.user.totpEnabledAt) return { error: 'Die Zwei-Faktor-Anmeldung ist bereits aktiv.' }
  await beginTotp('user', ctx.user.id)
  refresh()
  return { ok: true }
}

export async function confirmTotpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ allowMissing2fa: true })
  const codes = await confirmTotp('user', ctx.user.id, ctx.user.totpSecretEnc, String(formData.get('code') ?? ''))
  if (!codes) return { error: 'Der Code stimmt nicht. Prüfe die Uhrzeit deines Telefons und versuche es erneut.' }
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'auth.2fa_enabled' })
  return { ok: true, message: 'Zwei-Faktor-Anmeldung aktiviert. Bewahre die Wiederherstellungscodes sicher auf – sie werden nur jetzt angezeigt.', data: { codes } }
}

export async function disableTotpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ allowMissing2fa: true })
  const password = String(formData.get('passwort') ?? '')
  if (!ctx.user.passwordHash || !(await verifyPassword(ctx.user.passwordHash, password))) return { error: 'Das Passwort ist nicht korrekt.' }
  if (ctx.tenant.require2faForStaff) return { error: 'In deinem Betrieb ist die Zwei-Faktor-Anmeldung verpflichtend.' }
  await disableTotp('user', ctx.user.id)
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'auth.2fa_disabled' })
  refresh()
  return { ok: true, message: 'Zwei-Faktor-Anmeldung deaktiviert.' }
}
