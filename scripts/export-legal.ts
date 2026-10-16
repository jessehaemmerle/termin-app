// Erzeugt Prüfexemplare aller Rechtstexte mit Platzhaltern nach docs/rechtliches/
// (für die anwaltliche Durchsicht). Alle optionalen Abschnitte sind enthalten.
// Aufruf: npx tsx scripts/export-legal.ts
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderTemplate, type TemplateContext } from '../src/lib/legal/template'
import { impressumBetrieb, impressumPlattform } from '../src/lib/legal/templates/impressum'
import { datenschutzBetrieb } from '../src/lib/legal/templates/datenschutz-betrieb'
import { barrierefreiheit, buchungsbedingungen } from '../src/lib/legal/templates/buchungsbedingungen'
import { datenschutzPlattform, nutzungsbedingungen } from '../src/lib/legal/templates/plattform'
import { avv } from '../src/lib/legal/templates/avv'

const p = (label: string) => `‹${label}›`

const context: TemplateContext = {
  stand: p('Datum der Fassung'),
  plattform: {
    name: p('Plattformname'),
    url: p('Plattform-URL'),
    hosting: p('Hosting-Anbieter mit Anschrift'),
    hostingLocation: p('Standort Rechenzentrum'),
    mailProvider: p('E-Mail-Dienstleister mit Anschrift'),
    operator: {
      name: p('Betreiber: Name/Firma'),
      legalForm: p('Rechtsform'),
      street: p('Straße'),
      postalCode: p('PLZ'),
      city: p('Ort'),
      country: 'Österreich',
      email: p('E-Mail'),
      phone: p('Telefon'),
      uidNumber: p('UID-Nummer'),
      companyRegisterNumber: p('Firmenbuchnummer'),
      companyRegisterCourt: p('Firmenbuchgericht'),
      businessPurpose: p('Unternehmensgegenstand'),
      supervisoryAuthority: p('Gewerbebehörde'),
      chamber: p('Kammer/Fachgruppe'),
      privacyEmail: p('Datenschutz-E-Mail'),
    },
  },
  betrieb: {
    name: p('Betriebsname'),
    url: p('Adresse der Buchungsseite'),
    legalName: p('Name/Firma des Betriebs'),
    legalForm: p('Rechtsform'),
    street: p('Straße'),
    postalCode: p('PLZ'),
    city: p('Ort'),
    country: 'Österreich',
    phone: p('Telefon'),
    email: p('E-Mail'),
    uidNumber: p('UID-Nummer'),
    companyRegisterNumber: p('Firmenbuchnummer'),
    companyRegisterCourt: p('Firmenbuchgericht'),
    businessPurpose: p('Unternehmensgegenstand'),
    supervisoryAuthority: p('Gewerbebehörde'),
    chamber: p('Kammer/Innung'),
    professionTitle: p('Berufsbezeichnung (nur reglementierte Berufe)'),
    tradeRegulations: 'Gewerbeordnung 1994 (GewO), abrufbar unter www.ris.bka.gv.at',
    privacyEmail: p('Datenschutz-E-Mail'),
    dpoName: p('Datenschutzbeauftragte:r (falls bestellt)'),
    dpoEmail: p('E-Mail DSB'),
    additionalTerms: p('Ergänzende Hinweise des Betriebs'),
    cancellationHours: p('Stornofrist in Stunden'),
    cancelGraceMinutes: '30',
    retentionMonths: p('Löschfrist in Monaten, Standard 12'),
    reminderHours: p('Erinnerung in Stunden'),
    whatsapp: true,
    whatsappChat: true,
    ownSmtp: false,
    smtpProvider: '',
    accounts: true,
    waitlist: true,
    requireApproval: false,
    requirePhone: false,
  },
}

const documents: [string, string, string][] = [
  ['betrieb-impressum.md', 'Impressum (Buchungsseite eines Betriebs)', impressumBetrieb],
  ['betrieb-datenschutzerklaerung.md', 'Datenschutzerklärung (Buchungsseite, alle Funktionen aktiv)', datenschutzBetrieb],
  ['betrieb-buchungsbedingungen.md', 'Buchungs- und Stornobedingungen', buchungsbedingungen],
  ['betrieb-barrierefreiheit.md', 'Erklärung zur Barrierefreiheit', barrierefreiheit],
  ['plattform-impressum.md', 'Impressum der Plattform', impressumPlattform],
  ['plattform-datenschutzerklaerung.md', 'Datenschutzerklärung der Plattform', datenschutzPlattform],
  ['plattform-nutzungsbedingungen.md', 'Nutzungsbedingungen für Betriebe (B2B)', nutzungsbedingungen],
  ['auftragsverarbeitungsvertrag.md', 'Auftragsverarbeitungsvertrag mit TOM und Unterauftragsverarbeitern', avv],
]

const dir = path.join(process.cwd(), 'docs', 'rechtliches')
await mkdir(dir, { recursive: true })
for (const [file, title, template] of documents) {
  const header = `<!-- Automatisch erzeugt aus src/lib/legal/templates – nicht direkt bearbeiten. -->\n<!-- ${title}. Platzhalter in ‹…› werden in der App aus den Betriebs- bzw. Betreiberdaten befüllt. -->\n\n> **Vorlage – keine Rechtsberatung.** Vor dem Livegang durch eine Rechtsanwältin bzw. einen Rechtsanwalt prüfen lassen.\n\n`
  await writeFile(path.join(dir, file), header + renderTemplate(template, context, { missing: 'placeholder' }))
  console.log(`docs/rechtliches/${file}`)
}
