'use server'

import { refresh } from 'next/cache'
import { resolveTxt } from 'node:dns/promises'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { encrypt } from '@/lib/crypto'
import { isHexColor } from '@/lib/color'
import { isValidHostname } from '@/lib/hosts'
import { platformBase } from '@/lib/env'
import { normalizePhone } from '@/lib/phone'
import { MAX_LOGO_BYTES, normalizeLogo, regenerateIcons } from '@/lib/branding'
import { sendMail, verifyTenantSmtp } from '@/lib/notifications/mailer'
import { renderEmail } from '@/lib/notifications/email-layout'
import { sendWhatsappTemplate, WhatsappError } from '@/lib/notifications/whatsapp'
import { DPA_VERSION, TERMS_VERSION } from '@/lib/legal/consent'
import { audit } from '@/lib/audit'
import { checkbox, formObject, zodFieldErrors, type ActionState } from '@/lib/actions'

async function owner() {
  return requireStaff({ permission: 'settings.manage' })
}

function done(message = 'Gespeichert.'): ActionState {
  refresh()
  return { ok: true, message }
}

// ---------- Allgemein ----------

const generalSchema = z.object({
  name: z.string({ error: 'Bitte den Namen angeben.' }).min(2, 'Bitte den Namen angeben.').max(80),
  tagline: z.string().max(140).optional(),
  beschreibung: z.string().max(1500).optional(),
  telefon: z.string().max(30).optional(),
  email: z.email({ error: 'Ungültige E-Mail-Adresse.' }).max(200).optional(),
  whatsapp: z.string().max(30).optional(),
})

export async function saveGeneralAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const parsed = generalSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const phone = normalizePhone(parsed.data.telefon)
  if (parsed.data.telefon && !phone) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { telefon: 'Ungültige Telefonnummer.' } }
  const wa = normalizePhone(parsed.data.whatsapp)
  if (parsed.data.whatsapp && !wa) return { error: 'Bitte prüfe die Angaben.', fieldErrors: { whatsapp: 'Ungültige Telefonnummer.' } }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: { name: parsed.data.name, tagline: parsed.data.tagline ?? null, description: parsed.data.beschreibung ?? null, phone, email: parsed.data.email ?? null, whatsappDisplayNumber: wa },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', detail: 'Allgemein' })
  return done()
}

// ---------- Buchungsregeln ----------

const rulesSchema = z.object({
  raster: z.coerce.number().int().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), 'Ungültiges Raster.'),
  vorlauf: z.coerce.number().int().min(0).max(10080),
  horizont: z.coerce.number().int().min(1, 'Mindestens 1 Tag.').max(365, 'Höchstens 365 Tage.'),
  stornofrist: z.coerce.number().int().min(0).max(336),
  erinnerung: z.coerce.number().int().min(0).max(72),
})

export async function saveBookingRulesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const parsed = rulesSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: {
      slotIntervalMinutes: parsed.data.raster,
      minLeadMinutes: parsed.data.vorlauf,
      maxAdvanceDays: parsed.data.horizont,
      cancellationDeadlineHours: parsed.data.stornofrist,
      reminderHoursBefore: parsed.data.erinnerung,
      requireApproval: checkbox(formData, 'freigabe'),
      requirePhone: checkbox(formData, 'telefonPflicht'),
      allowCustomerAccounts: checkbox(formData, 'kundenkonten'),
      waitlistEnabled: checkbox(formData, 'warteliste'),
      notifyStaffByEmail: checkbox(formData, 'teamMail'),
      require2faForStaff: checkbox(formData, 'teamZweiFaktor'),
    },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', detail: 'Buchungsregeln' })
  return done()
}

// ---------- Darstellung ----------

