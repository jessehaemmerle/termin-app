import Link from 'next/link'
import { formatTime } from '@/lib/format'
import type { AgendaBooking } from '@/lib/admin/queries'
import { StatusBadge } from '@/components/ui'

/** Terminbuch-Ansicht: große Uhrzeit links, linierte Zeilen. */
export function AgendaList({ bookings, timeZone, showStaff = true, empty }: { bookings: AgendaBooking[]; timeZone: string; showStaff?: boolean; empty?: React.ReactNode }) {
  if (!bookings.length) return <>{empty}</>
  // Gruppentermine zusammenfassen (ein Eintrag je Kurs)
  const seen = new Set<string>()
  const rows = bookings.filter((b) => {
    if (!b.groupSessionId) return true
    if (seen.has(b.groupSessionId)) return false
    seen.add(b.groupSessionId)
    return true
  })
  const groupCounts = new Map<string, number>()
  for (const b of bookings) if (b.groupSessionId && (b.status === 'CONFIRMED' || b.status === 'PENDING')) groupCounts.set(b.groupSessionId, (groupCounts.get(b.groupSessionId) ?? 0) + 1)

  return (
    <ol className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
      {rows.map((b) => {
        const cancelled = !['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status)
        const href = b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`
        return (
          <li key={b.id}>
            <Link href={href} className={`grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr_auto] gap-x-4 gap-y-1 px-4 sm:px-5 py-3.5 no-underline text-ink hover:bg-paper ${cancelled ? 'opacity-60' : ''}`}>
              <span className="font-figures text-2xl font-semibold leading-none pt-0.5">
                {formatTime(b.startsAt, timeZone)}
                <span className="block text-xs font-sans font-normal text-graphite mt-1">bis {formatTime(b.endsAt, timeZone)}</span>
              </span>
              <span className="min-w-0">
                <span className={`block font-semibold truncate ${cancelled ? 'line-through' : ''}`}>
                  {b.groupSessionId ? `${b.service.name} (Kurs)` : (b.customer?.name ?? 'Gelöschte Person')}
                </span>
                <span className="block text-sm text-graphite truncate">
                  {b.groupSessionId ? `${groupCounts.get(b.groupSessionId) ?? 0} Teilnehmende` : b.service.name}
                  {showStaff && b.staff && (
                    <>
                      {', '}
                      <span className="inline-flex items-center gap-1">
                        <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: b.staff.color }} />
                        {b.staff.name}
                      </span>
                    </>
                  )}
                </span>
              </span>
              <span className="col-start-2 sm:col-start-3 sm:row-start-1 sm:self-center">
                {!b.groupSessionId && <StatusBadge status={b.status} />}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
