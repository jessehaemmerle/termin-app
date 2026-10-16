import { z } from 'zod'
import { checkbox, formObject, zodFieldErrors, type ActionState } from '../actions'
import { normalizePhone } from '../phone'
import { rateLimit } from '../rate-limit'
import { clientIp } from '../request'
import { getCustomerContext } from '../auth/guards'
import type { CustomerInput } from './service'
import type { Tenant } from '@/generated/prisma/client'

// Gemeinsame Validierung der öffentlichen Formulare (Buchung, Kurs, Warteliste).

const contactSchema = z.object({
  name: z.string({ error: 'Bitte geben Sie Ihren Namen an.' }).min(2, 'Bitte geben Sie Ihren Namen an.').max(100),
  email: z.email({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' }).max(200),
  telefon: z.string().max(30).optional(),
  notiz: z.string().max(500, 'Die Nachricht darf höchstens 500 Zeichen lang sein.').optional(),
})

export type ParsedContact = {
  customer: CustomerInput
  note: string | null
  notifyWhatsapp: boolean
}

export async function parsePublicContact(
  tenant: Tenant,
  formData: FormData,
  limitKey: string,
): Promise<{ ok: true; value: ParsedContact } | { ok: false; state: ActionState }> {
  const raw = formObject(formData)

  // Bot-Schutz ohne Drittanbieter: Honeypot, Mindestbearbeitungszeit, Rate-Limit
  const renderedAt = Number(raw.t)
  if (raw.website || (Number.isFinite(renderedAt) && Date.now() - renderedAt < 2000)) {
    return { ok: false, state: { error: 'Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.' } }
  }
  const ip = await clientIp()
  const limit = rateLimit(`${limitKey}:${tenant.id}:${ip}`, 10, 60 * 60 * 1000)
  if (!limit.ok) {
    return { ok: false, state: { error: `Zu viele Anfragen. Bitte versuchen Sie es in ${Math.ceil(limit.retryAfterSeconds / 60)} Minuten erneut.` } }
  }

  const session = await getCustomerContext()
  const parsed = contactSchema.safeParse(
    session ? { ...raw, name: session.customer.name, email: session.customer.email ?? '' } : raw,
  )
  if (!parsed.success) return { ok: false, state: { error: 'Bitte prüfen Sie Ihre Angaben.', fieldErrors: zodFieldErrors(parsed.error) } }

  const notifyWhatsapp = tenant.whatsappEnabled && checkbox(formData, 'whatsapp')
  const phone = normalizePhone(parsed.data.telefon)
  if (parsed.data.telefon && !phone) {
    return { ok: false, state: { error: 'Bitte prüfen Sie Ihre Angaben.', fieldErrors: { telefon: 'Bitte geben Sie eine gültige Telefonnummer an, z. B. +43 664 1234567.' } } }
  }
  if ((tenant.requirePhone || notifyWhatsapp) && !phone) {
    return {
      ok: false,
      state: {
        error: 'Bitte prüfen Sie Ihre Angaben.',
        fieldErrors: { telefon: notifyWhatsapp ? 'Für WhatsApp-Nachrichten benötigen wir Ihre Mobilnummer.' : 'Bitte geben Sie Ihre Telefonnummer an.' },
      },
    }
  }

  const customer: CustomerInput = session
    ? { kind: 'account', customerId: session.customer.id, phone }
    : { kind: 'guest', name: parsed.data.name, email: parsed.data.email, phone }

  return { ok: true, value: { customer, note: parsed.data.notiz ?? null, notifyWhatsapp } }
}
