import { db } from '../db'
import { tenantContext } from '../legal/context'
import type { Tenant } from '@/generated/prisma/client'

/**
 * Auskunft bzw. Datenübertragbarkeit (Art. 15, Art. 20 DSGVO) als JSON.
 * Enthält alle zu einer Person gespeicherten Daten sowie die Pflichtangaben nach Art. 15 Abs. 1.
 * Passwort-Hash und 2FA-Geheimnisse werden aus Sicherheitsgründen nicht ausgegeben.
 */
export async function exportCustomerData(tenant: Tenant, customerId: string) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, tenantId: tenant.id },
    include: {
      bookings: { include: { service: { select: { name: true } }, staff: { select: { name: true } }, notifications: true }, orderBy: { startsAt: 'asc' } },
      consentRecords: { orderBy: { createdAt: 'asc' } },
      waitlistEntries: { include: { service: { select: { name: true } } } },
    },
  })
  if (!customer) return null
  const t = tenantContext(tenant)

  return {
    erstelltAm: new Date().toISOString(),
    verantwortlicher: { name: t.legalName || t.name, anschrift: `${t.street ?? ''}, ${t.postalCode ?? ''} ${t.city ?? ''}`.trim(), datenschutzKontakt: t.privacyEmail },
    hinweise: {
      zwecke: ['Vereinbarung und Durchführung von Terminen', 'Benachrichtigungen zu Terminen', ...(customer.passwordHash ? ['Kundenkonto'] : [])],
      rechtsgrundlagen: ['Art. 6 Abs. 1 lit. b DSGVO (Termin, Kundenkonto)', 'Art. 6 Abs. 1 lit. a DSGVO (WhatsApp, nur mit Einwilligung)', 'Art. 6 Abs. 1 lit. f DSGVO (interne Vermerke, Sicherheit)'],
      empfaenger: ['Betreiber der Buchungssoftware (Auftragsverarbeiter)', 'Hosting- und E-Mail-Dienstleister (Auftragsverarbeiter)', ...(tenant.whatsappEnabled ? ['Meta Platforms Ireland Ltd. (nur bei WhatsApp-Einwilligung)'] : [])],
      speicherdauer: `${tenant.retentionMonths} Monate nach dem jeweiligen Termin, danach Anonymisierung`,
      rechte: 'Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit, Widerruf von Einwilligungen; Beschwerde bei der Österreichischen Datenschutzbehörde (www.dsb.gv.at)',
      herkunft: 'Angaben der betroffenen Person bei Buchung oder telefonischer Vereinbarung',
      automatisierteEntscheidungen: 'keine',
    },
    stammdaten: {
      name: customer.name,
      email: customer.email,
      telefon: customer.phone,
      whatsappEinwilligung: customer.whatsappOptIn,
      kundenkonto: !!customer.passwordHash,
      emailBestaetigtAm: customer.emailVerifiedAt,
      zweiFaktorAktiv: !!customer.totpEnabledAt,
      interneNotiz: customer.internalNote,
      angelegtAm: customer.createdAt,
      letzteAktivitaet: customer.lastActivityAt,
    },
    termine: customer.bookings.map((b) => ({
      leistung: b.service.name,
      bei: b.staff?.name ?? null,
      beginn: b.startsAt,
      ende: b.endsAt,
      status: b.status,
      quelle: b.source,
      nachricht: b.customerNote,
      telefon: b.phone,
      benachrichtigungEmail: b.notifyEmail,
      benachrichtigungWhatsapp: b.notifyWhatsapp,
      gebuchtAm: b.createdAt,
      abgesagtAm: b.cancelledAt,
      versandprotokoll: b.notifications
        .filter((n) => n.userId === null)
        .map((n) => ({ art: n.type, kanal: n.channel, status: n.status, gesendetAm: n.sentAt })),
    })),
    einwilligungen: customer.consentRecords.map((c) => ({ kanal: c.channel, erteilt: c.granted, textversion: c.textVersion, quelle: c.source, zeitpunkt: c.createdAt })),
    warteliste: customer.waitlistEntries.map((w) => ({ leistung: w.service.name, tag: w.date, eingetragenAm: w.createdAt, benachrichtigtAm: w.notifiedAt })),
  }
}
