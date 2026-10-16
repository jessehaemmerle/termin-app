import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth/guards'
import { platformPath, tenantBaseUrl, missingImprintFields } from '@/lib/tenant'
import { formatDateTime } from '@/lib/format'
import { ActionForm, ResultValue, SubmitButton } from '@/components/action-form'
import { DefinitionList, Sheet, SheetHeader } from '@/components/ui'
import { resendOwnerInviteAction, setTenantStatusAction } from '../../_actions'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin()
  const { id } = await params
  const tenant = await db.tenant.findUnique({ where: { id } })
  if (!tenant) notFound()
  const [owners, counts] = await Promise.all([
    db.user.findMany({ where: { tenantId: id, role: 'OWNER' }, select: { name: true, email: true, passwordHash: true, totpEnabledAt: true } }),
    db.$transaction([db.user.count({ where: { tenantId: id } }), db.service.count({ where: { tenantId: id } })]),
  ])
  const tz = 'Europe/Vienna'
  const pendingInvite = owners.some((o) => !o.passwordHash)
  return (
    <div className="max-w-3xl space-y-6">
      <Link href={platformPath('/betriebe')} className="text-sm">Alle Betriebe</Link>
      <h1 className="font-display text-2xl md:text-3xl font-semibold">{tenant.name}</h1>
      <Sheet>
        <SheetHeader title="Stammdaten" />
        <DefinitionList
          items={[
            { term: 'Adresse', value: <a href={tenantBaseUrl(tenant)} target="_blank" rel="noopener">{tenantBaseUrl(tenant)}</a> },
            { term: 'Status', value: tenant.status === 'ACTIVE' ? 'aktiv' : 'gesperrt' },
            { term: 'AVV', value: tenant.dpaAcceptedAt ? `${tenant.dpaVersion}, ${formatDateTime(tenant.dpaAcceptedAt, tz)}` : 'noch nicht abgeschlossen' },
            { term: 'Impressum', value: missingImprintFields(tenant).length ? `unvollständig (${missingImprintFields(tenant).join(', ')})` : 'vollständig' },
            { term: 'Inhaber:innen', value: owners.map((o) => `${o.name} <${o.email}>${o.passwordHash ? '' : ' (Einladung offen)'}${o.totpEnabledAt ? ', 2FA' : ''}`).join('; ') },
            { term: 'Teamzugänge / Leistungen', value: `${counts[0]} / ${counts[1]}` },
            { term: 'WhatsApp', value: tenant.whatsappEnabled ? 'aktiv (eigenes Meta-Konto)' : 'nicht aktiv' },
            { term: 'E-Mail-Versand', value: tenant.smtpHost ? `eigener Server (${tenant.smtpHost})` : 'Plattform' },
            { term: 'Angelegt', value: formatDateTime(tenant.createdAt, tz) },
          ]}
        />
      </Sheet>
      <div className="flex flex-wrap gap-3">
        {tenant.status === 'ACTIVE' ? (
          <ActionForm action={setTenantStatusAction.bind(null, tenant.id, 'SUSPENDED')} className="contents"><SubmitButton variant="danger">Betrieb sperren</SubmitButton></ActionForm>
        ) : (
          <ActionForm action={setTenantStatusAction.bind(null, tenant.id, 'ACTIVE')} className="contents"><SubmitButton>Betrieb freischalten</SubmitButton></ActionForm>
        )}
      </div>
      {pendingInvite && (
        <ActionForm action={resendOwnerInviteAction.bind(null, tenant.id)}>
          <SubmitButton variant="secondary">Einladung erneut senden</SubmitButton>
          <ResultValue field="inviteLink" label="Einladungslink" />
        </ActionForm>
      )}
    </div>
  )
}
