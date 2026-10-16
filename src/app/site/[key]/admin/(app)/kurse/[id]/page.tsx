import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { formatDateLong, formatDateTime, formatTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox, Sheet, SheetHeader, StatusBadge } from '@/components/ui'
import { addParticipantAction, cancelSessionAction } from '../../../_actions/catalog'

export const metadata: Metadata = { title: 'Kurstermin' }

export default async function CourseSessionAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const tz = ctx.tenant.timezone
  const { id } = await params
  const search = await searchParams
  const session = await db.groupSession.findFirst({
    where: { id, tenantId: ctx.tenant.id },
    include: {
      service: true,
      staff: true,
      bookings: { include: { customer: true }, orderBy: { createdAt: 'asc' } },
      waitlistEntries: { include: { customer: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!session) notFound()
  const active = session.bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
  const future = session.startsAt > new Date() && !session.cancelledAt

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/kurse" className="text-sm">Alle Kurse</Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-2">{session.service.name}</h1>
        <p className="font-figures text-2xl font-semibold text-brand-text mt-1">{formatTime(session.startsAt, tz)}–{formatTime(session.endsAt, tz)}</p>
        <p className="font-semibold">{formatDateLong(session.startsAt, tz)}</p>
        <p className="text-graphite">{session.staff ? `Leitung: ${session.staff.name}. ` : ''}{active.length} von {session.capacity} Plätzen belegt.{session.cancelledAt && ' Abgesagt.'}</p>
      </div>

      <Sheet>
        <SheetHeader title="Teilnehmende" />
        {session.bookings.length === 0 ? <p className="px-5 pb-5 text-graphite">Noch keine Buchungen.</p> : (
          <ul className="ruled border-t border-rule">
            {session.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <Link href={`/admin/termine/${b.id}`} className="no-underline text-ink">
                  <span className="block font-semibold">{b.customer?.name ?? 'Gelöscht'}</span>
                  <span className="block text-sm text-graphite">{[b.customer?.email, b.phone ? formatPhone(b.phone) : null].filter(Boolean).join(', ')}</span>
                </Link>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {session.waitlistEntries.length > 0 && (
        <Sheet>
          <SheetHeader title="Warteliste" description="Wird ein Platz frei, werden alle automatisch benachrichtigt." />
          <ul className="ruled border-t border-rule">
            {session.waitlistEntries.map((w) => (
              <li key={w.id} className="px-5 py-3">
                <span className="font-semibold">{w.customer.name}</span>
                <span className="block text-sm text-graphite">eingetragen {formatDateTime(w.createdAt, tz)}{w.notifiedAt && `, benachrichtigt ${formatDateTime(w.notifiedAt, tz)}`}</span>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {future && active.length < session.capacity && (
        <Sheet>
          <SheetHeader title="Teilnehmer:in eintragen" />
          <div className="px-5 pb-5">
            <ActionForm action={addParticipantAction.bind(null, session.id)} resetOnSuccess className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block font-semibold">Name</label>
                <input id="name" name="name" required className="field-control" />
                <FieldError name="name" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block font-semibold">E-Mail</label>
                <input id="email" name="email" type="email" className="field-control" />
                <FieldError name="email" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="telefon" className="block font-semibold">Telefon</label>
                <input id="telefon" name="telefon" type="tel" className="field-control" />
              </div>
              <div className="sm:col-span-3"><Checkbox id="benachrichtigen" name="benachrichtigen" defaultChecked label="Bestätigung per E-Mail senden" /></div>
              <div className="sm:col-span-3"><SubmitButton variant="secondary">Eintragen</SubmitButton></div>
            </ActionForm>
          </div>
        </Sheet>
      )}

      {future && (
        <Sheet>
          <SheetHeader title="Kurstermin absagen" description="Alle Teilnehmenden werden benachrichtigt, die Warteliste wird gelöscht." />
          <div className="px-5 pb-5">
            {search.absagen === '1' ? (
              <ActionForm action={cancelSessionAction.bind(null, session.id)} className="flex flex-wrap gap-2">
                <SubmitButton variant="danger" pendingLabel="Wird abgesagt …">Ja, Kurstermin absagen</SubmitButton>
                <Link href={`/admin/kurse/${session.id}`} className="inline-flex items-center min-h-12 px-4 font-semibold">Abbrechen</Link>
              </ActionForm>
            ) : (
              <Link href={`/admin/kurse/${session.id}?absagen=1`} className="text-danger font-semibold">Kurstermin absagen …</Link>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}
