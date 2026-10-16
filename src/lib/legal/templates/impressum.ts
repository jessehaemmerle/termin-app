// Impressum eines Betriebs (Buchungsseite).
// Rechtsgrundlagen: § 5 ECG, § 14 UGB, § 63 GewO, §§ 24, 25 MedienG.
// VOR LIVEGANG ANWALTLICH PRÜFEN LASSEN.

export const impressumBetrieb = `
# Impressum

Informationen gemäß § 5 E-Commerce-Gesetz (ECG), § 14 Unternehmensgesetzbuch (UGB) und § 63 Gewerbeordnung (GewO) sowie Offenlegung gemäß § 25 Mediengesetz (MedienG).

## Diensteanbieter und Medieninhaber

**{{betrieb.legalName}}**{{#if betrieb.legalForm}}
{{betrieb.legalForm}}{{/if}}
{{betrieb.street}}
{{betrieb.postalCode}} {{betrieb.city}}
{{betrieb.country}}

## Kontakt

{{#if betrieb.phone}}Telefon: {{betrieb.phone}}
{{/if}}E-Mail: {{betrieb.email}}

## Angaben zum Unternehmen

- Unternehmensgegenstand: {{betrieb.businessPurpose}}
{{#if betrieb.uidNumber}}- Umsatzsteuer-Identifikationsnummer: {{betrieb.uidNumber}}
{{/if}}{{#if betrieb.companyRegisterNumber}}- Firmenbuchnummer: {{betrieb.companyRegisterNumber}}
{{/if}}{{#if betrieb.companyRegisterCourt}}- Firmenbuchgericht: {{betrieb.companyRegisterCourt}}
{{/if}}{{#if betrieb.supervisoryAuthority}}- Zuständige Aufsichts- bzw. Gewerbebehörde: {{betrieb.supervisoryAuthority}}
{{/if}}{{#if betrieb.chamber}}- Kammer bzw. Berufsverband: {{betrieb.chamber}}
{{/if}}{{#if betrieb.professionTitle}}- Berufsbezeichnung: {{betrieb.professionTitle}} (verliehen in Österreich)
{{/if}}{{#if betrieb.tradeRegulations}}- Anwendbare Rechtsvorschriften: {{betrieb.tradeRegulations}}
{{/if}}

## Offenlegung gemäß § 25 MedienG

Medieninhaber: {{betrieb.legalName}}, Sitz in {{betrieb.city}}.
Unternehmensgegenstand: {{betrieb.businessPurpose}}.
Grundlegende Richtung: Information über das Angebot von {{betrieb.name}} und Möglichkeit zur Online-Terminvereinbarung.

## Haftung für Links

Diese Website enthält Links zu Websites Dritter (z. B. WhatsApp). Für deren Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir entsprechende Links umgehend.

Stand: {{stand}}
`

// Impressum des Plattformbetreibers (Plattform-Website, Verwaltungsbereich).
export const impressumPlattform = `
# Impressum

Informationen gemäß § 5 E-Commerce-Gesetz (ECG), § 14 Unternehmensgesetzbuch (UGB) und § 63 Gewerbeordnung (GewO) sowie Offenlegung gemäß § 25 Mediengesetz (MedienG).

## Diensteanbieter und Medieninhaber

**{{plattform.operator.name}}**{{#if plattform.operator.legalForm}}
{{plattform.operator.legalForm}}{{/if}}
{{plattform.operator.street}}
{{plattform.operator.postalCode}} {{plattform.operator.city}}
{{plattform.operator.country}}

## Kontakt

{{#if plattform.operator.phone}}Telefon: {{plattform.operator.phone}}
{{/if}}E-Mail: {{plattform.operator.email}}

## Angaben zum Unternehmen

- Unternehmensgegenstand: {{plattform.operator.businessPurpose}}
{{#if plattform.operator.uidNumber}}- Umsatzsteuer-Identifikationsnummer: {{plattform.operator.uidNumber}}
{{/if}}{{#if plattform.operator.companyRegisterNumber}}- Firmenbuchnummer: {{plattform.operator.companyRegisterNumber}}
{{/if}}{{#if plattform.operator.companyRegisterCourt}}- Firmenbuchgericht: {{plattform.operator.companyRegisterCourt}}
{{/if}}{{#if plattform.operator.supervisoryAuthority}}- Zuständige Gewerbebehörde: {{plattform.operator.supervisoryAuthority}}
{{/if}}{{#if plattform.operator.chamber}}- Kammer bzw. Berufsverband: {{plattform.operator.chamber}}
{{/if}}- Anwendbare Rechtsvorschriften: Gewerbeordnung 1994 (GewO), abrufbar unter www.ris.bka.gv.at

## Offenlegung gemäß § 25 MedienG

Medieninhaber: {{plattform.operator.name}}, Sitz in {{plattform.operator.city}}.
Unternehmensgegenstand: {{plattform.operator.businessPurpose}}.
Grundlegende Richtung: Information über die Terminbuchungs-Plattform {{plattform.name}}.

## Hinweis zu den Buchungsseiten der Betriebe

Die Buchungsseiten der einzelnen Betriebe werden von {{plattform.operator.name}} technisch im Auftrag dieser Betriebe betrieben. Für Inhalte und Angebote der Buchungsseiten ist der jeweilige Betrieb verantwortlich; dessen Impressum ist auf der jeweiligen Buchungsseite abrufbar.

Stand: {{stand}}
`
