// Auftragsverarbeitungsvertrag (Art. 28 DSGVO) inkl. Anlagen TOM (Art. 32) und
// Unterauftragsverarbeiter. Wird im Verwaltungsbereich angezeigt und elektronisch
// akzeptiert (Art. 28 Abs. 9 DSGVO). VOR LIVEGANG ANWALTLICH PRÜFEN LASSEN.

export const avv = `
# Auftragsverarbeitungsvertrag

gemäß Art. 28 Datenschutz-Grundverordnung (DSGVO)

zwischen

**{{betrieb.legalName}}**, {{betrieb.street}}, {{betrieb.postalCode}} {{betrieb.city}}
– Verantwortlicher, im Folgenden „Auftraggeber“ –

und

**{{plattform.operator.name}}**, {{plattform.operator.street}}, {{plattform.operator.postalCode}} {{plattform.operator.city}}
– Auftragsverarbeiter, im Folgenden „Auftragnehmer“ –

## § 1 Gegenstand und Dauer

(1) Der Auftragnehmer stellt dem Auftraggeber die Terminbuchungs-Software {{plattform.name}} als Online-Dienst bereit (Hauptvertrag: Nutzungsbedingungen für Betriebe). Dabei verarbeitet er personenbezogene Daten im Auftrag des Auftraggebers.

(2) Dieser Vertrag gilt für die Dauer des Hauptvertrags und darüber hinaus, solange der Auftragnehmer personenbezogene Daten des Auftraggebers verarbeitet.

## § 2 Art, Zweck und Umfang der Verarbeitung

(1) **Art und Zweck:** Speicherung, Anzeige, Organisation und Übermittlung von Daten zur Online-Terminvereinbarung, Terminverwaltung, Benachrichtigung von Kundinnen und Kunden sowie des Teams, Warteliste, Kundenkonten und automatisierten Löschung.

(2) **Kategorien betroffener Personen:** Kundinnen und Kunden sowie Interessentinnen und Interessenten des Auftraggebers; Beschäftigte und sonstige Teammitglieder des Auftraggebers mit Benutzerkonto.

(3) **Arten personenbezogener Daten:**

- Kontaktdaten (Name, E-Mail-Adresse, Telefonnummer),
- Termindaten (Leistung, Zeitpunkt, Person, Status, Nachricht der Kundin bzw. des Kunden),
- Einwilligungsnachweise (z. B. für WhatsApp-Benachrichtigungen),
- Kontodaten (Passwort-Hash, Daten zur Zwei-Faktor-Anmeldung, Sitzungen),
- interne Vermerke des Auftraggebers,
- Protokolldaten (Versandstatus von Benachrichtigungen, Aktivitätsprotokoll ohne IP-Adressen).

(4) Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) sind nicht Gegenstand dieses Vertrags. Der Auftraggeber verpflichtet sich, solche Daten nicht über die Software zu verarbeiten.

(5) Die Verarbeitung findet ausschließlich in einem Mitgliedstaat der EU oder des EWR statt. Eine Verarbeitung in Drittländern durch den Auftragnehmer erfolgt nur auf dokumentierte Weisung des Auftraggebers (siehe § 9).

## § 3 Weisungen

(1) Der Auftragnehmer verarbeitet die Daten nur auf dokumentierte Weisung des Auftraggebers (Art. 28 Abs. 3 lit. a DSGVO), es sei denn, er ist durch Unionsrecht oder österreichisches Recht zur Verarbeitung verpflichtet; in diesem Fall teilt er dem Auftraggeber diese Anforderungen vor der Verarbeitung mit, sofern das Recht dies nicht verbietet.

(2) Weisungen erteilt der Auftraggeber in erster Linie durch die Konfiguration und Nutzung der Software (z. B. Aktivierung von WhatsApp, Löschfrist, Datenexport, Löschung). Darüber hinausgehende Weisungen erfolgen in Textform.

(3) Ist der Auftragnehmer der Ansicht, dass eine Weisung gegen datenschutzrechtliche Vorschriften verstößt, informiert er den Auftraggeber unverzüglich (Art. 28 Abs. 3 UAbs. 2 DSGVO).

## § 4 Vertraulichkeit

Der Auftragnehmer gewährleistet, dass sich die zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen (Art. 28 Abs. 3 lit. b DSGVO; Datengeheimnis nach § 6 DSG). Der Auftragnehmer greift auf Daten des Auftraggebers nur zu, soweit dies für Betrieb, Wartung, Fehlerbehebung oder Support erforderlich ist.

## § 5 Technische und organisatorische Maßnahmen

Der Auftragnehmer trifft die in **Anlage 1** beschriebenen Maßnahmen nach Art. 32 DSGVO (Art. 28 Abs. 3 lit. c DSGVO). Er darf sie an den Stand der Technik anpassen, sofern das Schutzniveau nicht unterschritten wird; wesentliche Änderungen werden dokumentiert.

## § 6 Unterauftragsverarbeiter

(1) Der Auftraggeber erteilt die allgemeine Genehmigung zur Beauftragung der in **Anlage 2** genannten Unterauftragsverarbeiter (Art. 28 Abs. 2 DSGVO).

(2) Über beabsichtigte Änderungen informiert der Auftragnehmer den Auftraggeber mindestens 30 Tage im Voraus in Textform. Der Auftraggeber kann innerhalb von 14 Tagen aus wichtigem datenschutzrechtlichem Grund widersprechen; kommt keine Einigung zustande, kann jede Partei den Hauptvertrag kündigen.

(3) Der Auftragnehmer verpflichtet Unterauftragsverarbeiter vertraglich auf dieselben Datenschutzpflichten (Art. 28 Abs. 4 DSGVO) und haftet für deren Einhaltung.

(4) **Keine Unterauftragsverarbeiter des Auftragnehmers sind:** Anbieter, die der Auftraggeber selbst beauftragt und in der Software hinterlegt, insbesondere (a) die Meta Platforms Ireland Limited für den Versand über das WhatsApp-Business-Konto des Auftraggebers und (b) ein eigener E-Mail-Anbieter (SMTP) des Auftraggebers. Diese stehen in einem unmittelbaren Vertragsverhältnis zum Auftraggeber; der Auftragnehmer übermittelt die Daten an sie ausschließlich auf Weisung des Auftraggebers.

## § 7 Unterstützung bei Betroffenenrechten

Der Auftragnehmer unterstützt den Auftraggeber mit geeigneten technischen und organisatorischen Maßnahmen bei der Erfüllung der Rechte betroffener Personen (Art. 12–22 DSGVO; Art. 28 Abs. 3 lit. e DSGVO). Die Software stellt dafür insbesondere Funktionen zur Auskunft (Datenexport), Berichtigung, Löschung und zum Widerruf von Einwilligungen bereit. Wendet sich eine betroffene Person direkt an den Auftragnehmer, leitet er die Anfrage unverzüglich an den Auftraggeber weiter.

## § 8 Unterstützung bei weiteren Pflichten, Datenschutzverletzungen

(1) Der Auftragnehmer unterstützt den Auftraggeber bei der Einhaltung der Pflichten aus Art. 32 bis 36 DSGVO (Sicherheit, Meldung von Verletzungen, Datenschutz-Folgenabschätzung, vorherige Konsultation) unter Berücksichtigung der ihm vorliegenden Informationen (Art. 28 Abs. 3 lit. f DSGVO).

(2) Der Auftragnehmer meldet dem Auftraggeber Verletzungen des Schutzes personenbezogener Daten unverzüglich, möglichst innerhalb von 24 Stunden nach Bekanntwerden (Art. 33 Abs. 2 DSGVO). Die Meldung enthält, soweit bekannt, die Angaben nach Art. 33 Abs. 3 DSGVO und wird laufend ergänzt.

## § 9 Übermittlung in Drittländer

Der Auftragnehmer übermittelt keine Daten in Drittländer. Aktiviert der Auftraggeber WhatsApp-Benachrichtigungen, weist er den Auftragnehmer an, die dafür nötigen Daten an Meta zu übermitteln; für die Zulässigkeit dieser Übermittlung (einschließlich einer möglichen Verarbeitung in den USA) und die Einholung der Einwilligungen über die Software ist der Auftraggeber verantwortlich.

## § 10 Löschung und Rückgabe

(1) Nach Ende der Leistungserbringung löscht der Auftragnehmer sämtliche personenbezogenen Daten des Auftraggebers innerhalb von 30 Tagen, sofern nicht eine Pflicht zur Speicherung nach Unionsrecht oder österreichischem Recht besteht (Art. 28 Abs. 3 lit. g DSGVO). Bis dahin kann der Auftraggeber die Daten über die Exportfunktionen herunterladen oder eine Herausgabe in einem gängigen Format verlangen.

(2) Datensicherungen werden im Rahmen der regulären Rotation spätestens nach 30 Tagen überschrieben.

(3) Während der Vertragslaufzeit werden Daten entsprechend der vom Auftraggeber eingestellten Löschfrist automatisch anonymisiert bzw. gelöscht.

## § 11 Nachweise und Kontrollen

(1) Der Auftragnehmer stellt dem Auftraggeber alle erforderlichen Informationen zum Nachweis der Einhaltung dieses Vertrags zur Verfügung und ermöglicht Überprüfungen einschließlich Inspektionen durch den Auftraggeber oder einen von ihm beauftragten, zur Verschwiegenheit verpflichteten Prüfer (Art. 28 Abs. 3 lit. h DSGVO).

(2) Inspektionen sind mit angemessener Frist (in der Regel 14 Tage) anzukündigen und während der üblichen Geschäftszeiten ohne vermeidbare Störung des Betriebs durchzuführen. Der Nachweis kann auch durch aktuelle Prüfberichte oder Zertifikate erbracht werden.

## § 12 Haftung

Für die Haftung gilt Art. 82 DSGVO. Im Übrigen gelten die Haftungsregelungen des Hauptvertrags.

## § 13 Schlussbestimmungen

(1) Bei Widersprüchen geht dieser Vertrag den Regelungen des Hauptvertrags vor, soweit es um den Schutz personenbezogener Daten geht.

(2) Änderungen bedürfen der Textform. Es gilt österreichisches Recht; Gerichtsstand ist der Sitz des Auftragnehmers.

(3) Dieser Vertrag wird elektronisch geschlossen (Art. 28 Abs. 9 DSGVO). Der Abschluss wird mit Zeitpunkt, Vertragsversion und der handelnden Person protokolliert.

---

## Anlage 1: Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

### Vertraulichkeit

- **Zutrittskontrolle:** Betrieb in einem Rechenzentrum in der EU ({{plattform.hostingLocation}}) mit Zutrittskontrolle, Videoüberwachung und Sicherheitspersonal des Hosting-Anbieters.
- **Zugangskontrolle:** Serverzugang nur über SSH-Schlüssel; Benutzerkonten mit Passwörtern (Argon2id-Hash, mind. 10 Zeichen), Sperre nach 5 Fehlversuchen für 15 Minuten, Zwei-Faktor-Anmeldung (TOTP) – für Plattform-Administratoren verpflichtend, für Teams des Auftraggebers erzwingbar.
- **Zugriffskontrolle:** Rollen (Inhaber:in, Leitung, Mitarbeiter:in) nach dem Need-to-know-Prinzip; Mitarbeiter:innen sehen nur eigene Termine. Strikte Mandantentrennung: jede Datenbankabfrage ist an den Betrieb gebunden, Sitzungs-Cookies sind host-gebunden. Plattform-Administratoren sehen keine Kundendaten der Betriebe.
- **Trennungskontrolle:** logische Trennung aller Daten nach Betrieb; getrennte Entwicklungs-, Test- und Produktivumgebungen; Testdaten sind fiktiv.
- **Pseudonymisierung/Verschlüsselung:** Transportverschlüsselung (TLS 1.2+, HSTS); Zugangsschlüssel Dritter (SMTP, WhatsApp) und TOTP-Geheimnisse AES-256-GCM-verschlüsselt; Sitzungs- und Link-Token nur als SHA-256-Hash gespeichert; Datensicherungen verschlüsselt.

### Integrität

- **Weitergabekontrolle:** Übermittlung nur verschlüsselt; Benachrichtigungen enthalten nur die für den Zweck nötigen Daten; Push-Nachrichten ohne Kundennamen.
- **Eingabekontrolle:** Aktivitätsprotokoll für datenschutz- und sicherheitsrelevante Aktionen (Anmeldung, Export, Löschung, Einstellungen, Vertragsabschluss), ohne IP-Adressen und Inhalte, Aufbewahrung 12 Monate.
- **Anwendungssicherheit:** Content-Security-Policy mit Nonces, Schutz gegen CSRF (Origin-Prüfung), serverseitige Validierung aller Eingaben, Rate-Limits gegen Missbrauch, Bot-Schutz ohne Drittanbieter, Bild-Uploads werden neu kodiert (Entfernung von Metadaten).

### Verfügbarkeit und Belastbarkeit

- Tägliche verschlüsselte Datensicherung mit 30 Tagen Aufbewahrung, regelmäßige Wiederherstellungstests.
- Automatischer Neustart von Diensten, Überwachung der Erreichbarkeit.
- Zeitnahes Einspielen von Sicherheitsupdates (Betriebssystem, Container, Abhängigkeiten).

### Verfahren zur regelmäßigen Überprüfung

- Datenschutzfreundliche Voreinstellungen (Art. 25 DSGVO): kein Tracking, Einwilligungen standardmäßig nicht erteilt, automatische Löschung nach der eingestellten Frist (Standard 12 Monate).
- Regelmäßige Überprüfung dieser Maßnahmen, mindestens jährlich sowie nach wesentlichen Änderungen.
- Dokumentierter Prozess für Datenschutzverletzungen und Betroffenenanfragen.

---

## Anlage 2: Unterauftragsverarbeiter

| Unterauftragsverarbeiter | Leistung | Ort der Verarbeitung |
| --- | --- | --- |
| {{plattform.hosting}} | Rechenzentrum, Server-Hosting, Datensicherung | {{plattform.hostingLocation}} |
| {{plattform.mailProvider}} | Versand von E-Mails (sofern der Auftraggeber keinen eigenen E-Mail-Server hinterlegt) | EU/EWR |

Stand: {{stand}}
`
