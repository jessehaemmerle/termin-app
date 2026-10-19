'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { env, platformBase } from '@/lib/env'
import { isValidSlug } from '@/lib/hosts'
import { normalizePhone } from '@/lib/phone'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'
import { renderEmail } from '@/lib/notifications/email-layout'
import { sendMail } from '@/lib/notifications/mailer'
import { platformUrl, tenantUrl } from '@/lib/urls'
import { formObject, zodFieldErrors, type ActionState } from '@/lib/actions'
import { logError } from '@/lib/log'

const requestSchema = z.object({
  betrieb: z.string({ error: 'Bitte den Namen des Betriebs angeben.' }).min(2, 'Bitte den Namen des Betriebs angeben.').max(120),
  name: z.string({ error: 'Bitte Ihren Namen angeben.' }).min(2, 'Bitte Ihren Namen angeben.').max(100),
  email: z.email({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }).max(200),
  telefon: z.string().max(30).optional(),
  branche: z.string().max(80).optional(),
  team: z.enum(['1', '2-5', '6-15', '16+']).optional(),
  nachricht: z.string().max(2000, 'Die Nachricht darf höchstens 2000 Zeichen lang sein.').optional(),
})

const TEAM_LABELS: Record<string, string> = { '1': 'nur ich', '2-5': '2–5 Personen', '6-15': '6–15 Personen', '16+': 'mehr als 15 Personen' }

/** Zugangsanfrage eines Betriebs über die Plattform-Website. */
export async function submitAccessRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formObject(formData)
  // Bot-Schutz ohne Drittanbieter: Honeypot und Mindestbearbeitungszeit
  const renderedAt = Number(raw.t)
  if (raw.website || !Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    return { error: 'Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.' }
  }
  const limit = rateLimit(`access-request:${await clientIp()}`, 5, 60 * 60 * 1000)
  if (!limit.ok) return { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }

  const parsed = requestSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Bitte prüfen Sie Ihre Angaben.', fieldErrors: zodFieldErrors(parsed.error) }
  const d = parsed.data
  const phone = normalizePhone(d.telefon)
  if (d.telefon && !phone) return { error: 'Bitte prüfen Sie Ihre Angaben.', fieldErrors: { telefon: 'Bitte eine gültige Telefonnummer angeben, z. B. +43 664 1234567.' } }

  const request = await db.accessRequest.create({
    data: {
      businessName: d.betrieb,
      contactName: d.name,
      email: d.email.toLowerCase(),
      phone,
      industry: d.branche ?? null,
      teamSize: d.team ? TEAM_LABELS[d.team] : null,
      message: d.nachricht ?? null,
    },
  })

  // Benachrichtigung an den Betreiber (ohne Bestätigungsmail an die angegebene Adresse – kein Spam-Verstärker)
  const e = env()
  if (e.OPERATOR_EMAIL) {
    const mail = renderEmail(
      {
        subject: `Neue Zugangsanfrage: ${d.betrieb}`,
        heading: 'Neue Zugangsanfrage',
        blocks: [
          {
            type: 'facts',
            rows: [
              ['Betrieb', d.betrieb],
              ['Kontakt', d.name],
              ['E-Mail', d.email],
              ...(phone ? [['Telefon', phone] as [string, string]] : []),
              ...(d.branche ? [['Branche', d.branche] as [string, string]] : []),
              ...(d.team ? [['Team', TEAM_LABELS[d.team]] as [string, string]] : []),
            ],
          },
          ...(d.nachricht ? [{ type: 'p' as const, text: d.nachricht }] : []),
          { type: 'button', label: 'Anfragen ansehen', url: platformUrl(`/betriebe/anfragen#${request.id}`) },
        ],
        footer: e.PLATFORM_NAME,
      },
      '#1f5f8b',
    )
    await sendMail({ to: e.OPERATOR_EMAIL, ...mail, replyTo: d.email }).catch((error) => logError('Anfrage-Mail fehlgeschlagen', error))
  }

  return { ok: true, message: 'Danke für Ihre Anfrage! Wir melden uns innerhalb von zwei Werktagen bei Ihnen.' }
}

/** Führt Teammitglieder zur Anmeldeseite ihres Betriebs. */
export async function goToBusinessLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const host = platformBase().hostname
  const input = String(formData.get('adresse') ?? '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  const slug = input.endsWith(`.${host}`) ? input.slice(0, -(host.length + 1)) : input
  if (!isValidSlug(slug)) return { error: 'Bitte die Adresse Ihres Betriebs angeben, z. B. friseur-mayer.' }
  const tenant = await db.tenant.findUnique({ where: { slug }, select: { slug: true, status: true, customDomain: true, customDomainVerifiedAt: true } })
  if (!tenant || tenant.status !== 'ACTIVE') return { error: `Unter ${slug}.${host} gibt es keinen aktiven Betrieb. Bitte prüfen Sie die Schreibweise.` }
  redirect(tenantUrl(tenant, '/admin/login'))
}
