import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { sha256 } from '@/lib/crypto'
import { requireTenant } from '@/lib/tenant'
import { formatDateLong, formatDayString, formatTime } from '@/lib/format'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Notice } from '@/components/ui'
import { leaveWaitlistAction } from '../actions'

export const metadata: Metadata = { title: 'Warteliste', robots: { index: false }, referrer: 'no-referrer' }

export default async function WaitlistEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const tenant = await requireTenant()
  const { token } = await params
  const search = await searchParams
  const entry = /^[A-Za-z0-9_-]{20,100}$/.test(token)
    ? await db.waitlistEntry.findFirst({
        where: { tenantId: tenant.id, tokenHash: sha256(token) },
        include: { service: true, groupSession: true },
      })
    : null

  if (!entry) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-semibold">Eintrag nicht gefunden</h1>
        <p className="text-graphite mt-2">Der Eintrag wurde bereits gelöscht oder ist abgelaufen.</p>
        <p className="mt-6">
          <Link href="/buchen">Termin buchen</Link>
        </p>
      </div>
    )
  }

  const when = entry.groupSession
    ? `${formatDateLong(entry.groupSession.startsAt, tenant.timezone)}, ${formatTime(entry.groupSession.startsAt, tenant.timezone)} Uhr`
    : formatDayString(entry.date!)

  return (
    <div className="max-w-xl space-y-6">
      {search.neu === '1' && (
        <Notice tone="ok" title="Sie stehen auf der Warteliste" role="status">
          Wird etwas frei, erhalten Sie eine Nachricht mit einem Link zum Buchen. Speichern Sie diese Seite, um sich jederzeit auszutragen.
        </Notice>
      )}
      <div>
        <h1 className="font-display text-2xl font-semibold">Ihr Wartelisten-Eintrag</h1>
        <p className="mt-2">
          <span className="font-semibold">{entry.service.name}</span>, {when}
        </p>
        {entry.notifiedAt && <p className="text-graphite mt-1">Wir haben Sie bereits über einen freien Platz informiert.</p>}
      </div>
      <ActionForm action={leaveWaitlistAction.bind(null, token)}>
        <SubmitButton variant="secondary" pendingLabel="Wird entfernt …">
          Von der Warteliste austragen
        </SubmitButton>
      </ActionForm>
    </div>
  )
}
