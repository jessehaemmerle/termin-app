import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Checkbox, Notice, Sheet, SheetHeader } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { saveWhatsappAction, testWhatsappAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'WhatsApp' }

const TEMPLATES = [
  { field: 'tplBestaetigung', label: 'Vorlage Bestätigung', key: 'whatsappTplConfirmation', text: 'Ihr Termin für {{1}} am {{2}} um {{3}} Uhr ist bestätigt. Details und Absage: {{4}}' },
  { field: 'tplErinnerung', label: 'Vorlage Erinnerung', key: 'whatsappTplReminder', text: 'Erinnerung: Ihr Termin für {{1}} ist am {{2}} um {{3}} Uhr. Details und Absage: {{4}}' },
  { field: 'tplAbsage', label: 'Vorlage Absage', key: 'whatsappTplCancellation', text: 'Ihr Termin für {{1}} am {{2}} um {{3}} Uhr wurde abgesagt. Neuen Termin buchen: {{4}}' },
  { field: 'tplWarteliste', label: 'Vorlage Warteliste', key: 'whatsappTplWaitlist', text: 'Für {{1}} am {{2}} ist ein Termin frei geworden. Jetzt buchen: {{3}}' },
] as const

export default async function WhatsappSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader
        title="WhatsApp-Benachrichtigungen"
        description="Kund:innen, die bei der Buchung ausdrücklich einwilligen, erhalten Bestätigung, Erinnerung und Änderungen zusätzlich per WhatsApp – über das eigene WhatsApp-Business-Konto deines Betriebs."
      />
      <Notice tone="info" title="Datenschutz">
        Der Versand läuft über die WhatsApp Business Platform von Meta (Irland; Verarbeitung in den USA möglich). Nachrichten gehen nur an Personen mit dokumentierter Einwilligung, die jederzeit widerrufen werden kann. Werbung wird nicht versendet. Deine Datenschutzerklärung wird automatisch ergänzt.
      </Notice>
      <Sheet>
        <SheetHeader title="So richtest du es ein" />
        <ol className="px-5 pb-5 space-y-2 list-decimal pl-10">
          <li>Im Meta Business Manager ein WhatsApp-Business-Konto anlegen und eine Telefonnummer verbinden (die Nummer darf nicht gleichzeitig in der normalen WhatsApp-App genutzt werden).</li>
          <li>Einen System-Benutzer mit der Berechtigung <code>whatsapp_business_messaging</code> anlegen und einen dauerhaften Zugangsschlüssel erzeugen.</li>
          <li>Im WhatsApp Manager die vier Vorlagen unten in der Kategorie „Utility“ und Sprache Deutsch einreichen.</li>
          <li>Phone-Number-ID und Zugangsschlüssel hier eintragen, aktivieren und eine Testnachricht an dich selbst senden.</li>
        </ol>
      </Sheet>
      <Sheet className="p-5">
        <ActionForm action={saveWhatsappAction}>
          <TextField name="phoneNumberId" label="Phone-Number-ID" defaultValue={tenant.whatsappPhoneNumberId} inputMode="numeric" />
          <TextField name="token" label="Zugangsschlüssel (Access Token)" type="password" autoComplete="off" hint={tenant.whatsappAccessTokenEnc ? 'Gespeichert. Leer lassen, um ihn zu behalten.' : 'Wird verschlüsselt gespeichert.'} />
          <TextField name="sprache" label="Sprache der Vorlagen" defaultValue={tenant.whatsappTemplateLang} hint="Sprachcode wie im WhatsApp Manager, z. B. de." />
          {TEMPLATES.map((t) => (
            <TextField key={t.field} name={t.field} label={t.label} required defaultValue={tenant[t.key]} hint={<>Vorschlag für den Text: „{t.text}“</>} />
          ))}
          <Checkbox id="vertrag" name="vertrag" label="Mein Betrieb hat die WhatsApp Business-Bedingungen von Meta akzeptiert und versendet nur Terminnachrichten." />
          <Checkbox id="aktiv" name="aktiv" defaultChecked={tenant.whatsappEnabled} label="WhatsApp-Benachrichtigungen aktivieren" />
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
      {tenant.whatsappEnabled && (
        <Sheet>
          <SheetHeader title="Testnachricht" description="Sendet die Bestätigungsvorlage mit Beispieldaten an deine eigene Nummer." />
          <div className="px-5 pb-5">
            <ActionForm action={testWhatsappAction} className="flex flex-wrap gap-3 items-end">
              <div className="grow"><TextField name="testnummer" label="Deine Mobilnummer" type="tel" required /></div>
              <SubmitButton variant="secondary" pendingLabel="Wird gesendet …">Test senden</SubmitButton>
            </ActionForm>
          </div>
        </Sheet>
      )}
    </div>
  )
}
