import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { formatPhone } from '@/lib/phone'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Sheet } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { saveGeneralAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Allgemein' }

export default async function GeneralSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  return (
    <div className="max-w-2xl">
      <SettingsHeader title="Allgemein" description="Diese Angaben erscheinen auf deiner Buchungsseite." />
      <Sheet className="p-5">
        <ActionForm action={saveGeneralAction}>
          <TextField name="name" label="Name des Betriebs" required defaultValue={tenant.name} maxLength={80} />
          <TextField name="tagline" label="Kurzbeschreibung" optional defaultValue={tenant.tagline} maxLength={140} hint="Ein Satz unter dem Namen, z. B. was und wo." />
          <TextField name="beschreibung" label="Über uns" optional multiline rows={4} defaultValue={tenant.description} maxLength={1500} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="telefon" label="Telefon" optional type="tel" defaultValue={tenant.phone ? formatPhone(tenant.phone) : ''} />
            <TextField name="email" label="E-Mail" optional type="email" defaultValue={tenant.email} hint="Antworten auf Benachrichtigungen gehen an diese Adresse." />
          </div>
          <TextField
            name="whatsapp"
            label="WhatsApp-Nummer für Kundenkontakt"
            optional
            type="tel"
            defaultValue={tenant.whatsappDisplayNumber ? formatPhone(tenant.whatsappDisplayNumber) : ''}
            hint="Zeigt auf der Buchungsseite einen Link „Nachricht per WhatsApp“. Daten fließen erst, wenn jemand den Link anklickt."
          />
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
    </div>
  )
}
