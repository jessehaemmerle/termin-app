import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { platformBase } from '@/lib/env'
import { tenantBaseUrl } from '@/lib/tenant'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Notice, Sheet, SheetHeader } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { saveDomainAction, verifyDomainAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Domain' }

export default async function DomainSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  const base = platformBase()
  const subdomain = `${tenant.slug}.${base.hostname}`
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader title="Adresse und eigene Domain" description={<>Deine Buchungsseite ist erreichbar unter <a href={tenantBaseUrl(tenant)}>{tenantBaseUrl(tenant)}</a>.</>} />
      <Sheet className="p-5">
        <ActionForm action={saveDomainAction}>
          <TextField name="domain" label="Eigene Domain" optional defaultValue={tenant.customDomain} placeholder="termine.mein-betrieb.at" hint="Am besten eine Subdomain deiner Website. Leer lassen und speichern, um sie zu entfernen." />
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
      {tenant.customDomain && (
        <Sheet>
          <SheetHeader title={tenant.customDomainVerifiedAt ? 'Domain bestätigt' : 'DNS-Einträge einrichten'} />
          <div className="px-5 pb-5 space-y-4">
            {tenant.customDomainVerifiedAt ? (
              <Notice tone="ok" title={`${tenant.customDomain} ist aktiv`}>Das TLS-Zertifikat wird automatisch über Let’s Encrypt ausgestellt und erneuert.</Notice>
            ) : (
              <>
                <p>Lege bei deinem Domain-Anbieter diese zwei Einträge an:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-graphite"><th className="py-2 pr-4">Typ</th><th className="py-2 pr-4">Name</th><th className="py-2">Wert</th></tr></thead>
                    <tbody className="font-figures">
                      <tr className="border-t border-rule"><td className="py-2 pr-4">CNAME</td><td className="py-2 pr-4 break-all">{tenant.customDomain}</td><td className="py-2 break-all">{subdomain}</td></tr>
                      <tr className="border-t border-rule"><td className="py-2 pr-4">TXT</td><td className="py-2 pr-4 break-all">_termin-verify.{tenant.customDomain}</td><td className="py-2 break-all select-all">{tenant.domainVerificationToken}</td></tr>
                    </tbody>
                  </table>
                </div>
                <ActionForm action={verifyDomainAction}><SubmitButton variant="secondary" pendingLabel="Wird geprüft …">Einträge prüfen</SubmitButton></ActionForm>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}
