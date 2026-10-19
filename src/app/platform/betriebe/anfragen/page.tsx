import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth/guards'
import { platformPath } from '@/lib/tenant'
import { formatDateTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { EmptyState, PageTitle } from '@/components/ui'
import { deleteAccessRequestAction, setAccessRequestStatusAction } from '../../_actions'

export const metadata: Metadata = { title: 'Anfragen', robots: { index: false } }

const STATUS_LABELS = { NEW: 'Neu', CONTACTED: 'Kontaktiert', DONE: 'Erledigt', REJECTED: 'Abgelehnt' } as const

export default async function AccessRequestsPage() {
  await requirePlatformAdmin()
  const requests = await db.accessRequest.findMany({ orderBy: { createdAt: 'desc' } })
  return (
    <div className="space-y-6">
      <PageTitle
        title="Anfragen"
        description="Zugangsanfragen von der Website. Sie werden sechs Monate nach Eingang automatisch gelöscht."
        action={<Link href={platformPath('/betriebe')}>Zu den Betrieben</Link>}
      />
      {requests.length === 0 ? (
        <EmptyState title="Keine Anfragen">Neue Anfragen erscheinen hier und werden an die Betreiber-E-Mail-Adresse gemeldet.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} id={r.id} className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-5 space-y-3 scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-lg">{r.businessName}</h2>
                <span className="text-sm text-graphite">
                  {STATUS_LABELS[r.status]} · {formatDateTime(r.createdAt, 'Europe/Vienna')}
                </span>
              </div>
              <p className="text-sm">
                {r.contactName} · <a href={`mailto:${r.email}`}>{r.email}</a>
                {r.phone && <> · <a href={`tel:${r.phone}`}>{formatPhone(r.phone)}</a></>}
              </p>
              {(r.industry || r.teamSize) && <p className="text-sm text-graphite">{[r.industry, r.teamSize].filter(Boolean).join(' · ')}</p>}
              {r.message && <p className="whitespace-pre-line border-l-2 border-rule pl-3">{r.message}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {(['CONTACTED', 'DONE', 'REJECTED'] as const)
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <ActionForm key={s} action={setAccessRequestStatusAction.bind(null, r.id, s)} className="contents">
                      <SubmitButton variant="secondary">{STATUS_LABELS[s]}</SubmitButton>
                    </ActionForm>
                  ))}
                <ActionForm action={deleteAccessRequestAction.bind(null, r.id)} className="contents">
                  <SubmitButton variant="danger">Löschen</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
