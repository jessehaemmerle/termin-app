import { decryptOrNull } from '../crypto'
import { formatDateLong, formatDateShort, formatDayString, formatTime } from '../format'
import { localDate } from '../time'
import { formatPhone } from '../phone'
import { tenantUrl } from '../urls'
import { renderEmail, type EmailBlock } from './email-layout'
import type { WhatsappTemplateKind } from './whatsapp'
import type { Booking, Customer, NotificationType, Service, Staff, Tenant, WaitlistEntry, GroupSession } from '@/generated/prisma/client'

// Erzeugt Nachrichteninhalte zum Versandzeitpunkt aus den aktuellen Daten.

export type BookingContext = Booking & { service: Service; staff: Staff | null; customer: Customer | null }

function footer(tenant: Tenant) {
  const address = [tenant.street, [tenant.postalCode, tenant.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [
    `${tenant.legalName || tenant.name}${address ? `, ${address}` : ''}`,
    'Sie erhalten diese Nachricht, weil Sie bei uns einen Termin vereinbart haben. Werbung senden wir nicht.',
    `Datenschutz: ${tenantUrl(tenant, '/datenschutz')}`,
  ].join('\n')
}

function facts(tenant: Tenant, b: BookingContext): EmailBlock {
  const tz = tenant.timezone
  const rows: [string, string][] = [
    ['Leistung', b.service.name],
    ['Datum', formatDateLong(b.startsAt, tz)],
    ['Uhrzeit', `${formatTime(b.startsAt, tz)} bis ${formatTime(b.endsAt, tz)} Uhr`],
  ]
  if (b.staff && !b.groupSessionId) rows.push(['Bei', b.staff.name])
  if (tenant.street) rows.push(['Adresse', `${tenant.street}, ${tenant.postalCode ?? ''} ${tenant.city ?? ''}`.trim()])
  return { type: 'facts', rows }
}

export function manageLink(tenant: Tenant, booking: Booking): string | null {
  const token = decryptOrNull(booking.manageTokenEnc)
  return token ? tenantUrl(tenant, `/termin/${token}`) : null
}

export function renderCustomerEmail(type: NotificationType, tenant: Tenant, b: BookingContext) {
  const manage = manageLink(tenant, b)
  const rebook = tenantUrl(tenant, '/buchen')
  const name = b.customer?.name.split(' ')[0] ?? ''
  const greeting: EmailBlock = { type: 'p', text: `Guten Tag ${name},`.trim() }
  const manageButton: EmailBlock[] = manage ? [{ type: 'button', label: 'Termin ansehen oder absagen', url: manage }] : []
  const deadline: EmailBlock = {
    type: 'small',
    text: `Bitte sagen Sie ab, falls Sie verhindert sind – online bis ${tenant.cancellationDeadlineHours} Stunden vor dem Termin, danach telefonisch${tenant.phone ? ` unter ${formatPhone(tenant.phone)}` : ''}.`,
  }
  const when = `${formatDateShort(b.startsAt, tenant.timezone)}, ${formatTime(b.startsAt, tenant.timezone)} Uhr`

  let content: { subject: string; heading: string; blocks: EmailBlock[] } | null = null
  switch (type) {
    case 'BOOKING_RECEIVED':
      content = {
        subject: `Ihre Terminanfrage bei ${tenant.name}`,
        heading: 'Wir haben Ihre Anfrage erhalten',
        blocks: [
          greeting,
          { type: 'p', text: 'danke für Ihre Anfrage. Wir prüfen sie und bestätigen den Termin so schnell wie möglich.' },
          facts(tenant, b),
          ...(manage ? [{ type: 'button', label: 'Anfrage ansehen', url: manage } as EmailBlock] : []),
        ],
      }
      break
    case 'BOOKING_CONFIRMED':
      content = {
        subject: `Termin bestätigt: ${when}`,
        heading: 'Ihr Termin ist bestätigt',
        blocks: [greeting, { type: 'p', text: `wir freuen uns auf Sie bei ${tenant.name}.` }, facts(tenant, b), ...manageButton, deadline],
      }
      break
    case 'BOOKING_RESCHEDULED':
      content = {
        subject: `Termin verschoben: ${when}`,
        heading: 'Ihr Termin wurde verschoben',
        blocks: [greeting, { type: 'p', text: 'Ihr Termin hat eine neue Zeit. Passt sie nicht, sagen Sie bitte ab oder melden Sie sich bei uns.' }, facts(tenant, b), ...manageButton],
      }
      break
    case 'BOOKING_REMINDER':
      content = {
        subject: `Erinnerung: ${b.service.name} am ${when}`,
        heading: 'Erinnerung an Ihren Termin',
        blocks: [greeting, facts(tenant, b), ...manageButton, deadline],
      }
      break
    case 'BOOKING_CANCELLED':
      content = {
        subject: `Termin abgesagt: ${when}`,
        heading: 'Ihr Termin ist abgesagt',
        blocks: [
          greeting,
          {
            type: 'p',
            text: b.status === 'CANCELLED_BY_CUSTOMER' ? 'wie gewünscht haben wir Ihren Termin abgesagt.' : 'leider müssen wir Ihren Termin absagen. Bitte entschuldigen Sie die Unannehmlichkeiten.',
          },
          facts(tenant, b),
          { type: 'button', label: 'Neuen Termin buchen', url: rebook },
        ],
      }
      break
    case 'BOOKING_DECLINED':
      content = {
        subject: `Ihre Terminanfrage bei ${tenant.name}`,
        heading: 'Termin leider nicht möglich',
        blocks: [
          greeting,
          { type: 'p', text: 'leider können wir Ihre Anfrage für diesen Zeitpunkt nicht bestätigen. Bitte wählen Sie einen anderen Termin.' },
          facts(tenant, b),
          { type: 'button', label: 'Anderen Termin wählen', url: rebook },
        ],
      }
      break
  }
  return content ? renderEmail({ ...content, footer: footer(tenant) }, tenant.primaryColor) : null
}

export function customerWhatsapp(type: NotificationType, tenant: Tenant, b: BookingContext): { kind: WhatsappTemplateKind; params: string[] } | null {
  const tz = tenant.timezone
  const date = formatDateLong(b.startsAt, tz)
  const time = formatTime(b.startsAt, tz)
  const manage = manageLink(tenant, b) ?? tenantUrl(tenant, '/')
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_RESCHEDULED':
      return { kind: 'confirmation', params: [b.service.name, date, time, manage] }
    case 'BOOKING_REMINDER':
      return { kind: 'reminder', params: [b.service.name, date, time, manage] }
    case 'BOOKING_CANCELLED':
    case 'BOOKING_DECLINED':
      return { kind: 'cancellation', params: [b.service.name, date, time, tenantUrl(tenant, '/buchen')] }
    default:
      return null
  }
}

export function renderStaffEmail(type: NotificationType, tenant: Tenant, b: BookingContext) {
  const tz = tenant.timezone
  const when = `${formatDateShort(b.startsAt, tz)}, ${formatTime(b.startsAt, tz)} Uhr`
  const isNew = type === 'STAFF_NEW_BOOKING'
  const rows: [string, string][] = [['Leistung', b.service.name], ['Wann', when]]
  if (b.staff) rows.push(['Bei', b.staff.name])
  if (b.customer) rows.push(['Kund:in', b.customer.name])
  return renderEmail(
    {
      subject: `${isNew ? (b.status === 'PENDING' ? 'Neue Anfrage' : 'Neue Buchung') : 'Absage'}: ${b.service.name}, ${when}`,
      heading: isNew ? (b.status === 'PENDING' ? 'Neue Terminanfrage – bitte bestätigen' : 'Neue Online-Buchung') : 'Ein Termin wurde abgesagt',
      blocks: [
        { type: 'facts', rows },
        { type: 'button', label: 'In der Verwaltung öffnen', url: tenantUrl(tenant, b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`) },
        { type: 'small', text: 'Diese Benachrichtigung kannst du unter Einstellungen > Buchungsregeln abschalten.' },
      ],
      footer: tenant.name,
    },
    tenant.primaryColor,
  )
}

/** Push-Inhalt ohne Namen von Kund:innen (Sperrbildschirm!). */
export function staffPush(type: NotificationType, tenant: Tenant, b: BookingContext) {
  const tz = tenant.timezone
  const when = `${formatDateShort(b.startsAt, tz)} ${formatTime(b.startsAt, tz)}`
  const isNew = type === 'STAFF_NEW_BOOKING'
  return {
    title: isNew ? (b.status === 'PENDING' ? 'Neue Terminanfrage' : 'Neue Buchung') : 'Termin abgesagt',
    body: `${when}: ${b.service.name}${b.staff ? ` (${b.staff.name})` : ''}`,
    url: b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`,
    tag: `booking-${b.id}`,
  }
}

export type WaitlistContext = WaitlistEntry & { customer: Customer; service: Service; groupSession: GroupSession | null }

function waitlistTarget(tenant: Tenant, e: WaitlistContext) {
  if (e.groupSession) return { url: tenantUrl(tenant, `/kurse/${e.groupSession.id}`), date: formatDateLong(e.groupSession.startsAt, tenant.timezone) }
  const date = e.date ?? localDate(new Date(), tenant.timezone)
  return {
    url: tenantUrl(tenant, `/buchen?leistung=${e.serviceId}&datum=${date}&person=${e.staffId ?? 'any'}`),
    date: formatDayString(date),
  }
}

export function renderWaitlistEmail(tenant: Tenant, e: WaitlistContext) {
  const target = waitlistTarget(tenant, e)
  const leave = decryptOrNull(e.tokenEnc)
  const blocks: EmailBlock[] = [
    { type: 'p', text: `Guten Tag ${e.customer.name.split(' ')[0]},` },
    { type: 'p', text: `für ${e.service.name} am ${target.date} ist etwas frei geworden. Wer zuerst bucht, erhält den Termin.` },
    { type: 'button', label: 'Jetzt buchen', url: target.url },
  ]
  if (leave) blocks.push({ type: 'small', text: `Von der Warteliste austragen: ${tenantUrl(tenant, `/warteliste/${leave}`)}` })
  return renderEmail({ subject: `Termin frei geworden: ${e.service.name} am ${target.date}`, heading: 'Ein Platz ist frei geworden', blocks, footer: footer(tenant) }, tenant.primaryColor)
}

export function waitlistWhatsapp(tenant: Tenant, e: WaitlistContext) {
  const target = waitlistTarget(tenant, e)
  return { kind: 'waitlist' as const, params: [e.service.name, target.date, target.url] }
}
