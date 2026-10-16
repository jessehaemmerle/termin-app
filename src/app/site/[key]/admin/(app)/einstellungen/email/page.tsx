import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Checkbox, Notice, Sheet, SheetHeader } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { clearSmtpAction, saveSmtpAction, testSmtpAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'E-Mail-Versand' }

export default async function EmailSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader
        title="E-Mail-Versand"
        description="Standardmäßig verschickt die Plattform E-Mails mit deinem Betriebsnamen als Absender; Antworten gehen an deine E-Mail-Adresse. Mit einem eigenen SMTP-Server kommen E-Mails direkt von deiner Adresse."
      />
      <Notice tone="info" title={tenant.smtpHost ? `Aktiv: eigener Server ${tenant.smtpHost}` : 'Aktiv: Versand über die Plattform'}>
        {tenant.smtpHost
          ? 'Dein E-Mail-Anbieter ist dann dein eigener Auftragsverarbeiter – schließe mit ihm einen AVV ab. Er wird automatisch in deiner Datenschutzerklärung genannt.'
          : 'Der E-Mail-Dienst der Plattform ist als Unterauftragsverarbeiter im AVV aufgeführt.'}
      </Notice>
      <Sheet className="p-5">
        <ActionForm action={saveSmtpAction}>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <TextField name="host" label="SMTP-Server" required defaultValue={tenant.smtpHost} placeholder="smtp.mein-anbieter.at" />
            <TextField name="port" label="Port" type="number" required defaultValue={tenant.smtpPort ?? 587} />
          </div>
          <Checkbox id="tls" name="tls" defaultChecked={tenant.smtpSecure} label="Direkte TLS-Verbindung (Port 465)" hint="Ohne Häkchen wird STARTTLS verlangt (Port 587). Unverschlüsselt wird nie gesendet." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="benutzer" label="Benutzername" optional defaultValue={tenant.smtpUser} autoComplete="off" />
            <TextField name="passwort" label="Passwort" optional type="password" autoComplete="new-password" hint={tenant.smtpPasswordEnc ? 'Leer lassen, um das gespeicherte Passwort zu behalten.' : undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="absender" label="Absenderadresse" type="email" required defaultValue={tenant.smtpFromEmail ?? tenant.email} />
            <TextField name="absenderName" label="Absendername" optional defaultValue={tenant.smtpFromName ?? tenant.name} />
          </div>
          <p className="text-sm text-graphite">Das Passwort wird verschlüsselt gespeichert und nie wieder angezeigt.</p>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
      <Sheet>
        <SheetHeader title="Testen" description="Sendet eine Test-E-Mail an deine eigene Adresse." />
        <div className="px-5 pb-5 flex flex-wrap gap-3">
          <ActionForm action={testSmtpAction} className="contents"><SubmitButton variant="secondary" pendingLabel="Wird gesendet …">Test-E-Mail senden</SubmitButton></ActionForm>
          {tenant.smtpHost && <ActionForm action={clearSmtpAction} className="contents"><SubmitButton variant="quiet">Eigenen Server entfernen</SubmitButton></ActionForm>}
        </div>
      </Sheet>
    </div>
  )
}
