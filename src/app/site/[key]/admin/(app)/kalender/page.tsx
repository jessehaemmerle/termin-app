import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff } from '@/lib/auth/guards'
import { loadAgenda } from '@/lib/admin/queries'
import { loadTenantHours } from '@/lib/booking/data'
import { addDays, endOfDay, isoWeekday, isValidDateString, localDate, localMinuteOfDay, startOfDay, startOfWeek, today } from '@/lib/time'
import { formatDayString, formatTime } from '@/lib/format'
import { Icon } from '@/components/icons'
import { AgendaList } from '../../_components/agenda'

export const metadata: Metadata = { title: 'Kalender' }

const PX_PER_MIN = 1.2

type Search = Record<string, string | undefined>

function link(params: Search) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  return `/admin/kalender?${q.toString()}`
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await requireStaff()
  const { tenant } = ctx
  const tz = tenant.timezone
  const search = await searchParams
  const view = search.ansicht === 'woche' ? 'woche' : 'tag'
  const date = isValidDateString(search.datum) ? search.datum : today(tz)
  const seeAll = can(ctx.role, 'bookings.all')

  const allStaff = seeAll
    ? await db.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: 'asc' } })
    : ctx.staff
      ? [ctx.staff]
      : []
  const staffFilter = seeAll && search.person ? allStaff.filter((s) => s.id === search.person) : allStaff
  const personParam = seeAll ? search.person : undefined
  const statusFilter = { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as ('PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW')[] } }
  const staffWhere = personParam ? { staffId: personParam } : {}

  const header = (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
          {view === 'tag' ? formatDayString(date, { weekday: 'long', day: 'numeric', month: 'long' }) : `Woche ab ${formatDayString(startOfWeek(date), { day: 'numeric', month: 'long' })}`}
        </h1>
        <div className="flex items-center gap-1">
          <Link href={link({ ansicht: view, datum: addDays(date, view === 'tag' ? -1 : -7), person: personParam })} className="grid place-items-center size-11 rounded-[var(--radius-control)] border border-rule-strong bg-surface text-ink" aria-label={view === 'tag' ? 'Vorheriger Tag' : 'Vorherige Woche'}>
            <Icon name="chevronLeft" />
          </Link>
          <Link href={link({ ansicht: view, person: personParam })} className="inline-flex items-center min-h-11 px-3 rounded-[var(--radius-control)] border border-rule-strong bg-surface text-ink font-semibold no-underline">
            Heute
          </Link>
          <Link href={link({ ansicht: view, datum: addDays(date, view === 'tag' ? 1 : 7), person: personParam })} className="grid place-items-center size-11 rounded-[var(--radius-control)] border border-rule-strong bg-surface text-ink" aria-label={view === 'tag' ? 'Nächster Tag' : 'Nächste Woche'}>
            <Icon name="chevronRight" />
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ansicht und Person">
        {(['tag', 'woche'] as const).map((v) => (
          <Link key={v} href={link({ ansicht: v, datum: date, person: personParam })} aria-current={view === v ? 'page' : undefined} className={`inline-flex items-center min-h-10 px-3.5 rounded-full border text-sm font-semibold no-underline ${view === v ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-rule-strong'}`}>
            {v === 'tag' ? 'Tag' : 'Woche'}
          </Link>
        ))}
        {seeAll && allStaff.length > 1 && (
          <>
            <span className="w-px bg-rule mx-1" aria-hidden="true" />
            <Link href={link({ ansicht: view, datum: date })} aria-current={!personParam ? 'page' : undefined} className={`inline-flex items-center min-h-10 px-3.5 rounded-full border text-sm font-semibold no-underline ${!personParam ? 'bg-brand-soft text-brand-text border-brand-line' : 'bg-surface text-ink border-rule-strong'}`}>
              Alle
            </Link>
            {allStaff.map((s) => (
              <Link key={s.id} href={link({ ansicht: view, datum: date, person: s.id })} aria-current={personParam === s.id ? 'page' : undefined} className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full border text-sm font-semibold no-underline ${personParam === s.id ? 'bg-brand-soft text-brand-text border-brand-line' : 'bg-surface text-ink border-rule-strong'}`}>
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )

  if (view === 'woche') {
    const monday = startOfWeek(date)
    const bookings = await loadAgenda(ctx, startOfDay(monday, tz), startOfDay(addDays(monday, 7), tz), { ...statusFilter, ...staffWhere })
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    return (
      <>
        {header}
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-7 lg:gap-2">
          {days.map((d) => {
            const list = bookings.filter((b) => localDate(b.startsAt, tz) === d)
            const isToday = d === today(tz)
            return (
              <section key={d} aria-label={formatDayString(d)} className="lg:min-w-0">
                <Link href={link({ ansicht: 'tag', datum: d, person: personParam })} className={`flex items-baseline gap-2 mb-2 no-underline ${isToday ? 'text-brand-text' : 'text-ink'}`}>
                  <span className="font-semibold">{formatDayString(d, { weekday: 'short' })}</span>
                  <span className="font-figures text-xl font-semibold">{Number(d.slice(8))}.</span>
                  <span className="text-sm text-graphite">{list.length ? `${list.length}` : ''}</span>
                </Link>
                <div className="lg:hidden">
                  <AgendaList bookings={list} timeZone={tz} showStaff={seeAll} empty={<p className="text-sm text-graphite">Keine Termine</p>} />
                </div>
                <ul className="hidden lg:block space-y-1.5">
                  {list.map((b) => (
                    <li key={b.id}>
                      <Link href={b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`} className="block rounded-md bg-surface border border-rule border-l-4 px-2 py-1.5 no-underline text-ink text-xs hover:bg-paper" style={{ borderLeftColor: b.staff?.color ?? '#b6bfcb' }}>
                        <span className="font-figures font-semibold">{formatTime(b.startsAt, tz)}</span>
                        <span className="block truncate">{b.customer?.name ?? b.service.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </>
    )
  }

  // Tagesansicht als Zeitraster mit einer Spalte je Person
  const dayStart = startOfDay(date, tz)
  const dayEnd = endOfDay(date, tz)
  const [bookings, sessions, timeOff, tenantHours, ownHours] = await Promise.all([
    loadAgenda(ctx, dayStart, dayEnd, { ...statusFilter, ...staffWhere, groupSessionId: null }),
    db.groupSession.findMany({
      where: { tenantId: tenant.id, cancelledAt: null, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart }, staffId: { in: staffFilter.map((s) => s.id) } },
      include: { service: true, _count: { select: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } } },
    }),
    db.timeOff.findMany({ where: { tenantId: tenant.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }),
    loadTenantHours(db, tenant.id),
    db.workingHours.findMany({ where: { tenantId: tenant.id, staffId: { in: staffFilter.map((s) => s.id) }, weekday: isoWeekday(date) } }),
  ])

  const weekday = isoWeekday(date)
  const ranges = [...(tenantHours[weekday] ?? []), ...ownHours.map((h) => ({ start: h.startMinute, end: h.endMinute }))]
  const bookingMinutes = bookings.flatMap((b) => [localMinuteOfDay(b.startsAt, tz), localMinuteOfDay(b.endsAt, tz) || 1440])
  let gridStart = Math.min(8 * 60, ...ranges.map((r) => r.start), ...bookingMinutes)
  let gridEnd = Math.max(18 * 60, ...ranges.map((r) => r.end), ...bookingMinutes)
  gridStart = Math.floor(gridStart / 60) * 60
  gridEnd = Math.min(1440, Math.ceil(gridEnd / 60) * 60)
  const height = (gridEnd - gridStart) * PX_PER_MIN + 16
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, i) => gridStart + i * 60)

  const minuteOf = (d: Date) => (d <= dayStart ? 0 : d >= dayEnd ? 1440 : localMinuteOfDay(d, tz))
  const pos = (from: Date, to: Date) => {
    const start = Math.max(minuteOf(from), gridStart)
    const end = Math.min(minuteOf(to) || 1440, gridEnd)
    return { top: (start - gridStart) * PX_PER_MIN, height: Math.max(26, (end - start) * PX_PER_MIN) }
  }

  return (
    <>
      {header}
      {staffFilter.length === 0 ? (
        <p className="text-graphite">Es sind keine buchbaren Personen angelegt.</p>
      ) : (
        <div className="bg-surface border border-rule rounded-[var(--radius-sheet)] overflow-x-auto">
          <div className="grid min-w-fit" style={{ gridTemplateColumns: `3.5rem repeat(${staffFilter.length}, minmax(9.5rem, 1fr))` }}>
            <div className="sticky left-0 z-10 bg-surface border-b border-rule" />
            {staffFilter.map((s) => (
              <div key={s.id} className="border-b border-l border-rule px-3 py-2 font-semibold flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
            <div className="sticky left-0 z-10 bg-surface relative" style={{ height }}>
              {hours.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-xs font-figures text-graphite" style={{ top: (m - gridStart) * PX_PER_MIN }}>
                  {String(m / 60).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {staffFilter.map((s) => {
              const own = bookings.filter((b) => b.staffId === s.id)
              const absent = timeOff.filter((t) => t.staffId === s.id || t.staffId === null)
              return (
                <div key={s.id} className="relative border-l border-rule" style={{ height }} aria-label={`Termine von ${s.name}`}>
                  {hours.map((m) => (
                    <div key={m} aria-hidden="true" className="absolute inset-x-0 border-t border-rule/70" style={{ top: (m - gridStart) * PX_PER_MIN }} />
                  ))}
                  {absent.map((t) => {
                    const p = pos(t.startsAt, t.endsAt)
                    return (
                      <div key={t.id} className="absolute inset-x-1 rounded-md bg-paper border border-dashed border-rule-strong px-2 py-1 text-xs text-graphite overflow-hidden" style={p}>
                        {t.staffId ? 'Abwesend' : 'Geschlossen'}
                        {t.label && `: ${t.label}`}
                      </div>
                    )
                  })}
                  {sessions.filter((g) => g.staffId === s.id).map((g) => (
                    <Link
                      key={g.id}
                      href={`/admin/kurse/${g.id}`}
                      className="absolute inset-x-1 rounded-md border-l-4 px-2 py-1 text-xs no-underline text-ink overflow-hidden bg-ok-soft hover:brightness-95"
                      style={{ ...pos(g.startsAt, g.endsAt), borderLeftColor: s.color }}
                    >
                      <span className="font-figures font-semibold">{formatTime(g.startsAt, tz)}</span> <span className="font-semibold">{g.service.name}</span>
                      <span className="block text-graphite">Kurs, {g._count.bookings} von {g.capacity}</span>
                    </Link>
                  ))}
                  {own.map((b) => {
                    const p = pos(b.startsAt, b.endsAt)
                    const pending = b.status === 'PENDING'
                    return (
                      <Link
                        key={b.id}
                        href={b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`}
                        className={`absolute inset-x-1 rounded-md border-l-4 px-2 py-1 text-xs no-underline text-ink overflow-hidden hover:brightness-95 ${pending ? 'bg-warn-soft border border-dashed border-warn' : 'bg-brand-soft'}`}
                        style={{ ...p, borderLeftColor: s.color }}
                      >
                        <span className="font-figures font-semibold">{formatTime(b.startsAt, tz)}</span>{' '}
                        <span className="font-semibold">{b.groupSessionId ? b.service.name : (b.customer?.name ?? 'Gelöscht')}</span>
                        <span className="block text-graphite truncate">{b.groupSessionId ? 'Kurs' : b.service.name}{pending && ', Anfrage'}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
