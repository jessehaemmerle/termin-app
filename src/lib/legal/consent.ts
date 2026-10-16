// Einwilligungstexte. Bei inhaltlichen Änderungen die Version erhöhen – die
// Version wird mit jeder Einwilligung gespeichert (Nachweis nach Art. 7 Abs. 1 DSGVO).

export const WHATSAPP_CONSENT_VERSION = 'wa-2026-10-v1'

export function whatsappConsentText(tenantName: string): string {
  return (
    `Ich möchte Bestätigungen, Erinnerungen und Änderungen zu meinen Terminen bei ${tenantName} per WhatsApp erhalten. ` +
    'Dafür werden meine Telefonnummer sowie Datum, Uhrzeit und Leistung des Termins an WhatsApp ' +
    '(Meta Platforms Ireland Ltd.) übermittelt; eine Verarbeitung in den USA ist dabei möglich. ' +
    'Die Einwilligung ist freiwillig und jederzeit widerrufbar.'
  )
}

export const HEALTH_DATA_HINT =
  'Bitte tragen Sie hier keine Gesundheitsdaten oder andere sensible Angaben ein.'

export const DPA_VERSION = 'avv-2026-10-v1'
export const TERMS_VERSION = 'nb-2026-10-v1'

export const HEALTH_DATA_HINT_TEAM = 'Bitte keine Gesundheitsdaten oder andere sensible Angaben eintragen.'