export async function saveBrandingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const color = String(formData.get('farbe') ?? '')
  if (!isHexColor(color)) return { error: 'Bitte eine gültige Farbe wählen.' }
  const file = formData.get('logo')
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LOGO_BYTES) return { error: 'Das Logo darf höchstens 1 MB groß sein.' }
    try {
      const logo = await normalizeLogo(Buffer.from(await file.arrayBuffer()))
      await db.tenantAsset.upsert({
        where: { tenantId_kind: { tenantId: ctx.tenant.id, kind: 'LOGO' } },
        create: { tenantId: ctx.tenant.id, kind: 'LOGO', mime: 'image/png', data: new Uint8Array(logo) },
        update: { mime: 'image/png', data: new Uint8Array(logo) },
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Das Logo konnte nicht verarbeitet werden.' }
    }
  }
  if (checkbox(formData, 'logoEntfernen')) await db.tenantAsset.deleteMany({ where: { tenantId: ctx.tenant.id, kind: 'LOGO' } })
  const tenant = await db.tenant.update({ where: { id: ctx.tenant.id }, data: { primaryColor: color.toLowerCase() } })
  await regenerateIcons(tenant)
  return done('Darstellung gespeichert. App-Symbole wurden neu erzeugt.')
}

// ---------- Rechtliches (Impressum) ----------

const legalSchema = z.object({
  legalName: z.string({ error: 'Pflichtangabe nach § 5 ECG.' }).min(2, 'Pflichtangabe nach § 5 ECG.').max(150),
  legalForm: z.string().max(80).optional(),
  street: z.string({ error: 'Pflichtangabe nach § 5 ECG.' }).min(3, 'Pflichtangabe nach § 5 ECG.').max(150),
  postalCode: z.string({ error: 'Pflichtangabe.' }).min(4, 'Pflichtangabe.').max(10),
  city: z.string({ error: 'Pflichtangabe.' }).min(2, 'Pflichtangabe.').max(80),
  country: z.string().max(60).default('Österreich'),
  uidNumber: z.string().max(20).optional(),
  companyRegisterNumber: z.string().max(30).optional(),
  companyRegisterCourt: z.string().max(120).optional(),
  businessPurpose: z.string({ error: 'Pflichtangabe nach § 25 MedienG.' }).min(3, 'Pflichtangabe nach § 25 MedienG.').max(200),
  supervisoryAuthority: z.string().max(150).optional(),
  chamber: z.string().max(150).optional(),
  professionTitle: z.string().max(120).optional(),
  tradeRegulations: z.string().max(200).optional(),
  privacyContactEmail: z.email({ error: 'Ungültige E-Mail-Adresse.' }).max(200).optional(),
  dpoName: z.string().max(120).optional(),
  dpoEmail: z.email({ error: 'Ungültige E-Mail-Adresse.' }).max(200).optional(),
  additionalTerms: z.string().max(3000).optional(),
})

export async function saveLegalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const parsed = legalSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const d = parsed.data
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: {
      legalName: d.legalName,
      legalForm: d.legalForm ?? null,
      street: d.street,
      postalCode: d.postalCode,
      city: d.city,
      country: d.country,
      uidNumber: d.uidNumber ?? null,
      companyRegisterNumber: d.companyRegisterNumber ?? null,
      companyRegisterCourt: d.companyRegisterCourt ?? null,
      businessPurpose: d.businessPurpose,
      supervisoryAuthority: d.supervisoryAuthority ?? null,
      chamber: d.chamber ?? null,
      professionTitle: d.professionTitle ?? null,
      tradeRegulations: d.tradeRegulations ?? null,
      privacyContactEmail: d.privacyContactEmail ?? null,
      dpoName: d.dpoName ?? null,
      dpoEmail: d.dpoEmail ?? null,
      additionalTerms: d.additionalTerms ?? null,
    },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', detail: 'Impressum/Rechtliches' })
  return done()
}

// ---------- Eigener E-Mail-Versand ----------

const smtpSchema = z.object({
  host: z.string({ error: 'Bitte den SMTP-Server angeben.' }).min(3, 'Bitte den SMTP-Server angeben.').max(200).refine(isValidHostname, 'Ungültiger Servername.'),
  port: z.coerce.number().int().min(1).max(65535),
  benutzer: z.string().max(200).optional(),
  passwort: z.string().max(500).optional(),
  absender: z.email({ error: 'Bitte eine gültige Absenderadresse angeben.' }).max(200),
  absenderName: z.string().max(100).optional(),
})

