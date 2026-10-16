import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { formatDuration, formatPrice } from '@/lib/format'
import { ButtonLink, EmptyState, Notice, PageTitle, Sheet } from '@/components/ui'

export const metadata: Metadata = { title: 'Leistungen' }

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const search = await searchParams
  const services = await db.service.findMany({
    where: { tenantId: ctx.tenant.id },
    include: { staff: { include: { staff: true } }, resources: { include: { resource: true } } },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return (
    <>
      <PageTitle title="Leistungen" description="Was online gebucht werden kann – mit Dauer, Pufferzeiten und wer es anbietet." action={<ButtonLink href="/admin/leistungen/neu">Neue Leistung</ButtonLink>} />
      {search.gespeichert && <div className="mb-4"><Notice tone="ok" title="Gespeichert" role="status" /></div>}
      {search.deaktiviert && <div className="mb-4"><Notice tone="info" title="Leistung deaktiviert" role="status">Weil bereits Termine dafür existieren, wurde sie nur deaktiviert statt gelöscht.</Notice></div>}
      {search.geloescht && <div className="mb-4"><Notice tone="ok" title="Leistung gelöscht" role="status" /></div>}
      {services.length === 0 ? (
        <Sheet><EmptyState title="Noch keine Leistungen." action={<ButtonLink href="/admin/leistungen/neu">Erste Leistung anlegen</ButtonLink>} /></Sheet>
      ) : (
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {services.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/leistungen/${s.id}`} className={`flex items-start justify-between gap-4 px-5 py-3.5 no-underline text-ink hover:bg-paper ${s.active ? '' : 'opacity-60'}`}>
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {s.name}
                    {s.kind === 'GROUP' && <span className="ml-2 text-xs text-graphite">Kurs</span>}
                    {!s.active && <span className="ml-2 text-xs text-graphite">inaktiv</span>}
                  </span>
                  <span className="block text-sm text-graphite">
                    {s.staff.length ? s.staff.map((x) => x.staff.name).join(', ') : 'Niemandem zugeordnet – nicht buchbar'}
                    {s.resources.length > 0 && `; benötigt ${s.resources.map((r) => r.resource.name).join(', ')}`}
                  </span>
                </span>
                <span className="text-right text-sm shrink-0">
                  <span className="block font-figures">{formatDuration(s.durationMinutes)}</span>
                  {s.priceCents !== null && <span className="block text-graphite">{formatPrice(s.priceCents, s.priceFrom)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
