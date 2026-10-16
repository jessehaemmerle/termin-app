import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { ACTIVE_STATUSES } from '@/lib/booking/data'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import { localDate } from '@/lib/time'
import { EmptyState } from '@/components/ui'

export const metadata: Metadata = { title: 'Kurse' }

export default async function CoursesPage() {
  const tenant = await requireTenant()
  const sessions = await db.groupSession.findMany({
    where: { tenantId: tenant.id, cancelledAt: null, startsAt: { gt: new Date() }, service: { active: true } },
    include: {
      service: true,
      staff: true,
      _count: { select: { bookings: { where: { status: { in: [...ACTIVE_STATUSES] } } } } },
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
  })

  const byDay = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const day = localDate(s.startsAt, tenant.timezone)
    byDay.set(day, [...(byDay.get(day) ?? []), s])
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Kurse und Gruppentermine</h1>
        <p className="text-graphite mt-2">Wählen Sie einen Termin, um einen Platz zu buchen.</p>
      </div>
      {sessions.length === 0 ? (
        <EmptyState title="Derzeit sind keine Kurstermine geplant.">Schauen Sie bald wieder vorbei.</EmptyState>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day} aria-label={formatDateLong(list[0].startsAt, tenant.timezone)}>
            <h2 className="font-display text-lg font-semibold mb-3">{formatDateLong(list[0].startsAt, tenant.timezone)}</h2>
            <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
              {list.map((s) => {
                const free = s.capacity - s._count.bookings
                return (
                  <li key={s.id}>
                    <Link href={`/kurse/${s.id}`} className="flex items-center gap-4 px-5 py-4 no-underline text-ink hover:bg-brand-soft">
                      <span className="font-figures text-2xl font-semibold w-20 shrink-0">{formatTime(s.startsAt, tenant.timezone)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.service.name}</span>
                        <span className="block text-sm text-graphite">
                          bis {formatTime(s.endsAt, tenant.timezone)} Uhr
                          {s.staff && `, mit ${s.staff.name}`}
                          {s.service.priceCents !== null && `, ${formatPrice(s.service.priceCents, s.service.priceFrom)}`}
                        </span>
                      </span>
                      <span className={`text-sm font-semibold shrink-0 ${free > 0 ? 'text-ok' : 'text-graphite'}`}>
                        {free > 0 ? `${free} ${free === 1 ? 'Platz' : 'Plätze'} frei` : 'Ausgebucht'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
