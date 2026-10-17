'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTenant, tenantUrl } from '@/lib/tenant'
import { checkLogin, checkSecondFactor, loginErrorMessage } from '@/lib/auth/flows'
import { createSession, destroySession, markSessionMfaVerified, readStaffSession, revokeOtherSessions } from '@/lib/auth/session'
import { hashPassword, passwordSchema } from '@/lib/auth/password'
import { createAuthToken, findValidAuthToken, markAuthTokenUsed } from '@/lib/auth/tokens'
import { sendPasswordResetEmail } from '@/lib/notifications/auth-emails'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'
import { audit } from '@/lib/audit'
import { requireStaff } from '@/lib/auth/guards'
import { formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

const loginSchema = z.object({
  email: z.email({ error: 'Bitte gib deine E-Mail-Adresse ein.' }).max(200),
  password: z.string({ error: 'Bitte gib dein Passwort ein.' }).min(1, 'Bitte gib dein Passwort ein.').max(200),
})

export async function staffLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  const parsed = loginSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe deine Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const email = parsed.data.email.toLowerCase()
  const user = await db.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
  const result = await checkLogin('user', tenant.id, email, user && user.active ? user : null, parsed.data.password)
  if (result !== 'ok' || !user) {
    if (user) await audit({ tenantId: tenant.id, actorType: 'USER', actorId: user.id, action: 'auth.login_failed' })
    return { error: loginErrorMessage(result, false) }
  }
  await createSession('staff', { userId: user.id, tenantId: tenant.id }, !user.totpEnabledAt)
  if (user.totpEnabledAt) redirect('/admin/login/2fa')
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit({ tenantId: tenant.id, actorType: 'USER', actorId: user.id, action: 'auth.login' })
  redirect('/admin')
}

export async function staffSecondFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  const session = await readStaffSession()
  if (!session || session.tenantId !== tenant.id) redirect('/admin/login')
  const code = String(formData.get('code') ?? '').trim()
  if (!code) return { error: 'Bitte gib den Code ein.' }
  if (!(await checkSecondFactor('user', session.user, code))) return { error: 'Der Code ist ungültig oder abgelaufen.' }
  await markSessionMfaVerified('staff')
  await db.user.update({ where: { id: session.user.id }, data: { lastLoginAt: new Date() } })
  await audit({ tenantId: tenant.id, actorType: 'USER', actorId: session.user.id, action: 'auth.login' })
  redirect('/admin')
}

export async function staffLogoutAction() {
  const session = await readStaffSession()
  if (session) await audit({ tenantId: session.tenantId, actorType: 'USER', actorId: session.user.id, action: 'auth.logout' })
  await destroySession('staff')
  redirect('/admin/login')
}

export async function staffRequestResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const ok: ActionState = { ok: true, message: 'Wenn ein Konto mit dieser Adresse existiert, haben wir dir einen Link geschickt.' }
  if (!z.email().safeParse(email).success) return { error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  const limit = rateLimit(`reset:${await clientIp()}`, 5, 15 * 60 * 1000)
  if (!limit.ok) return ok
  const user = await db.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
  if (user?.active && user.passwordHash) {
    const token = await createAuthToken('PASSWORD_RESET', { userId: user.id })
    await sendPasswordResetEmail(tenant, email, tenantUrl(tenant, `/admin/passwort-neu/${token}`)).catch((e) => console.error('Reset-Mail fehlgeschlagen', e))
  }
  return ok
}

const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Die Passwörter stimmen nicht überein.' })

export async function staffResetPasswordAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  const record = await findValidAuthToken('PASSWORD_RESET', token)
  const user = record?.userId ? await db.user.findFirst({ where: { id: record.userId, tenantId: tenant.id, active: true } }) : null
  if (!record || !user) return { error: 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.' }
  const parsed = newPasswordSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe deine Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password), failedLogins: 0, lockedUntil: null } })
  await markAuthTokenUsed(record.id)
  await db.session.deleteMany({ where: { userId: user.id } })
  await audit({ tenantId: tenant.id, actorType: 'USER', actorId: user.id, action: 'auth.password_reset' })
  redirect('/admin/login?hinweis=passwort-neu')
}

export async function acceptInviteAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  const record = await findValidAuthToken('INVITE', token)
  const user = record?.userId ? await db.user.findFirst({ where: { id: record.userId, tenantId: tenant.id, active: true } }) : null
  if (!record || !user) return { error: 'Die Einladung ist ungültig oder abgelaufen. Bitte lass dich erneut einladen.' }
  const parsed = newPasswordSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe deine Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password), lastLoginAt: new Date() } })
  await markAuthTokenUsed(record.id)
  await createSession('staff', { userId: user.id, tenantId: tenant.id }, true)
  await audit({ tenantId: tenant.id, actorType: 'USER', actorId: user.id, action: 'auth.login', detail: 'Einladung angenommen' })
  redirect(user.role === 'OWNER' ? '/admin?willkommen=1' : '/admin')
}

export async function revokeOwnSessionsAction(): Promise<ActionState> {
  const ctx = await requireStaff({ allowMissing2fa: true })
  await revokeOtherSessions('staff', { userId: ctx.user.id })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'auth.sessions_revoked' })
  return { ok: true, message: 'Alle anderen Geräte wurden abgemeldet.' }
}
