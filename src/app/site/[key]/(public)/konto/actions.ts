'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTenant, tenantUrl } from '@/lib/tenant'
import { checkLogin, checkSecondFactor, loginErrorMessage } from '@/lib/auth/flows'
import { createSession, destroySession, markSessionMfaVerified, readCustomerSession, revokeOtherSessions } from '@/lib/auth/session'
import { requireCustomer } from '@/lib/auth/guards'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/auth/password'
import { createAuthToken, findValidAuthToken, markAuthTokenUsed } from '@/lib/auth/tokens'
import { beginTotp, confirmTotp, disableTotp } from '@/lib/auth/two-factor'
import { sendAccountExistsEmail, sendPasswordResetEmail, sendVerifyEmail } from '@/lib/notifications/auth-emails'
import { enqueueStaffNotifications } from '@/lib/notifications/enqueue'
import { eraseCustomer } from '@/lib/privacy/erase'
import { normalizePhone } from '@/lib/phone'
import { WHATSAPP_CONSENT_VERSION } from '@/lib/legal/consent'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'
import { audit } from '@/lib/audit'
import { boundOneOf, checkbox, formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

async function accountsEnabled() {
  const tenant = await requireTenant()
  if (!tenant.allowCustomerAccounts || tenant.status !== 'ACTIVE') redirect('/')
  return tenant
}

const loginSchema = z.object({
  email: z.email({ error: 'Bitte geben Sie Ihre E-Mail-Adresse ein.' }).max(200),
  password: z.string({ error: 'Bitte geben Sie Ihr Passwort ein.' }).min(1, 'Bitte geben Sie Ihr Passwort ein.').max(200),
})

export async function customerLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await accountsEnabled()
  const parsed = loginSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const email = parsed.data.email.toLowerCase()
  const customer = await db.customer.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
  const account = customer?.passwordHash && customer.emailVerifiedAt ? customer : null
  const result = await checkLogin('customer', tenant.id, email, account, parsed.data.password)
  if (result !== 'ok' || !account) return { error: loginErrorMessage(result, true) }
  await createSession('customer', { customerId: account.id, tenantId: tenant.id }, !account.totpEnabledAt)
  await db.customer.update({ where: { id: account.id }, data: { lastActivityAt: new Date() } })
  redirect(account.totpEnabledAt ? '/konto/anmelden/2fa' : '/konto')
}

export async function customerSecondFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await accountsEnabled()
  const session = await readCustomerSession()
  if (!session || session.tenantId !== tenant.id) redirect('/konto/anmelden')
  if (!(await checkSecondFactor('customer', session.customer, String(formData.get('code') ?? '')))) {
    return { error: 'Der Code ist ungültig oder abgelaufen.' }
  }
  await markSessionMfaVerified('customer')
  redirect('/konto')
}

export async function customerLogoutAction() {
  await destroySession('customer')
  redirect('/')
}

const registerSchema = z.object({
  name: z.string({ error: 'Bitte geben Sie Ihren Namen an.' }).min(2, 'Bitte geben Sie Ihren Namen an.').max(100),
  email: z.email({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' }).max(200),
})

/** Registrierung: Das Passwort wird erst nach Bestätigung der E-Mail-Adresse festgelegt. */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await accountsEnabled()
  const parsed = registerSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  if (formData.get('website')) return { error: 'Die Anfrage konnte nicht verarbeitet werden.' }
  const generic: ActionState = { ok: true, message: `Wir haben Ihnen eine E-Mail an ${parsed.data.email} geschickt. Bitte bestätigen Sie darin Ihre Adresse.` }
  const limit = rateLimit(`register:${await clientIp()}`, 5, 60 * 60 * 1000)
  if (!limit.ok) return { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }

  const email = parsed.data.email.toLowerCase()
  let customer = await db.customer.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
  try {
    if (customer?.passwordHash && customer.emailVerifiedAt) {
      await sendAccountExistsEmail(tenant, email, tenantUrl(tenant, '/konto/anmelden'), tenantUrl(tenant, '/konto/passwort-vergessen'))
      return generic
    }
    customer ??= await db.customer.create({ data: { tenantId: tenant.id, name: parsed.data.name, email } })
    const token = await createAuthToken('EMAIL_VERIFY', { customerId: customer.id })
    await sendVerifyEmail(tenant, email, tenantUrl(tenant, `/konto/bestaetigen/${token}`))
  } catch (error) {
    console.error('Registrierungs-E-Mail fehlgeschlagen', error)
    return { error: 'Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' }
  }
  return generic
}

const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Die Passwörter stimmen nicht überein.' })

/** Abschluss der Registrierung bzw. Passwort zurücksetzen. */
export async function setCustomerPasswordAction(purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  boundOneOf(purpose, ['EMAIL_VERIFY', 'PASSWORD_RESET'] as const)
  const tenant = await accountsEnabled()
  const record = await findValidAuthToken(purpose, token)
  const customer = record?.customerId ? await db.customer.findFirst({ where: { id: record.customerId, tenantId: tenant.id } }) : null
  if (!record || !customer) return { error: 'Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.' }
  const parsed = setPasswordSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(parsed.data.password), emailVerifiedAt: customer.emailVerifiedAt ?? new Date(), failedLogins: 0, lockedUntil: null, lastActivityAt: new Date() },
  })
  await markAuthTokenUsed(record.id)
  await db.session.deleteMany({ where: { customerId: customer.id } })
  await createSession('customer', { customerId: customer.id, tenantId: tenant.id }, !customer.totpEnabledAt)
  redirect(customer.totpEnabledAt ? '/konto/anmelden/2fa' : '/konto?willkommen=1')
}

