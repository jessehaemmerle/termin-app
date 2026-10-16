// Datenschutzerklärung eines Betriebs für die Buchungsseite (Art. 13 DSGVO).
// Abschnitte erscheinen nur, wenn die jeweilige Funktion aktiv ist.
// VOR LIVEGANG ANWALTLICH PRÜFEN LASSEN.

export const datenschutzBetrieb = `
# Datenschutzerklärung

Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Hier informieren wir Sie gemäß Art. 13 der Datenschutz-Grundverordnung (DSGVO) darüber, welche Daten wir bei der Nutzung dieser Buchungsseite verarbeiten, wofür und auf welcher Rechtsgrundlage, und welche Rechte Sie haben.

## Verantwortlicher

{{betrieb.legalName}}{{#if betrieb.legalForm}} ({{betrieb.legalForm}}){{/if}}\\
{{betrieb.street}}, {{betrieb.postalCode}} {{betrieb.city}}, {{betrieb.country}}\\
E-Mail für Datenschutzanfragen: {{betrieb.privacyEmail}}{{#if betrieb.phone}}\\
Telefon: {{betrieb.phone}}{{/if}}

{{#if betrieb.dpoName}}Unsere Datenschutzbeauftragte bzw. unser Datenschutzbeauftragter: {{betrieb.dpoName}}{{#if betrieb.dpoEmail}}, {{betrieb.dpoEmail}}{{/if}}{{/if}}

## Das Wichtigste in Kürze

- Wir verarbeiten nur die Daten, die für Ihren Termin nötig sind: Name, E-Mail-Adresse, gegebenenfalls Telefonnummer, die gebuchte Leistung und den Zeitpunkt.
- Es gibt kein Tracking, keine Werbe- oder Analyse-Cookies und keine eingebundenen Inhalte Dritter (keine Karten, keine Social-Media-Plugins, Schriftarten werden lokal ausgeliefert).
- Termindaten werden {{betrieb.retentionMonths}} Monate nach dem Termin automatisch anonymisiert.
{{#if betrieb.whatsapp}}- Nachrichten per WhatsApp erhalten Sie nur, wenn Sie das ausdrücklich wünschen.
{{/if}}

## Aufruf der Buchungsseite

Beim Aufruf dieser Seite verarbeitet der Server technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung), um die Seite auszuliefern und vor Missbrauch zu schützen (z. B. Begrenzung automatisierter Anfragen). Die IP-Adresse wird dafür nur kurzzeitig im Arbeitsspeicher gehalten und nicht dauerhaft gespeichert.

Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und funktionsfähigen Angebot (Art. 6 Abs. 1 lit. f DSGVO).

## Cookies und lokale Speicherung

Wir setzen ausschließlich technisch notwendige Cookies ein{{#if betrieb.accounts}}, und zwar nur, wenn Sie sich in Ihr Kundenkonto einloggen (Sitzungs-Cookie, Speicherdauer bis zur Abmeldung, höchstens 30 Tage){{/if}}. Diese Cookies sind für den von Ihnen ausdrücklich gewünschten Dienst unbedingt erforderlich; eine Einwilligung ist dafür nicht notwendig (§ 165 Abs. 3 Telekommunikationsgesetz 2021). Wenn Sie die Seite als App installieren, speichert Ihr Gerät Programmdateien und eine Offline-Hinweisseite – jedoch keine Termin- oder Kundendaten.

## Online-Terminbuchung

**Welche Daten:** Name, E-Mail-Adresse, {{#if betrieb.requirePhone}}Telefonnummer{{else}}optional Telefonnummer{{/if}}, gewählte Leistung, Person und Zeitpunkt, optional Ihre Nachricht an uns sowie der Status des Termins (z. B. bestätigt, abgesagt).

**Zweck:** Vereinbarung, Bestätigung, Durchführung und Verwaltung Ihres Termins sowie Rückfragen dazu.

**Rechtsgrundlage:** Erfüllung eines Vertrags bzw. Durchführung vorvertraglicher Maßnahmen auf Ihre Anfrage (Art. 6 Abs. 1 lit. b DSGVO).

**Bereitstellung:** Name und E-Mail-Adresse sind für die Online-Buchung erforderlich, weil wir Ihnen sonst keine Bestätigung und keinen Link zum Absagen senden können. Alternativ können Sie Termine auch telefonisch oder persönlich vereinbaren.

Bitte geben Sie in Nachrichtenfeldern keine Gesundheitsdaten oder andere besonders schützenswerte Angaben an.

**Bestätigung und Erinnerung per E-Mail:** Wir senden Ihnen eine Bestätigung{{#if betrieb.reminderHours}}, eine Erinnerung etwa {{betrieb.reminderHours}} Stunden vor dem Termin{{/if}} sowie Nachrichten bei Änderungen oder Absagen. Das ist Teil der Terminabwicklung (Art. 6 Abs. 1 lit. b DSGVO). Werbung senden wir nicht.

**Verwaltungslink:** Mit der Bestätigung erhalten Sie einen persönlichen Link, über den Sie Ihren Termin ansehen und absagen können. Bitte geben Sie diesen Link nicht weiter.

{{#if betrieb.whatsapp}}
## Benachrichtigung per WhatsApp (freiwillig)

Wenn Sie bei der Buchung ausdrücklich zustimmen, senden wir Ihnen Bestätigungen, Erinnerungen und Änderungen zu Ihren Terminen zusätzlich per WhatsApp.

**Welche Daten:** Ihre Mobilnummer sowie Datum, Uhrzeit und Leistung des Termins und der Link zur Terminverwaltung.

**Rechtsgrundlage:** Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Wir speichern, wann und mit welchem Wortlaut Sie eingewilligt haben, um dies nachweisen zu können (Art. 7 Abs. 1 DSGVO). Die Einwilligung können Sie ab dem vollendeten 14. Lebensjahr selbst erteilen (§ 4 Abs. 4 DSG).

**Anbieter:** Die Nachrichten werden über die WhatsApp Business Platform (Cloud API) der Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland, versendet. Meta verarbeitet die Nachrichteninhalte dabei in unserem Auftrag. Unabhängig davon gelten für Ihre Nutzung von WhatsApp die Bestimmungen und die Datenschutzrichtlinie von WhatsApp.

**Übermittlung in die USA:** Eine Verarbeitung durch die Meta Platforms, Inc. in den USA ist möglich. Die Meta Platforms, Inc. ist nach dem EU-US Data Privacy Framework zertifiziert; für die USA besteht für zertifizierte Unternehmen ein Angemessenheitsbeschluss der Europäischen Kommission (Art. 45 DSGVO). Ergänzend hat Meta Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO) vereinbart.

**Widerruf:** Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen – über den Verwaltungslink Ihres Termins{{#if betrieb.accounts}}, in Ihrem Kundenkonto{{/if}} oder mit einer kurzen Nachricht an {{betrieb.privacyEmail}}. Die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt. Sie erhalten dann weiterhin E-Mails zu Ihren Terminen.
{{/if}}

{{#if betrieb.whatsappChat}}
## Kontakt über WhatsApp

Auf dieser Seite finden Sie Links, mit denen Sie uns eine WhatsApp-Nachricht schreiben können. Erst wenn Sie einen solchen Link anklicken, wird WhatsApp geöffnet; vorher werden keine Daten an WhatsApp übermittelt. Schreiben Sie uns über WhatsApp, verarbeiten wir Ihre Nachricht und Telefonnummer zur Beantwortung Ihres Anliegens (Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO). Für die Nutzung von WhatsApp gelten die Bestimmungen der Meta Platforms Ireland Limited.
{{/if}}

{{#if betrieb.accounts}}
## Kundenkonto (freiwillig)

Sie können ein Kundenkonto anlegen, um Ihre Daten nicht jedes Mal eingeben zu müssen und Ihre Termine zu sehen. Dafür verarbeiten wir Name, E-Mail-Adresse, optional Telefonnummer, Ihr Passwort (nur als sicherer Hash nach Argon2id, nie im Klartext) und, falls Sie diese aktivieren, Daten zur Zwei-Faktor-Anmeldung.

Rechtsgrundlage ist die Nutzungsvereinbarung über das Kundenkonto (Art. 6 Abs. 1 lit. b DSGVO). Das Konto gilt ausschließlich für {{betrieb.name}}. Sie können es jederzeit selbst löschen; zukünftige Termine werden dabei abgesagt. Ein Konto ohne Anmeldung und ohne Termine in den letzten {{betrieb.retentionMonths}} Monaten wird automatisch gelöscht.
{{/if}}

{{#if betrieb.waitlist}}
## Warteliste (freiwillig)

Ist ein gewünschter Tag ausgebucht, können Sie sich auf eine Warteliste setzen. Wir verarbeiten dafür Name, E-Mail-Adresse, optional Telefonnummer und Ihren Wunschtermin, um Sie zu informieren, wenn etwas frei wird (Art. 6 Abs. 1 lit. b DSGVO, vorvertragliche Maßnahme auf Ihre Anfrage). Der Eintrag wird nach dem gewünschten Tag automatisch gelöscht; austragen können Sie sich jederzeit über den Link auf der Bestätigungsseite.
{{/if}}

## Interne Vermerke

Wir können zu Ihrem Kundendatensatz kurze interne Vermerke anlegen, die für die Erbringung unserer Leistung hilfreich sind (z. B. Vorlieben). Rechtsgrundlage ist unser berechtigtes Interesse an einer guten Betreuung unserer Kundinnen und Kunden (Art. 6 Abs. 1 lit. f DSGVO). Gesundheitsdaten oder andere besonders schützenswerte Daten vermerken wir dort nicht.

## Empfänger und Auftragsverarbeiter

Zugriff auf Ihre Daten haben nur die Personen in unserem Betrieb, die sie für Ihren Termin benötigen. Mitarbeiterinnen und Mitarbeiter sehen grundsätzlich nur die eigenen Termine.

Wir setzen folgende Dienstleister ein, die Ihre Daten ausschließlich nach unserer Weisung verarbeiten (Auftragsverarbeiter, Art. 28 DSGVO):

- **Betrieb der Buchungssoftware:** {{plattform.operator.name}}, {{plattform.operator.street}}, {{plattform.operator.postalCode}} {{plattform.operator.city}}, {{plattform.operator.country}}
- **Hosting (Unterauftragsverarbeiter):** {{plattform.hosting}}; Standort: {{plattform.hostingLocation}}
- **E-Mail-Versand:** {{#if betrieb.ownSmtp}}unser eigener E-Mail-Anbieter (Server {{betrieb.smtpProvider}}){{else}}{{plattform.mailProvider}}{{/if}}
{{#if betrieb.whatsapp}}- **WhatsApp-Nachrichten (nur mit Ihrer Einwilligung):** Meta Platforms Ireland Limited, siehe Abschnitt „Benachrichtigung per WhatsApp“
{{/if}}

Eine Weitergabe an sonstige Dritte erfolgt nur, wenn wir gesetzlich dazu verpflichtet sind.

## Speicherdauer

| Daten | Speicherdauer |
| --- | --- |
| Termin- und Kontaktdaten aus Buchungen | bis {{betrieb.retentionMonths}} Monate nach dem Termin, danach Anonymisierung |
{{#if betrieb.accounts}}| Kundenkonto | bis zur Löschung durch Sie oder nach {{betrieb.retentionMonths}} Monaten ohne Aktivität und ohne Termine |
{{/if}}{{#if betrieb.waitlist}}| Wartelisten-Einträge | bis zum Ende des gewünschten Tages bzw. Beginn des Kurstermins |
{{/if}}{{#if betrieb.whatsapp}}| Nachweis Ihrer WhatsApp-Einwilligung | solange Ihre Kundendaten gespeichert sind |
{{/if}}| Versandprotokoll von Benachrichtigungen (ohne Inhalte) | 90 Tage |
| IP-Adresse zur Missbrauchsabwehr | nur im Arbeitsspeicher, höchstens 1 Stunde |

Gesetzliche Aufbewahrungspflichten (z. B. für Rechnungen nach § 132 Bundesabgabenordnung) betreffen nicht die Online-Terminbuchung selbst, sondern gegebenenfalls Belege, die wir vor Ort ausstellen.

## Datensicherheit

Die Übertragung erfolgt verschlüsselt (TLS). Zugangsdaten werden mit Argon2id gehasht, technische Zugangsschlüssel verschlüsselt gespeichert. Der Zugriff unserer Mitarbeiterinnen und Mitarbeiter ist rollenbasiert beschränkt; Zwei-Faktor-Anmeldung steht zur Verfügung.

## Ihre Rechte

Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine erteilte Einwilligung können Sie jederzeit widerrufen (Art. 7 Abs. 3).

Wenden Sie sich dafür an {{betrieb.privacyEmail}}. Wir antworten innerhalb eines Monats.

Wenn Sie meinen, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, können Sie sich bei der Aufsichtsbehörde beschweren. In Österreich ist das die **Österreichische Datenschutzbehörde**, Barichgasse 40–42, 1030 Wien, Telefon +43 1 52 152-0, E-Mail dsb@dsb.gv.at, www.dsb.gv.at.

## Keine automatisierte Entscheidungsfindung

Wir treffen keine ausschließlich automatisierten Entscheidungen im Sinne des Art. 22 DSGVO und erstellen keine Profile.

Stand: {{stand}}
`
