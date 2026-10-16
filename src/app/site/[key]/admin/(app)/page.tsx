import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff, can } from '@/lib/auth/guards'
import { readiness } from '@/lib/tenant'
import { bookingScope, loadAgenda } from '@/lib/admin/queries'
import { addDays, endOfDay, startOfDay, today } from '@/lib/time'
import { formatDateLong, formatDateTime } from '@/lib/format'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { ButtonLink, EmptyState, Notice, Sheet, SheetHeader } from '@/components/ui'
import { AgendaList } from '../_components/agenda'
import { approveBookingAction, declineBookingAction } from '../_actions/bookings'

export const metadata: Metadata = { title: 'Heute' }

export default async function AdminToday({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff()
  const { tenant } = ctx
  const search = await searchParams
  const tz = tenant.timezone
  const day = today(tz)
  const now = new Date()

  const [agenda, pending, tomorrowCount, checks] = await Promise.all([
    loadAgenda(ctx, startOfDay(day, tz), endOfDay(day, tz), { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] } }),
    db.booking.findMany({
      where: { ...bookingScope(ctx), status: 'PENDING', startsAt: { gt: now } },
      include: { service: true, customer: true, staff: true },
      orderBy: { startsAt: 'asc' },
      take: 20,
    }),
    db.booking.count({
      where: { ...bookingScope(ctx), status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { gte: startOfDay(addDays(day, 1), tz), lt: endOfDay(addDays(day, 1), tz) } },
    }),
    ctx.role === 'OWNER' ? readiness(tenant) : Promise.resolve([]),
  ])
  const openChecks = checks.filter((c) => !c.done)
  const upcoming = agenda.filter((b) => b.endsAt > now)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-graphite font-semibold">{formatDateLong(now, tz)}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
            {upcoming.length === 0 ? 'Heute steht nichts mehr an' : upcoming.length === 1 ? 'Heute noch 1 Termin' : `Heute noch ${upcoming.length} Termine`}
          </h1>
          <p className="text-graphite mt-1">Morgen: {tomorrowCount === 1 ? '1 Termin' : `${tomorrowCount} Termine`}</p>
        </div>
        <ButtonLink href="/admin/kalender" variant="secondary">Kalender öffnen</ButtonLink>
      </div>

      {search.hinweis === 'kein-zugriff' && <Notice tone="warn" title="Kein Zugriff">Für diesen Bereich fehlen dir die Berechtigungen.</Notice>}
      {search.willkommen === '1' && (
        <Notice tone="ok" title={`Willkommen bei ${tenant.name}!`}>
          Arbeite die Checkliste unten ab, dann ist deine Buchungsseite startklar.
        </Notice>
      )}

      {openChecks.length > 0 && (
        <Sheet>
          <SheetHeader title="Buchungsseite startklar machen" description="Solange diese Punkte offen sind, können Kundinnen und Kunden online nicht buchen." />
          <ol className="ruled border-t border-rule">
            {checks.map((c, i) => (
              <li key={c.key}>
                <Link href={c.href} className="flex items-center gap-4 px-5 py-3.5 no-underline text-ink hover:bg-paper">
                  <span aria-hidden="true" className={`grid place-items-center size-8 rounded-full font-figures font-semibold shrink-0 ${c.done ? 'bg-ok text-white' : 'border-[1.5px] border-rule-strong'}`}>
                    {c.done ? '✓' : i + 1}
                  </span>
                  <span className={c.done ? 'text-graphite line-through' : 'font-semibold'}>{c.label}</span>
                  <span className="sr-only">{c.done ? '(erledigt)' : '(offen)'}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Sheet>
      )}

      {pending.length > 0 && (
        <section aria-labelledby="anfragen">
          <h2 id="anfragen" className="font-display text-xl font-semibold mb-3">
            Offene Anfragen <span className="text-graphite font-normal">({pending.length})</span>
          </h2>
          <ul className="space-y-3">
            {pending.map((b) => (
              <li key={b.id} className="bg-surface border border-warn/40 rounded-[var(--radius-sheet)] p-4">
                <Link href={`/admin/termine/${b.id}`} className="no-underline text-ink">
                  <p className="font-semibold">{b.customer?.name ?? 'Unbekannt'}</p>
                  <p className="text-sm text-graphite">
                    {b.service.name}, {formatDateTime(b.startsAt, tz)}
                    {b.staff && `, ${b.staff.name}`}
                  </p>
                </Link>
                <div className="flex flex-wrap gap-2 mt-3">
                  <ActionForm action={approveBookingAction.bind(null, b.id)} className="contents">
                    <SubmitButton className="min-h-11" pendingLabel="Wird bestätigt …">Bestätigen</SubmitButton>
                  </ActionForm>
                  <ActionForm action={declineBookingAction.bind(null, b.id)} className="contents">
                    <SubmitButton variant="secondary" className="min-h-11" pendingLabel="Wird abgelehnt …">Ablehnen</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="heute">
        <h2 id="heute" className="font-display text-xl font-semibold mb-3">Terminbuch heute</h2>
        <AgendaList
          bookings={agenda}
          timeZone={tz}
          showStaff={can(ctx.role, 'bookings.all')}
          empty={
            <Sheet>
              <EmptyState title="Heute sind keine Termine eingetragen." action={<ButtonLink href="/admin/termine/neu">Termin eintragen</ButtonLink>} />
            </Sheet>
          }
        />
      </section>
    </div>
  )
}