export async function customerRequestResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await accountsEnabled()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!z.email().safeParse(email).success) return { error: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' }
  const ok: ActionState = { ok: true, message: 'Wenn ein Konto mit dieser Adresse existiert, haben wir Ihnen einen Link geschickt.' }
  if (!rateLimit(`reset-c:${await clientIp()}`, 5, 15 * 60 * 1000).ok) return ok
  const customer = await db.customer.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
  if (customer?.passwordHash) {
    const token = await createAuthToken('PASSWORD_RESET', { customerId: customer.id })
    await sendPasswordResetEmail(tenant, email, tenantUrl(tenant, `/konto/passwort-neu/${token}`), true).catch((e) => console.error(e))
  }
  return ok
}

const profileSchema = z.object({
  name: z.string().min(2, 'Bitte geben Sie Ihren Namen an.').max(100),
  telefon: z.string().max(30).optional(),
})

export async function updateCustomerProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenant, customer } = await requireCustomer()
  const parsed = profileSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const phone = normalizePhone(parsed.data.telefon)
  if (parsed.data.telefon && !phone) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: { telefon: 'Ungültige Telefonnummer.' } }
  const whatsapp = tenant.whatsappEnabled && checkbox(formData, 'whatsapp')
  if (whatsapp && !phone) return { error: 'Für WhatsApp-Nachrichten benötigen wir Ihre Mobilnummer.', fieldErrors: { telefon: 'Bitte Mobilnummer angeben.' } }
  await db.customer.update({ where: { id: customer.id }, data: { name: parsed.data.name, phone, whatsappOptIn: whatsapp, lastActivityAt: new Date() } })
  if (tenant.whatsappEnabled && whatsapp !== customer.whatsappOptIn) {
    await db.consentRecord.create({ data: { tenantId: tenant.id, customerId: customer.id, channel: 'WHATSAPP', granted: whatsapp, textVersion: WHATSAPP_CONSENT_VERSION, source: 'account' } })
    await db.booking.updateMany({ where: { customerId: customer.id, startsAt: { gt: new Date() }, status: { in: ['PENDING', 'CONFIRMED'] } }, data: { notifyWhatsapp: whatsapp, ...(whatsapp ? { phone } : {}) } })
    if (!whatsapp) {
      await db.notification.updateMany({ where: { channel: 'WHATSAPP', status: 'PENDING', booking: { customerId: customer.id } }, data: { status: 'SKIPPED' } })
    }
  }
  refresh()
  return { ok: true, message: 'Gespeichert.' }
}

export async function customerChangePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { customer } = await requireCustomer()
  const current = String(formData.get('aktuell') ?? '')
  if (!customer.passwordHash || !(await verifyPassword(customer.passwordHash, current))) return { error: 'Das aktuelle Passwort ist nicht korrekt.' }
  const parsed = setPasswordSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Eingaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.customer.update({ where: { id: customer.id }, data: { passwordHash: await hashPassword(parsed.data.password) } })
  await revokeOtherSessions('customer', { customerId: customer.id })
  return { ok: true, message: 'Passwort geändert. Andere Geräte wurden abgemeldet.' }
}

export async function customerBeginTotpAction(_prev: ActionState): Promise<ActionState> {
  const { customer } = await requireCustomer()
  if (customer.totpEnabledAt) return { error: 'Bereits aktiv.' }
  await beginTotp('customer', customer.id)
  refresh()
  return { ok: true }
}

export async function customerConfirmTotpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { customer } = await requireCustomer()
  const codes = await confirmTotp('customer', customer.id, customer.totpSecretEnc, String(formData.get('code') ?? ''))
  if (!codes) return { error: 'Der Code stimmt nicht.' }
  return { ok: true, message: 'Zwei-Faktor-Anmeldung aktiviert. Bitte bewahren Sie die Wiederherstellungscodes sicher auf.', data: { codes } }
}

export async function customerDisableTotpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { customer } = await requireCustomer()
  if (!customer.passwordHash || !(await verifyPassword(customer.passwordHash, String(formData.get('passwort') ?? '')))) return { error: 'Das Passwort ist nicht korrekt.' }
  await disableTotp('customer', customer.id)
  refresh()
  return { ok: true, message: 'Zwei-Faktor-Anmeldung deaktiviert.' }
}

/** Konto löschen (Art. 17 DSGVO): zukünftige Termine werden abgesagt, alle Daten anonymisiert. */
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenant, customer } = await requireCustomer()
  if (!customer.passwordHash || !(await verifyPassword(customer.passwordHash, String(formData.get('passwort') ?? '')))) return { error: 'Das Passwort ist nicht korrekt.' }
  const future = await db.booking.findMany({ where: { customerId: customer.id, status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { gt: new Date() } } })
  for (const booking of future) await enqueueStaffNotifications(db, tenant, booking, 'STAFF_BOOKING_CANCELLED')
  await eraseCustomer(tenant.id, customer.id)
  await audit({ tenantId: tenant.id, actorType: 'CUSTOMER', actorId: customer.id, action: 'customer.erased', entityType: 'Customer', entityId: customer.id, detail: 'Selbstlöschung des Kundenkontos' })
  await destroySession('customer')
  redirect('/konto/geloescht')
}
