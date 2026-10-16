import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { missingImprintFields } from '@/lib/tenant'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Notice, Sheet, SheetHeader } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { saveLegalAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Impressum und Rechtstexte' }

export default async function LegalSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  const missing = missingImprintFields(tenant)
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader
        title="Impressum und Rechtstexte"
        description="Aus diesen Angaben werden Impressum, Datenschutzerklärung, Buchungsbedingungen und Barrierefreiheitserklärung deiner Buchungsseite erzeugt."
      />
      <Notice tone="warn" title="Bitte vor dem Livegang prüfen lassen">
        Die Texte sind sorgfältig erstellte Vorlagen, aber keine Rechtsberatung. Lass sie vor der Veröffentlichung von einer Rechtsanwältin bzw. einem Rechtsanwalt oder deiner Wirtschaftskammer prüfen.
      </Notice>
      {missing.length > 0 && <Notice tone="danger" title="Pflichtangaben fehlen">Solange {missing.join(', ')} fehlen, ist die Online-Buchung nicht freigeschaltet.</Notice>}
      <Sheet className="p-5">
        <ActionForm action={saveLegalAction}>
          <fieldset className="space-y-4">
            <legend className="font-display text-lg font-semibold">Unternehmen (§ 5 ECG, § 14 UGB)</legend>
            <TextField name="legalName" label="Name bzw. Firmenwortlaut" required defaultValue={tenant.legalName} hint="Bei Einzelunternehmen: Vor- und Nachname, ggf. mit Firmenzusatz." />
            <TextField name="legalForm" label="Rechtsform" optional defaultValue={tenant.legalForm} placeholder="z. B. Einzelunternehmen, e.U., GmbH" />
            <TextField name="street" label="Straße und Hausnummer" required defaultValue={tenant.street} />
            <div className="grid gap-4 grid-cols-[8rem_1fr]">
              <TextField name="postalCode" label="PLZ" required defaultValue={tenant.postalCode} />
              <TextField name="city" label="Ort" required defaultValue={tenant.city} />
            </div>
            <TextField name="country" label="Land" defaultValue={tenant.country} />
            <TextField name="businessPurpose" label="Unternehmensgegenstand" required defaultValue={tenant.businessPurpose} hint="Für die Offenlegung nach § 25 MedienG, z. B. „Friseurgewerbe“." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="uidNumber" label="UID-Nummer" optional defaultValue={tenant.uidNumber} placeholder="ATU…" />
              <TextField name="companyRegisterNumber" label="Firmenbuchnummer" optional defaultValue={tenant.companyRegisterNumber} placeholder="FN …" />
            </div>
            <TextField name="companyRegisterCourt" label="Firmenbuchgericht" optional defaultValue={tenant.companyRegisterCourt} />
            <TextField name="supervisoryAuthority" label="Gewerbebehörde / Aufsichtsbehörde" optional defaultValue={tenant.supervisoryAuthority} placeholder="z. B. Magistrat der Stadt Linz" />
            <TextField name="chamber" label="Kammer / Berufsverband" optional defaultValue={tenant.chamber} placeholder="z. B. WKO Oberösterreich, Landesinnung der Friseure" />
            <TextField name="professionTitle" label="Berufsbezeichnung" optional defaultValue={tenant.professionTitle} hint="Nur bei reglementierten Berufen anzugeben." />
            <TextField name="tradeRegulations" label="Anwendbare Rechtsvorschriften" optional defaultValue={tenant.tradeRegulations} />
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="font-display text-lg font-semibold">Datenschutz</legend>
            <TextField name="privacyContactEmail" label="E-Mail für Datenschutzanfragen" optional type="email" defaultValue={tenant.privacyContactEmail} hint="Leer = allgemeine E-Mail-Adresse des Betriebs." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="dpoName" label="Datenschutzbeauftragte:r" optional defaultValue={tenant.dpoName} hint="Nur falls bestellt (für kleine Betriebe meist nicht erforderlich)." />
              <TextField name="dpoEmail" label="E-Mail der bzw. des DSB" optional type="email" defaultValue={tenant.dpoEmail} />
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="font-display text-lg font-semibold">Ergänzende Buchungsbedingungen</legend>
            <TextField name="additionalTerms" label="Eigene Hinweise" optional multiline rows={4} defaultValue={tenant.additionalTerms} maxLength={3000} hint="Erscheinen am Ende der Buchungsbedingungen. Keine Gebühren für Absagen oder Nichterscheinen eintragen, ohne das rechtlich prüfen zu lassen." />
          </fieldset>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
      <Sheet>
        <SheetHeader title="Erzeugte Texte ansehen" />
        <ul className="px-5 pb-5 space-y-2">
          <li><a href="/impressum" target="_blank">Impressum</a></li>
          <li><a href="/datenschutz" target="_blank">Datenschutzerklärung</a></li>
          <li><a href="/buchungsbedingungen" target="_blank">Buchungsbedingungen</a></li>
          <li><a href="/barrierefreiheit" target="_blank">Erklärung zur Barrierefreiheit</a></li>
        </ul>
      </Sheet>
    </div>
  )
}
