// Texte des Plattformbetreibers: Datenschutzerklärung der Plattform und
// Nutzungsbedingungen für Betriebe (B2B). VOR LIVEGANG ANWALTLICH PRÜFEN LASSEN.

export const datenschutzPlattform = `
# Datenschutzerklärung der Plattform {{plattform.name}}

Diese Erklärung informiert gemäß Art. 13 DSGVO über die Datenverarbeitung durch {{plattform.operator.name}} als **Verantwortlichen** – auf dieser Plattform-Website und für die Benutzerkonten von Betrieben und deren Teams.

Für die Daten der Endkundinnen und Endkunden, die über die Buchungsseiten der Betriebe Termine buchen, ist der jeweilige **Betrieb verantwortlich**. {{plattform.operator.name}} verarbeitet diese Daten ausschließlich als Auftragsverarbeiter nach Weisung des Betriebs (Art. 28 DSGVO). Informationen dazu finden Sie in der Datenschutzerklärung auf der jeweiligen Buchungsseite.

## Verantwortlicher

{{plattform.operator.name}}\\
{{plattform.operator.street}}, {{plattform.operator.postalCode}} {{plattform.operator.city}}, {{plattform.operator.country}}\\
E-Mail für Datenschutzanfragen: {{plattform.operator.privacyEmail}}

## Aufruf der Website

Beim Aufruf verarbeitet der Server technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung), um die Seite auszuliefern und vor Missbrauch zu schützen. Die IP-Adresse wird nur kurzzeitig im Arbeitsspeicher gehalten und nicht dauerhaft gespeichert. Rechtsgrundlage: berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO).

Es gibt kein Tracking, keine Analyse- oder Werbe-Cookies und keine eingebundenen Inhalte Dritter.

## Benutzerkonten von Betrieben und Teammitgliedern

**Daten:** Name, E-Mail-Adresse, Rolle, Passwort (nur als Argon2id-Hash), optional Daten zur Zwei-Faktor-Anmeldung, Zeitpunkt der letzten Anmeldung, Sitzungsdaten sowie ein Aktivitätsprotokoll sicherheits- und datenschutzrelevanter Aktionen (ohne IP-Adressen und ohne Inhalte).

**Zwecke und Rechtsgrundlagen:**

- Bereitstellung des Zugangs zur Software gemäß Vertrag mit dem Betrieb (Art. 6 Abs. 1 lit. b DSGVO gegenüber Inhaberinnen und Inhabern; gegenüber Teammitgliedern Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse an der Vertragserfüllung gegenüber dem Betrieb),
- Sicherheit der Plattform, Nachvollziehbarkeit von Änderungen und Erfüllung der Rechenschaftspflicht (Art. 5 Abs. 2, Art. 32 DSGVO; Art. 6 Abs. 1 lit. c und f DSGVO).

**Sitzungs-Cookie:** Nach der Anmeldung wird ein technisch notwendiges Cookie gesetzt (höchstens 30 Tage, § 165 Abs. 3 TKG 2021).

**Push-Benachrichtigungen (freiwillig):** Teammitglieder können in der installierten App Push-Benachrichtigungen über neue Buchungen aktivieren. Dabei speichern wir die vom Browser erzeugte Push-Adresse. Die Zustellung erfolgt über den Push-Dienst des Browser- bzw. Betriebssystemherstellers (z. B. Google, Apple, Mozilla); die Inhalte sind Ende-zu-Ende verschlüsselt und enthalten keine Namen von Kundinnen und Kunden. Die Aktivierung ist freiwillig und kann jederzeit im Profil oder in den Browser-Einstellungen widerrufen werden (Art. 6 Abs. 1 lit. a DSGVO).

**Speicherdauer:** Benutzerkonten bis zur Löschung durch den Betrieb bzw. bis zum Vertragsende; Aktivitätsprotokolle 12 Monate; Sitzungen höchstens 30 Tage.

## Kontaktaufnahme und Vertragsabwicklung mit Betrieben

Wenn Sie uns kontaktieren oder ein Betrieb einen Vertrag mit uns schließt, verarbeiten wir Kontakt- und Vertragsdaten zur Bearbeitung und Abwicklung (Art. 6 Abs. 1 lit. b DSGVO) sowie zur Erfüllung gesetzlicher Aufbewahrungspflichten (Art. 6 Abs. 1 lit. c DSGVO, z. B. § 132 BAO: 7 Jahre für Buchhaltungsunterlagen).

## Empfänger

- Hosting: {{plattform.hosting}}; Standort: {{plattform.hostingLocation}}
- E-Mail-Versand: {{plattform.mailProvider}}

Die genannten Dienstleister sind als Auftragsverarbeiter vertraglich gebunden. Eine Übermittlung in Drittländer findet durch uns nicht statt.

## Ihre Rechte

Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie auf Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO). Wenden Sie sich an {{plattform.operator.privacyEmail}}.

Beschwerden können Sie bei der Österreichischen Datenschutzbehörde einbringen: Barichgasse 40–42, 1030 Wien, dsb@dsb.gv.at, www.dsb.gv.at.

Stand: {{stand}}
`

