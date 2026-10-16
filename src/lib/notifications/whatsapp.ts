import { env } from '../env'
import { decryptOrNull } from '../crypto'
import { waMeNumber } from '../phone'
import type { Tenant } from '@/generated/prisma/client'

// WhatsApp Business Platform – Cloud API (Graph API).
// Außerhalb des 24-Stunden-Kundenservicefensters dürfen Unternehmen nur
// vorab von Meta genehmigte Vorlagen (Kategorie „Utility“) senden. Die Vorlagen
// legt jeder Betrieb in seinem WhatsApp Manager an (siehe docs/whatsapp.md).
//
// Parameter der Vorlagen (Reihenfolge = {{1}}, {{2}}, …):
//   Bestätigung / Erinnerung: Leistung, Datum, Uhrzeit, Link zur Terminverwaltung
//   Absage:                   Leistung, Datum, Uhrzeit, Link zur Neubuchung
//   Warteliste:               Leistung, Datum, Link zum Buchen

export type WhatsappTemplateKind = 'confirmation' | 'reminder' | 'cancellation' | 'waitlist'

export class WhatsappError extends Error {
  constructor(
    message: string,
    public permanent = false,
  ) {
    super(message)
  }
}

export function templateName(tenant: Tenant, kind: WhatsappTemplateKind): string {
  switch (kind) {
    case 'confirmation':
      return tenant.whatsappTplConfirmation
    case 'reminder':
      return tenant.whatsappTplReminder
    case 'cancellation':
      return tenant.whatsappTplCancellation
    case 'waitlist':
      return tenant.whatsappTplWaitlist
  }
}

/** Maskiert Telefonnummern für Logs (Datenminimierung). */
export function maskPhone(e164: string) {
  return e164.length > 6 ? `${e164.slice(0, 4)}…${e164.slice(-2)}` : '…'
}

export async function sendWhatsappTemplate(tenant: Tenant, to: string, kind: WhatsappTemplateKind, parameters: string[]): Promise<string> {
  if (!tenant.whatsappEnabled || !tenant.whatsappPhoneNumberId) throw new WhatsappError('WhatsApp ist für diesen Betrieb nicht eingerichtet.', true)
  const token = decryptOrNull(tenant.whatsappAccessTokenEnc)
  if (!token) throw new WhatsappError('Kein gültiger WhatsApp-Zugangsschlüssel hinterlegt.', true)
  const name = templateName(tenant, kind)
  const e = env()

  if (e.WHATSAPP_DRY_RUN) {
    console.info(`[WhatsApp Testmodus] Vorlage "${name}" an ${maskPhone(to)} (${parameters.length} Parameter) – nicht gesendet`)
    return `dry-run-${Date.now()}`
  }

  const url = `https://graph.facebook.com/${e.WHATSAPP_GRAPH_VERSION}/${encodeURIComponent(tenant.whatsappPhoneNumberId)}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: waMeNumber(to),
      type: 'template',
      template: {
        name,
        language: { code: tenant.whatsappTemplateLang || 'de' },
        components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) }],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  })
  const body = (await response.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } }
  if (!response.ok || !body.messages?.[0]?.id) {
    const code = body.error?.code
    const message = body.error?.message ?? `HTTP ${response.status}`
    // 4xx (außer 429) sind dauerhafte Fehler: falsche Vorlage, ungültige Nummer, fehlende Berechtigung
    const permanent = response.status >= 400 && response.status < 500 && response.status !== 429
    throw new WhatsappError(`WhatsApp-Fehler${code ? ` ${code}` : ''}: ${message}`.slice(0, 300), permanent)
  }
  return body.messages[0].id
}
