import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff } from '@/lib/auth/guards'
import { bookingScope } from '@/lib/admin/queries'
import { formatDateLong, formatDateTime, formatDuration, formatTime } from '@/lib/format'
import { formatPhone, waMeLink } from '@/lib/phone'
import { localDate } from '@/lib/time'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { DefinitionList, Notice, Sheet, SheetHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'
import {
  approveBookingAction,
  cancelBookingByBusinessAction,
  declineBookingAction,
  rescheduleBookingAction,
  setOutcomeAction,
} from '../../../_actions/bookings'

export const metadata: Metadata = { title: 'Termin' }

const CHANNEL: Record<string, string> = { EMAIL: 'E-Mail', WHATSAPP: 'WhatsApp', PUSH: 'Push' }
const TYPE: Record<string, string> = {
  BOOKING_RECEIVED: 'Anfrage erhalten',
  BOOKING_CONFIRMED: 'Bestätigung',
  BOOKING_DECLINED: 'Ablehnung',
  BOOKING_CANCELLED: 'Absage',
  BOOKING_RESCHEDULED: 'Verschiebung',
  BOOKING_REMINDER: 'Erinnerung',
  STAFF_NEW_BOOKING: 'Info ans Team: neue Buchung',
  STAFF_BOOKING_CANCELLED: 'Info ans Team: Absage',
}
const STATUS: Record<string, string> = { PENDING: 'geplant', PROCESSING: 'wird gesendet', SENT: 'gesendet', FAILED: 'fehlgeschlagen', SKIPPED: 'entfallen' }

export default async function BookingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff()
  const { tenant } = ctx
  const tz = tenant.timezone
  const { id } = await params
  const search = await searchParams
  const booking = await db.booking.findFirst({
    where: { ...bookingScope(ctx), id },
    include: { service: true, staff: true, customer: true, notifications: { where: { userId: null }, orderBy: { createdAt: 'asc' } } },
  })
  if (!booking) notFound()

  const active = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const past = booking.startsAt < new Date()
  const seeAll = can(ctx.role, 'bookings.all')
  const staffOptions = seeAll
    ? await db.staff.findMany({ where: { tenantId: tenant.id, active: true, services: { some: { serviceId: booking.serviceId } } }, orderBy: { sortOrder: 'asc' } })
    : []
  const customer = booking.customer
  const waText = customer
    ? `Hallo ${customer.name.split(' ')[0]}, hier ist ${tenant.name} wegen Ihres Termins am ${formatDateLong(booking.startsAt, tz)} um ${formatTime(booking.startsAt, tz)} Uhr: `
    : ''

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/termine" className="text-sm">Alle Termine</Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{booking.service.name}</h1>
          <StatusBadge status={booking.status} />
        </div>
        <p className="font-figures text-3xl font-semibold text-brand-text mt-2">
          {formatTime(booking.startsAt, tz)}–{formatTime(booking.endsAt, tz)}
        </p>
        <p className="text-lg font-semibold">{formatDateLong(booking.startsAt, tz)}</p>
      </div>

      {search.neu === '1' && <Notice tone="ok" title="Termin eingetragen" role="status" />}

      {booking.status === 'PENDING' && (
        <Notice tone="warn" title="Diese Buchung wartet auf deine Bestätigung">
          <div className="flex flex-wrap gap-2 mt-2">
            <ActionForm action={approveBookingAction.bind(null, booking.id)} className="contents">
              <SubmitButton pendingLabel="Wird bestätigt …">Bestätigen</SubmitButton>
            </ActionForm>
            <ActionForm action={declineBookingAction.bind(null, booking.id)} className="contents">
              <SubmitButton variant="secondary" pendingLabel="Wird abgelehnt …">Ablehnen</SubmitButton>
            </ActionForm>
          </div>
        </Notice>
      )}

      <Sheet>
        <SheetHeader title="Kund:in" />
        {customer ? (
          <>
            <DefinitionList
              items={[
                { term: 'Name', value: can(ctx.role, 'customers.manage') ? <Link href={`/admin/kunden/${customer.id}`}>{customer.name}</Link> : customer.name },
                ...(customer.email ? [{ term: 'E-Mail', value: <a href={`mailto:${customer.email}`}>{customer.email}</a> }] : []),
                ...(booking.phone ? [{ term: 'Telefon', value: <a href={`tel:${booking.phone}`}>{formatPhone(booking.phone)}</a> }] : []),
                ...(booking.customerNote ? [{ term: 'Nachricht', value: <span className="whitespace-pre-line">{booking.customerNote}</span> }] : []),
                { term: 'Benachrichtigung', value: [booking.notifyEmail && customer.email ? 'E-Mail' : null, booking.notifyWhatsapp ? 'WhatsApp (Einwilligung liegt vor)' : null].filter(Boolean).join(', ') || 'keine' },
              ]}
            />
            {booking.phone && (
              <div className="flex flex-wrap items-center gap-2 px-5 pb-5 pt-2">
                <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold no-underline text-ink">
                  <Icon name="phone" /> Anrufen
                </a>
                {customer.whatsappOptIn && (
                  <a href={waMeLink(booking.phone, waText)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold no-underline text-ink">
                    <Icon name="whatsapp" /> Per WhatsApp schreiben
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="px-5 pb-5 text-graphite">Die Kundendaten wurden gelöscht bzw. anonymisiert.</p>
        )}
      </Sheet>

      <Sheet>
        <SheetHeader title="Details" />
        <DefinitionList
          items={[
            { term: 'Leistung', value: `${booking.service.name} (${formatDuration(booking.service.durationMinutes)})` },
            { term: 'Bei', value: booking.staff?.name ?? 'nicht zugeordnet' },
            { term: 'Gebucht', value: `${formatDateTime(booking.createdAt, tz)} (${booking.source === 'ONLINE' ? 'online' : 'durch den Betrieb'})` },
            ...(booking.cancelledAt ? [{ term: 'Abgesagt', value: formatDateTime(booking.cancelledAt, tz) }] : []),
          ]}
        />
      </Sheet>

      {active && !past && !booking.groupSessionId && (
        <Sheet>
          <SheetHeader title="Termin verschieben" description="Die Kundin bzw. der Kunde wird über die neue Zeit informiert." />
          <div className="px-5 pb-5">
            <ActionForm action={rescheduleBookingAction.bind(null, booking.id)} className="grid gap-4 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label htmlFor="datum" className="block font-semibold">Datum</label>
                <input id="datum" name="datum" type="date" required defaultValue={localDate(booking.startsAt, tz)} className="field-control" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="zeit" className="block font-semibold">Uhrzeit</label>
                <input id="zeit" name="zeit" type="time" step={300} required defaultValue={formatTime(booking.startsAt, tz)} className="field-control" />
              </div>
              {staffOptions.length > 1 ? (
                <div className="space-y-1.5">
                  <label htmlFor="person" className="block font-semibold">Person</label>
                  <select id="person" name="person" defaultValue={booking.staffId ?? ''} className="field-control">
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : <div />}
              <div className="sm:col-span-3">
                <SubmitButton variant="secondary" pendingLabel="Wird verschoben …">Verschieben</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Sheet>
      )}

      {active && past && booking.status === 'CONFIRMED' && (
        <div className="flex flex-wrap gap-2">
          <ActionForm action={setOutcomeAction.bind(null, booking.id, 'COMPLETED')} className="contents">
            <SubmitButton variant="secondary">Als erledigt markieren</SubmitButton>
          </ActionForm>
          <ActionForm action={setOutcomeAction.bind(null, booking.id, 'NO_SHOW')} className="contents">
            <SubmitButton variant="secondary">Nicht erschienen</SubmitButton>
          </ActionForm>
        </div>
      )}

      {active && !past && (
        <Sheet>
          <SheetHeader title="Termin absagen" description="Der Platz wird wieder frei; Personen auf der Warteliste werden informiert." />
          <div className="px-5 pb-5">
            {search.absagen === '1' ? (
              <ActionForm action={cancelBookingByBusinessAction.bind(null, booking.id)} className="flex flex-wrap gap-2">
                <SubmitButton variant="danger" pendingLabel="Wird abgesagt …">Ja, Termin absagen</SubmitButton>
                <Link href={`/admin/termine/${booking.id}`} className="inline-flex items-center min-h-12 px-4 font-semibold">Abbrechen</Link>
              </ActionForm>
            ) : (
              <Link href={`/admin/termine/${booking.id}?absagen=1`} className="inline-flex items-center min-h-12 px-5 rounded-[var(--radius-control)] border-[1.5px] border-danger text-danger font-semibold no-underline">
                Termin absagen
              </Link>
            )}
          </div>
        </Sheet>
      )}

      {booking.notifications.length > 0 && (
        <Sheet>
          <SheetHeader title="Nachrichten an die Kundin bzw. den Kunden" description="Versandprotokoll ohne Inhalte (wird nach 90 Tagen gelöscht)." />
          <ul className="ruled border-t border-rule text-sm">
            {booking.notifications.map((n) => (
              <li key={n.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5">
                <span>{TYPE[n.type] ?? n.type} per {CHANNEL[n.channel]}</span>
                <span className={n.status === 'FAILED' ? 'text-danger font-semibold' : 'text-graphite'}>
                  {STATUS[n.status]}
                  {n.sentAt && `, ${formatDateTime(n.sentAt, tz)}`}
                </span>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  )
}