export async function saveSmtpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const parsed = smtpSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: {
      smtpHost: parsed.data.host.toLowerCase(),
      smtpPort: parsed.data.port,
      smtpSecure: checkbox(formData, 'tls'),
      smtpUser: parsed.data.benutzer ?? null,
      ...(parsed.data.passwort ? { smtpPasswordEnc: encrypt(parsed.data.passwort) } : {}),
      smtpFromEmail: parsed.data.absender.toLowerCase(),
      smtpFromName: parsed.data.absenderName ?? null,
    },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.smtp', detail: 'eigener SMTP-Server' })
  return done('Gespeichert. Sende eine Test-E-Mail, um die Verbindung zu prüfen.')
}

export async function clearSmtpAction(_prev: ActionState): Promise<ActionState> {
  const ctx = await owner()
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: { smtpHost: null, smtpPort: null, smtpUser: null, smtpPasswordEnc: null, smtpFromEmail: null, smtpFromName: null },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.smtp', detail: 'zurück auf Plattform-Versand' })
  return done('E-Mails werden wieder über den Versand der Plattform geschickt.')
}

export async function testSmtpAction(_prev: ActionState): Promise<ActionState> {
  const ctx = await owner()
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: ctx.tenant.id } })
  try {
    if (tenant.smtpHost) await verifyTenantSmtp(tenant)
    const mail = renderEmail(
      { subject: `Test-E-Mail von ${tenant.name}`, heading: 'Der E-Mail-Versand funktioniert', blocks: [{ type: 'p', text: 'Diese Nachricht wurde zum Testen des E-Mail-Versands gesendet.' }], footer: tenant.name },
      tenant.primaryColor,
    )
    await sendMail({ to: ctx.user.email, ...mail }, tenant)
  } catch (error) {
    return { error: `Versand fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannter Fehler'}` }
  }
  return { ok: true, message: `Test-E-Mail an ${ctx.user.email} gesendet.` }
}

// ---------- WhatsApp ----------

const templateRe = /^[a-z0-9_]{1,512}$/
const whatsappSchema = z.object({
  phoneNumberId: z.string().regex(/^\d{5,30}$/, 'Die Phone-Number-ID besteht nur aus Ziffern.').optional(),
  token: z.string().max(1000).optional(),
  sprache: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'z. B. de oder de_AT').default('de'),
  tplBestaetigung: z.string().regex(templateRe, 'Nur Kleinbuchstaben, Ziffern und _.'),
  tplErinnerung: z.string().regex(templateRe, 'Nur Kleinbuchstaben, Ziffern und _.'),
  tplAbsage: z.string().regex(templateRe, 'Nur Kleinbuchstaben, Ziffern und _.'),
  tplWarteliste: z.string().regex(templateRe, 'Nur Kleinbuchstaben, Ziffern und _.'),
})

export async function saveWhatsappAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const parsed = whatsappSchema.safeParse(formObject(formData))
  if (!parsed.success) return { error: 'Bitte prüfe die Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const enabled = checkbox(formData, 'aktiv')
  const hasToken = !!parsed.data.token || !!ctx.tenant.whatsappAccessTokenEnc
  if (enabled && (!parsed.data.phoneNumberId || !hasToken)) {
    return { error: 'Zum Aktivieren werden Phone-Number-ID und Zugangsschlüssel benötigt.' }
  }
  if (enabled && !checkbox(formData, 'vertrag')) {
    return { error: 'Bitte bestätige, dass dein Betrieb einen eigenen Vertrag mit Meta hat und die Datenschutzerklärung den WhatsApp-Versand nennt.' }
  }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: {
      whatsappEnabled: enabled,
      whatsappPhoneNumberId: parsed.data.phoneNumberId ?? null,
      ...(parsed.data.token ? { whatsappAccessTokenEnc: encrypt(parsed.data.token) } : {}),
      whatsappTemplateLang: parsed.data.sprache,
      whatsappTplConfirmation: parsed.data.tplBestaetigung,
      whatsappTplReminder: parsed.data.tplErinnerung,
      whatsappTplCancellation: parsed.data.tplAbsage,
      whatsappTplWaitlist: parsed.data.tplWarteliste,
    },
  })
  if (!enabled) {
    // Ohne WhatsApp keine ausstehenden WhatsApp-Nachrichten mehr senden
    await db.notification.updateMany({ where: { tenantId: ctx.tenant.id, channel: 'WHATSAPP', status: 'PENDING' }, data: { status: 'SKIPPED' } })
  }
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.whatsapp', detail: enabled ? 'aktiviert' : 'deaktiviert' })
  return done()
}

