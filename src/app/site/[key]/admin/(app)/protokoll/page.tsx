import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { AUDIT_LABELS } from '@/lib/audit'
import { formatDateTime } from '@/lib/format'
import { PageTitle } from '@/components/ui'

export const metadata: Metadata = { title: 'Protokoll' }
const PAGE_SIZE = 100

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'audit.view' })
  const page = Math.max(1, Number((await searchParams).seite) || 1)
  const [entries, users] = await Promise.all([
    db.auditLog.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { createdAt: 'desc' }, take: PAGE_SIZE + 1, skip: (page - 1) * PAGE_SIZE }),
    db.user.findMany({ where: { tenantId: ctx.tenant.id }, select: { id: true, name: true } }),
  ])
  const names = new Map(users.map((u) => [u.id, u.name]))
  return (
    <div className="max-w-3xl">
      <PageTitle title="Protokoll" description="Datenschutz- und sicherheitsrelevante Aktionen der letzten 12 Monate (Rechenschaftspflicht nach Art. 5 Abs. 2 DSGVO). Ohne IP-Adressen und ohne Inhalte." />
      <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)] text-sm">
        {entries.slice(0, PAGE_SIZE).map((e) => (
          <li key={e.id} className="grid sm:grid-cols-[11rem_1fr] gap-1 px-5 py-2.5">
            <span className="text-graphite font-figures">{formatDateTime(e.createdAt, ctx.tenant.timezone)}</span>
            <span>
              <span className="font-semibold">{AUDIT_LABELS[e.action] ?? e.action}</span>
              {e.detail && <span className="text-graphite"> – {e.detail}</span>}
              <span className="block text-graphite">
                {e.actorType === 'USER' ? (names.get(e.actorId ?? '') ?? 'Teammitglied') : e.actorType === 'CUSTOMER' ? 'Kund:in' : e.actorType === 'SYSTEM' ? 'System' : 'Plattform'}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <nav className="flex justify-between mt-4" aria-label="Seiten">
        {page > 1 ? <Link href={`/admin/protokoll?seite=${page - 1}`}>Neuere Einträge</Link> : <span />}
        {entries.length > PAGE_SIZE && <Link href={`/admin/protokoll?seite=${page + 1}`}>Ältere Einträge</Link>}
      </nav>
    </div>
  )
}
