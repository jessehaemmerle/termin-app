import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { isBookable, requireTenant } from '@/lib/tenant'
import { ACTIVE_STATUSES } from '@/lib/booking/data'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import { getCustomerContext } from '@/lib/auth/guards'
import { isPastLeadTime } from '@/lib/time'
import { Notice } from '@/components/ui'
import { BookingDetailsForm } from '../../buchen/details-form'
import { bookCourseAction, joinCourseWaitlistAction } from './actions'

export const metadata: Metadata = { title: 'Kurstermin' }

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  const { id } = await params
  const session = await db.groupSession.findFirst({
    where: { id, tenantId: tenant.id, cancelledAt: null, startsAt: { gt: new Date() } },
    include: { service: true, staff: true, _count: { select: { bookings: { where: { status: { in: [...ACTIVE_STATUSES] } } } } } },
  })
  if (!session || !session.service.active) notFound()

  const [bookable, customer] = await Promise.all([isBookable(tenant), getCustomerContext()])
  const free = session.capacity - session._count.bookings
  const tooLate = isPastLeadTime(session.startsAt, tenant.minLeadMinutes)
  const tz = tenant.timezone
  const customerProps = customer ? { name: customer.customer.name, email: customer.customer.email ?? '', phone: customer.customer.phone ?? '' } : null

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-graphite font-semibold">Kurstermin</p>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-1">{session.service.name}</h1>
        <p className="font-figures text-3xl font-semibold text-brand-text mt-3">
          {formatTime(session.startsAt, tz)}–{formatTime(session.endsAt, tz)}
        </p>
        <p className="text-lg font-semibold">{formatDateLong(session.startsAt, tz)}</p>
        <p className="text-graphite mt-1">
          {session.staff && <>Mit {session.staff.name}. </>}
          {session.service.priceCents !== null && <>Preis {formatPrice(session.service.priceCents, session.service.priceFrom)}, zahlbar vor Ort. </>}
          {free > 0 ? `${free} von ${session.capacity} Plätzen frei.` : 'Ausgebucht.'}
        </p>
        {session.service.description && <p className="mt-4 whitespace-pre-line">{session.service.description}</p>}
        {session.note && <p className="mt-2 whitespace-pre-line">{session.note}</p>}
      </div>

      {!bookable || tooLate ? (
        <Notice tone="info" title="Online-Buchung nicht möglich">
          {tooLate ? 'Für diesen Termin ist keine Online-Buchung mehr möglich.' : 'Die Online-Buchung ist derzeit nicht verfügbar.'}
        </Notice>
      ) : free > 0 ? (
        <section aria-labelledby="platz-buchen">
          <h2 id="platz-buchen" className="font-display text-xl font-semibold mb-4">Platz buchen</h2>
          <BookingDetailsForm
            action={bookCourseAction}
            hidden={{ kurs: session.id }}
            tenantName={tenant.name}
            whatsappEnabled={tenant.whatsappEnabled}
            requirePhone={tenant.requirePhone}
            requireApproval={tenant.requireApproval}
            cancellationDeadlineHours={tenant.cancellationDeadlineHours}
            customer={customerProps}
            accountsEnabled={tenant.allowCustomerAccounts}
            submitLabel={tenant.requireApproval ? 'Platz anfragen' : 'Platz verbindlich buchen'}
          />
        </section>
      ) : tenant.waitlistEnabled ? (
        <section aria-labelledby="warteliste">
          <h2 id="warteliste" className="font-display text-xl font-semibold mb-2">Auf die Warteliste</h2>
          <p className="text-graphite mb-4">Wird ein Platz frei, benachrichtigen wir Sie. Wer zuerst bucht, erhält den Platz.</p>
          <BookingDetailsForm
            action={joinCourseWaitlistAction}
            hidden={{ kurs: session.id }}
            tenantName={tenant.name}
            whatsappEnabled={tenant.whatsappEnabled}
            requirePhone={false}
            customer={customerProps}
            accountsEnabled={tenant.allowCustomerAccounts}
            submitLabel="Auf die Warteliste setzen"
            showNote={false}
          />
        </section>
      ) : (
        <Notice tone="info" title="Dieser Termin ist ausgebucht." />
      )}

      <p>
        <Link href="/kurse">Alle Kurstermine</Link>
      </p>
    </div>
  )
}
