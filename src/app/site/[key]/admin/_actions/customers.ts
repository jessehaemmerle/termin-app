'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { normalizePhone } from '@/lib/phone'
import { eraseCustomer } from '@/lib/privacy/erase'
import { WHATSAPP_CONSENT_VERSION } from '@/lib/legal/consent'
import { audit } from '@/lib/audit'
import { formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

const schema = z.object({
  name: z.string().min(2, 'Bitte den Namen angeben.').max(100),
  email: z.email({ error: 'Ungültige E-Mail-Adresse.' }).max(200).optional(),
  telefon: z.string().max(30).optional(),
  notiz: z.string().max(1000).optional(),
})

export async function updateCustomerAction(customerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'customers.manage' })
  const customer = await db.customer.findFirst({ where: { id: customerId, tenantId: ctx.tenant.id } })
  if (!customer) return { error: 'Kund:in nicht gefunden.' }
  const parsed = schema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const phone = normalizePhone(parsed.data.telefon)
  if (parsed.data.telefon && !phone) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { telefon: 'Ungültige Telefonnummer.' } }
  const email = parsed.data.email?.toLowerCase() ?? null
  if (email && email !== customer.email) {
    const taken = await db.customer.findUnique({ where: { tenantId_email: { tenantId: ctx.tenant.id, email } } })
    if (taken) return { error: 'Diese E-Mail-Adresse gehört bereits zu einer anderen Kund:in.' }
  }
  await db.customer.update({
    where: { id: customer.id },
    data: {
      name: parsed.data.name,
      email,
      phone,
      internalNote: parsed.data.notiz ?? null,
      // Bei geänderter Adresse muss ein Kundenkonto die Adresse erneut bestätigen
      ...(email !== customer.email && customer.passwordHash ? { emailVerifiedAt: null } : {}),
    },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'customer.updated', entityType: 'Customer', entityId: customer.id })
  refresh()
  return { ok: true, message: 'Gespeichert.' }
}

export async function withdrawCustomerWhatsappAction(customerId: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'customers.manage' })
  const customer = await db.customer.findFirst({ where: { id: customerId, tenantId: ctx.tenant.id } })
  if (!customer) return { error: 'Kund:in nicht gefunden.' }
  await db.$transaction([
    db.customer.update({ where: { id: customer.id }, data: { whatsappOptIn: false } }),
    db.booking.updateMany({ where: { customerId: customer.id, startsAt: { gt: new Date() } }, data: { notifyWhatsapp: false } }),
    db.consentRecord.create({ data: { tenantId: ctx.tenant.id, customerId: customer.id, channel: 'WHATSAPP', granted: false, textVersion: WHATSAPP_CONSENT_VERSION, source: 'admin' } }),
    db.notification.updateMany({ where: { channel: 'WHATSAPP', status: 'PENDING', booking: { customerId: customer.id } }, data: { status: 'SKIPPED' } }),
  ])
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'customer.consent', entityType: 'Customer', entityId: customer.id, detail: 'WhatsApp widerrufen' })
  refresh()
  return { ok: true, message: 'WhatsApp-Einwilligung als widerrufen vermerkt.' }
}

export async function eraseCustomerAction(customerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'customers.privacy' })
  if (formData.get('bestaetigung') !== 'LÖSCHEN') return { error: 'Bitte gib zur Bestätigung LÖSCHEN ein.' }
  const ok = await eraseCustomer(ctx.tenant.id, customerId)
  if (!ok) return { error: 'Kund:in nicht gefunden.' }
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'customer.erased', entityType: 'Customer', entityId: customerId })
  redirect('/admin/kunden?geloescht=1')
}
