import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { formatDate } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { EmptyState, Notice, PageTitle, Sheet } from '@/components/ui'
import type { Prisma } from '@/generated/prisma/client'

export const metadata: Metadata = { title: 'Kunden' }
const PAGE_SIZE = 50

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'customers.manage' })
  const search = await searchParams
  const query = search.suche?.trim().slice(0, 80)
  const page = Math.max(1, Number(search.seite) || 1)
  const where: Prisma.CustomerWhereInput = {
    tenantId: ctx.tenant.id,
    ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query.replace(/\s/g, '') } }] } : {}),
  }
  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { lastActivityAt: 'desc' }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, include: { _count: { select: { bookings: true } } } }),
    db.customer.count({ where }),
  ])

  return (
    <>
      <PageTitle title="Kunden" description={`Kundendaten werden ${ctx.tenant.retentionMonths} Monate nach dem letzten Termin automatisch gelöscht.`} />
      {search.geloescht === '1' && <div className="mb-4"><Notice tone="ok" title="Kundendaten gelöscht" role="status">Alle Termine dieser Person wurden anonymisiert.</Notice></div>}
      <form className="flex gap-2 mb-5" role="search">
        <label htmlFor="suche" className="sr-only">Kund:in suchen</label>
        <input id="suche" name="suche" defaultValue={query} placeholder="Name, E-Mail oder Telefon" className="field-control" />
        <button type="submit" className="min-h-12 px-4 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold">Suchen</button>
      </form>
      {customers.length === 0 ? (
        <Sheet><EmptyState title={query ? 'Keine Treffer.' : 'Noch keine Kund:innen.'}>{!query && 'Sobald jemand bucht, erscheint die Person hier.'}</EmptyState></Sheet>
      ) : (
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/kunden/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 no-underline text-ink hover:bg-paper">
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{c.name}{c.passwordHash && <span className="ml-2 text-xs font-semibold text-graphite">Konto</span>}</span>
                  <span className="block text-sm text-graphite truncate">{[c.email, c.phone ? formatPhone(c.phone) : null].filter(Boolean).join(', ')}</span>
                </span>
                <span className="text-right text-sm text-graphite shrink-0">
                  {c._count.bookings} {c._count.bookings === 1 ? 'Termin' : 'Termine'}
                  <span className="block">zuletzt {formatDate(c.lastActivityAt, ctx.tenant.timezone)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > PAGE_SIZE && (
        <nav className="flex justify-between mt-4" aria-label="Seiten">
          {page > 1 ? <Link href={`/admin/kunden?seite=${page - 1}${query ? `&suche=${encodeURIComponent(query)}` : ''}`}>Vorherige Seite</Link> : <span />}
          {page * PAGE_SIZE < total && <Link href={`/admin/kunden?seite=${page + 1}${query ? `&suche=${encodeURIComponent(query)}` : ''}`}>Nächste Seite</Link>}
        </nav>
      )}
    </>
  )
}