export async function testWhatsappAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const to = normalizePhone(String(formData.get('testnummer') ?? ''))
  if (!to) return { error: 'Bitte deine eigene Mobilnummer für den Test angeben.' }
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: ctx.tenant.id } })
  try {
    await sendWhatsappTemplate(tenant, to, 'confirmation', ['Testtermin', 'Montag, 1. Jänner', '10:00', `${platformBase().origin}/`])
  } catch (error) {
    return { error: error instanceof WhatsappError ? error.message : 'Versand fehlgeschlagen.' }
  }
  return { ok: true, message: 'Testnachricht übermittelt. Prüfe dein Telefon.' }
}

// ---------- Eigene Domain ----------

export async function saveDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const domain = String(formData.get('domain') ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!domain) {
    await db.tenant.update({ where: { id: ctx.tenant.id }, data: { customDomain: null, customDomainVerifiedAt: null } })
    return done('Eigene Domain entfernt.')
  }
  if (!isValidHostname(domain)) return { error: 'Bitte eine gültige Domain angeben, z. B. termine.mein-betrieb.at.' }
  const platformHost = platformBase().hostname
  if (domain === platformHost || domain.endsWith(`.${platformHost}`)) return { error: 'Diese Domain gehört zur Plattform.' }
  const taken = await db.tenant.findFirst({ where: { customDomain: domain, NOT: { id: ctx.tenant.id } } })
  if (taken) return { error: 'Diese Domain wird bereits verwendet.' }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: { customDomain: domain, customDomainVerifiedAt: null, domainVerificationToken: randomBytes(16).toString('hex') },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.domain', detail: domain })
  return done('Domain gespeichert. Richte jetzt die DNS-Einträge ein und prüfe sie anschließend.')
}

export async function verifyDomainAction(_prev: ActionState): Promise<ActionState> {
  const ctx = await owner()
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: ctx.tenant.id } })
  if (!tenant.customDomain) return { error: 'Keine eigene Domain hinterlegt.' }
  let records: string[][] = []
  try {
    records = await resolveTxt(`_termin-verify.${tenant.customDomain}`)
  } catch {
    return { error: `Kein TXT-Eintrag für _termin-verify.${tenant.customDomain} gefunden. DNS-Änderungen können bis zu einige Stunden dauern.` }
  }
  if (!records.some((r) => r.join('') === tenant.domainVerificationToken)) {
    return { error: 'Der TXT-Eintrag enthält nicht den erwarteten Prüfwert.' }
  }
  await db.tenant.update({ where: { id: tenant.id }, data: { customDomainVerifiedAt: new Date() } })
  await audit({ tenantId: tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.domain', detail: `${tenant.customDomain} bestätigt` })
  return done('Domain bestätigt. Das TLS-Zertifikat wird beim ersten Aufruf automatisch ausgestellt.')
}

// ---------- Datenschutz ----------

export async function saveRetentionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await owner()
  const months = Number(formData.get('monate'))
  if (!Number.isInteger(months) || months < 3 || months > 36) return { error: 'Bitte einen Wert zwischen 3 und 36 Monaten wählen.' }
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: { retentionMonths: months } })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'settings.updated', detail: `Löschfrist ${months} Monate` })
  return done()
}

// ---------- Auftragsverarbeitungsvertrag ----------

export async function acceptDpaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStaff({ permission: 'settings.manage', allowMissing2fa: true })
  if (ctx.role !== 'OWNER') return { error: 'Nur Inhaber:innen können den Vertrag abschließen.' }
  if (!checkbox(formData, 'avv') || !checkbox(formData, 'nb')) return { error: 'Bitte bestätige beide Punkte.' }
  await db.tenant.update({
    where: { id: ctx.tenant.id },
    data: { dpaAcceptedAt: new Date(), dpaVersion: DPA_VERSION, dpaAcceptedByUserId: ctx.user.id, termsVersion: TERMS_VERSION },
  })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'dpa.accepted', detail: `${DPA_VERSION}, ${TERMS_VERSION}` })
  return done('Vertrag abgeschlossen. Danke!')
}
