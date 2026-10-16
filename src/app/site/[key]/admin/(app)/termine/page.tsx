import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff } from '@/lib/auth/guards'
import { agendaInclude, bookingScope } from '@/lib/admin/queries'
import { formatDateShort, formatTime } from '@/lib/format'
import { ButtonLink, EmptyState, PageTitle, Sheet, StatusBadge } from '@/components/ui'
import type { Prisma } from '@/generated/prisma/client'

export const metadata: Metadata = { title: 'Termine' }

const FILTERS = {
  anstehend: { label: 'Anstehend', where: (now: Date) => ({ status: { in: ['PENDING', 'CONFIRMED'] }, endsAt: { gte: now } }) as Prisma.BookingWhereInput, order: 'asc' as const },
  anfragen: { label: 'Anfragen', where: (now: Date) => ({ status: 'PENDING', startsAt: { gte: now } }) as Prisma.BookingWhereInput, order: 'asc' as const },
  vergangen: { label: 'Vergangen', where: (now: Date) => ({ endsAt: { lt: now }, status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } }) as Prisma.BookingWhereInput, order: 'desc' as const },
  abgesagt: { label: 'Abgesagt', where: () => ({ status: { in: ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_BUSINESS', 'DECLINED', 'EXPIRED'] } }) as Prisma.BookingWhereInput, order: 'desc' as const },
}
const PAGE_SIZE = 40

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff()
  const tz = ctx.tenant.timezone
  const search = await searchParams
  const key = (search.filter && search.filter in FILTERS ? search.filter : 'anstehend') as keyof typeof FILTERS
  const filter = FILTERS[key]
  const query = search.suche?.trim().slice(0, 80)
  const page = Math.max(1, Number(search.seite) || 1)

  const where: Prisma.BookingWhereInput = {
    ...bookingScope(ctx),
    ...filter.where(new Date()),
    ...(query ? { customer: { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query.replace(/\s/g, '') } }] } } : {}),
  }
  const [bookings, total] = await Promise.all([
    db.booking.findMany({ where, include: agendaInclude, orderBy: { startsAt: filter.order }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    db.booking.count({ where }),
  ])
  const params = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ filter: key, suche: query, ...p })) if (v) q.set(k, v)
    return `/admin/termine?${q.toString()}`
  }

  return (
    <>
      <PageTitle title="Termine" action={<ButtonLink href="/admin/termine/neu">Neuer Termin</ButtonLink>} />
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter">
        {Object.entries(FILTERS).map(([k, f]) => (
          <Link key={k} href={params({ filter: k, seite: undefined })} aria-current={k === key ? 'page' : undefined} className={`inline-flex items-center min-h-10 px-3.5 rounded-full border text-sm font-semibold no-underline ${k === key ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-rule-strong'}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {can(ctx.role, 'customers.manage') && (
        <form className="flex gap-2 mb-5" role="search">
          <input type="hidden" name="filter" value={key} />
          <label htmlFor="suche" className="sr-only">Nach Kund:in suchen</label>
          <input id="suche" name="suche" defaultValue={query} placeholder="Name, E-Mail oder Telefon" className="field-control" />
          <button type="submit" className="min-h-12 px-4 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold">Suchen</button>
        </form>
      )}
      {bookings.length === 0 ? (
        <Sheet>
          <EmptyState title="Keine Termine gefunden." />
        </Sheet>
      ) : (
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`} className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr_auto] gap-x-4 gap-y-1 px-4 sm:px-5 py-3 no-underline text-ink hover:bg-paper">
                <span>
                  <span className="block font-figures text-lg font-semibold">{formatTime(b.startsAt, tz)}</span>
                  <span className="block text-sm text-graphite">{formatDateShort(b.startsAt, tz)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{b.customer?.name ?? 'Gelöschte Person'}</span>
                  <span className="block text-sm text-graphite truncate">
                    {b.service.name}
                    {b.groupSessionId && ' (Kurs)'}
                    {b.staff && `, ${b.staff.name}`}
                  </span>
                </span>
                <span className="col-start-2 sm:col-start-3 sm:row-start-1 sm:self-center"><StatusBadge status={b.status} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > PAGE_SIZE && (
        <nav className="flex justify-between mt-4" aria-label="Seiten">
          {page > 1 ? <Link href={params({ seite: String(page - 1) })}>Vorherige Seite</Link> : <span />}
          <span className="text-graphite text-sm">Seite {page} von {Math.ceil(total / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < total ? <Link href={params({ seite: String(page + 1) })}>Nächste Seite</Link> : <span />}
        </nav>
      )}
    </>
  )
}