export const nutzungsbedingungen = `
# Nutzungsbedingungen für Betriebe

Vertragsbedingungen zwischen {{plattform.operator.name}} („Anbieter“) und dem nutzenden Unternehmen („Betrieb“) für die Terminbuchungs-Software {{plattform.name}}.

## 1. Geltungsbereich

Diese Bedingungen gelten ausschließlich gegenüber Unternehmern im Sinne des § 1 KSchG bzw. § 1 UGB. Abweichende Bedingungen des Betriebs gelten nur, wenn der Anbieter ihnen schriftlich zustimmt. Entgelt, Laufzeit und individuelle Leistungen werden gesondert vereinbart.

## 2. Leistungen

Der Anbieter stellt dem Betrieb eine Online-Software zur Terminbuchung und -verwaltung zur Verfügung, insbesondere eine Buchungsseite mit dem Branding des Betriebs, einen Verwaltungsbereich, Benachrichtigungen per E-Mail, optional per WhatsApp (über ein eigenes WhatsApp-Business-Konto des Betriebs) sowie Web-Push. Der Anbieter darf die Software weiterentwickeln, sofern wesentliche Funktionen erhalten bleiben.

Der Anbieter bemüht sich um eine hohe Verfügbarkeit, schuldet aber keine bestimmte Verfügbarkeit, sofern nicht gesondert vereinbart. Wartungsarbeiten werden nach Möglichkeit vorab angekündigt.

## 3. Pflichten des Betriebs

Der Betrieb

- hält Impressum, Kontakt- und Unternehmensangaben auf seiner Buchungsseite vollständig und aktuell;
- prüft die von der Software bereitgestellten Rechtstexte (Datenschutzerklärung, Buchungsbedingungen, Barrierefreiheitserklärung) auf seine Verhältnisse und ergänzt sie bei Bedarf; diese Vorlagen stellen keine Rechtsberatung dar;
- verarbeitet über die Software keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO), insbesondere keine Gesundheitsdaten;
- nutzt WhatsApp nur auf Grundlage eines eigenen Vertrags mit Meta, hält die WhatsApp Business-Richtlinien ein und versendet keine Werbung;
- schützt Zugangsdaten, vergibt Rollen nach dem Need-to-know-Prinzip und aktiviert für Konten mit weitreichenden Rechten die Zwei-Faktor-Anmeldung;
- beantwortet Anfragen betroffener Personen als Verantwortlicher; der Anbieter unterstützt dabei gemäß Auftragsverarbeitungsvertrag.

## 4. Datenschutz

Der Anbieter verarbeitet personenbezogene Daten der Kundinnen und Kunden des Betriebs ausschließlich als Auftragsverarbeiter. Grundlage ist der Auftragsverarbeitungsvertrag (AVV), der vor Freischaltung der Buchungsseite elektronisch abgeschlossen wird (Art. 28 Abs. 9 DSGVO).

## 5. Vertragsdauer, Kündigung und Datenrückgabe

Der Vertrag läuft auf unbestimmte Zeit und kann, sofern nicht anders vereinbart, von beiden Seiten mit einer Frist von einem Monat zum Monatsende gekündigt werden. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

Bis zum Vertragsende kann der Betrieb seine Daten exportieren. Nach Vertragsende löscht der Anbieter alle Daten des Betriebs innerhalb von 30 Tagen; Sicherungskopien werden im Rahmen der regulären Rotation (höchstens 30 Tage) überschrieben.

## 6. Sperre

Der Anbieter darf eine Buchungsseite vorübergehend sperren, wenn konkrete Anhaltspunkte für eine rechtswidrige Nutzung bestehen oder die Sicherheit der Plattform gefährdet ist. Der Betrieb wird unverzüglich informiert.

## 7. Haftung

Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Personenschäden. Bei leichter Fahrlässigkeit haftet der Anbieter nur für die Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, vertragstypischen Schaden, höchstens jedoch auf das Entgelt der letzten zwölf Monate. Die Haftung nach Art. 82 DSGVO bleibt unberührt.

## 8. Änderungen

Änderungen dieser Bedingungen werden dem Betrieb mindestens sechs Wochen vor Inkrafttreten mitgeteilt. Widerspricht der Betrieb nicht innerhalb dieser Frist, gelten die Änderungen als angenommen; auf diese Folge wird in der Mitteilung hingewiesen. Bei Widerspruch kann jede Seite den Vertrag zum Zeitpunkt des Inkrafttretens kündigen.

## 9. Schlussbestimmungen

Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen und des UN-Kaufrechts. Gerichtsstand ist das für den Sitz des Anbieters sachlich zuständige Gericht. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.

Stand: {{stand}}
`
