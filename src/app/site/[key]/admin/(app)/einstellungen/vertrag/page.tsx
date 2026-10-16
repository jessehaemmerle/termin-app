import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { legalContext } from '@/lib/legal/context'
import { avv } from '@/lib/legal/templates/avv'
import { DPA_VERSION } from '@/lib/legal/consent'
import { platformUrl } from '@/lib/tenant'
import { formatDateTime } from '@/lib/format'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Checkbox, Notice, Sheet } from '@/components/ui'
import { LegalDocument } from '@/components/legal-document'
import { acceptDpaAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Auftragsverarbeitungsvertrag' }

export default async function DpaPage() {
  const ctx = await requireStaff({ permission: 'settings.manage', allowMissing2fa: true })
  const { tenant } = ctx
  const acceptedBy = tenant.dpaAcceptedByUserId ? await db.user.findFirst({ where: { id: tenant.dpaAcceptedByUserId, tenantId: tenant.id } }) : null
  const current = tenant.dpaVersion === DPA_VERSION
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader title="Auftragsverarbeitungsvertrag" description="Regelt nach Art. 28 DSGVO, wie die Plattform die Daten deiner Kund:innen in deinem Auftrag verarbeitet." />
      {tenant.dpaAcceptedAt && current ? (
        <Notice tone="ok" title="Vertrag abgeschlossen">
          Am {formatDateTime(tenant.dpaAcceptedAt, tenant.timezone)}{acceptedBy && ` durch ${acceptedBy.name}`} (Version {tenant.dpaVersion}).
        </Notice>
      ) : (
        <Notice tone="warn" title={tenant.dpaAcceptedAt ? 'Neue Vertragsversion' : 'Noch nicht abgeschlossen'}>
          Ohne gültigen Vertrag ist die Online-Buchung nicht freigeschaltet. Bitte lies den Vertrag und bestätige ihn unten.
        </Notice>
      )}
      <Sheet className="p-5 md:p-8">
        <LegalDocument template={avv} context={legalContext(tenant)} />
      </Sheet>
      {(!tenant.dpaAcceptedAt || !current) && ctx.role === 'OWNER' && (
        <Sheet className="p-5">
          <ActionForm action={acceptDpaAction}>
            <Checkbox id="avv" name="avv" label="Ich schließe den obenstehenden Auftragsverarbeitungsvertrag im Namen meines Betriebs ab." />
            <Checkbox id="nb" name="nb" label={<>Ich akzeptiere die <a href={platformUrl('/nutzungsbedingungen')} target="_blank" rel="noopener">Nutzungsbedingungen</a>.</>} />
            <SubmitButton>Vertrag abschließen</SubmitButton>
          </ActionForm>
        </Sheet>
      )}
      <p className="text-sm text-graphite">Zum Ausdrucken oder Speichern als PDF nutze die Druckfunktion deines Browsers.</p>
    </div>
  )
}
