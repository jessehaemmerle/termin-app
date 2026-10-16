import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { ACTIVE_STATUSES } from '@/lib/booking/data'
import { formatDateShort, formatTime } from '@/lib/format'
import { today } from '@/lib/time'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { ButtonLink, EmptyState, Notice, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { createSessionAction } from '../../_actions/catalog'

export const metadata: Metadata = { title: 'Kurse' }

export default async function CoursesAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const tz = ctx.tenant.timezone
  const search = await searchParams
  const [courses, staff, sessions] = await Promise.all([
    db.service.findMany({ where: { tenantId: ctx.tenant.id, kind: 'GROUP', active: true }, orderBy: { name: 'asc' } }),
    db.staff.findMany({ where: { tenantId: ctx.tenant.id, active: true }, orderBy: { sortOrder: 'asc' } }),
    db.groupSession.findMany({
      where: { tenantId: ctx.tenant.id, cancelledAt: null, endsAt: { gt: new Date() } },
      include: { service: true, staff: true, _count: { select: { bookings: { where: { status: { in: [...ACTIVE_STATUSES] } } }, waitlistEntries: true } } },
      orderBy: { startsAt: 'asc' },
      take: 100,
    }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle title="Kurse" description="Termine für Gruppenangebote. Kund:innen buchen einzelne Plätze; ist ein Termin voll, können sie sich auf die Warteliste setzen." />
      {search.abgesagt && <Notice tone="ok" title="Kurstermin abgesagt" role="status">Alle Teilnehmenden werden benachrichtigt.</Notice>}
      {courses.length === 0 ? (
        <Sheet>
          <EmptyState title="Noch kein Kurs angelegt." action={<ButtonLink href="/admin/leistungen/neu">Leistung vom Typ „Kurs“ anlegen</ButtonLink>} />
        </Sheet>
      ) : (
        <Sheet>
          <SheetHeader title="Neuer Kurstermin" />
          <div className="px-5 pb-5">
            <ActionForm action={createSessionAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="leistung" className="block font-semibold">Kurs</label>
                <select id="leistung" name="leistung" className="field-control">
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name} (max. {c.groupCapacity})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="person" className="block font-semibold">Leitung</label>
                <select id="person" name="person" className="field-control">
                  <option value="">Ohne Zuordnung</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="datum" className="block font-semibold">Datum</label>
                <input id="datum" name="datum" type="date" required defaultValue={today(tz)} className="field-control" />
                <FieldError name="datum" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="zeit" className="block font-semibold">Beginn</label>
                <input id="zeit" name="zeit" type="time" step={300} required className="field-control" />
                <FieldError name="zeit" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="kapazitaet" className="block font-semibold">Plätze <span className="font-normal text-graphite">(leer = Standard)</span></label>
                <input id="kapazitaet" name="kapazitaet" type="number" min={1} max={500} className="field-control" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wiederholen" className="block font-semibold">Wöchentlich wiederholen</label>
                <select id="wiederholen" name="wiederholen" className="field-control" defaultValue="0">
                  <option value="0">Nein, einmalig</option>
                  {[3, 5, 7, 11].map((n) => <option key={n} value={n}>{n + 1} Wochen insgesamt</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="hinweis" className="block font-semibold">Hinweis für Teilnehmende <span className="font-normal text-graphite">(optional)</span></label>
                <input id="hinweis" name="hinweis" maxLength={300} className="field-control" placeholder="z. B. Bitte eigene Haarbürste mitbringen" />
              </div>
              <div className="sm:col-span-2"><SubmitButton>Anlegen</SubmitButton></div>
            </ActionForm>
          </div>
        </Sheet>
      )}

      <section aria-labelledby="geplant">
        <h2 id="geplant" className="font-display text-xl font-semibold mb-3">Geplante Termine</h2>
        {sessions.length === 0 ? (
          <p className="text-graphite">Keine geplanten Kurstermine.</p>
        ) : (
          <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/kurse/${s.id}`} className="grid grid-cols-[6.5rem_1fr_auto] gap-4 px-5 py-3 no-underline text-ink hover:bg-paper items-center">
                  <span>
                    <span className="block font-figures text-lg font-semibold">{formatTime(s.startsAt, tz)}</span>
                    <span className="block text-sm text-graphite">{formatDateShort(s.startsAt, tz)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{s.service.name}</span>
                    <span className="block text-sm text-graphite">{s.staff?.name ?? 'ohne Leitung'}{s._count.waitlistEntries > 0 && `, ${s._count.waitlistEntries} auf Warteliste`}</span>
                  </span>
                  <span className="font-figures font-semibold">{s._count.bookings}/{s.capacity}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
