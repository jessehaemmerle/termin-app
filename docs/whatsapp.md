# WhatsApp-Benachrichtigungen einrichten

Jeder Betrieb nutzt sein **eigenes** WhatsApp-Business-Konto über die WhatsApp Business Platform (Cloud API) von Meta. Die Plattform sendet nur im Auftrag des Betriebs und nur an Kund:innen mit dokumentierter Einwilligung.

## Voraussetzungen

1. Meta-Business-Konto (business.facebook.com) mit verifiziertem Unternehmen.
2. WhatsApp-Business-Konto (WABA) mit einer Telefonnummer, die **nicht** gleichzeitig in der normalen WhatsApp- oder WhatsApp-Business-App verwendet wird.
3. Ein **System-Benutzer** mit der Berechtigung `whatsapp_business_messaging` und ein dauerhafter Zugangsschlüssel (Access Token).
4. Die **Phone-Number-ID** (WhatsApp Manager → Telefonnummern).

## Vorlagen anlegen

Nachrichten außerhalb des 24-Stunden-Fensters dürfen nur mit genehmigten Vorlagen gesendet werden. Im WhatsApp Manager vier Vorlagen in der Kategorie **Utility**, Sprache **Deutsch** (`de`) anlegen. Die Namen sind in den Einstellungen änderbar, die Reihenfolge der Platzhalter ist fest:

| Name (Standard) | Platzhalter | Vorschlag für den Text |
| --- | --- | --- |
| `termin_bestaetigung` | {{1}} Leistung, {{2}} Datum, {{3}} Uhrzeit, {{4}} Link | Ihr Termin für {{1}} am {{2}} um {{3}} Uhr ist bestätigt. Details und Absage: {{4}} |
| `termin_erinnerung` | {{1}} Leistung, {{2}} Datum, {{3}} Uhrzeit, {{4}} Link | Erinnerung: Ihr Termin für {{1}} ist am {{2}} um {{3}} Uhr. Details und Absage: {{4}} |
| `termin_absage` | {{1}} Leistung, {{2}} Datum, {{3}} Uhrzeit, {{4}} Link zur Neubuchung | Ihr Termin für {{1}} am {{2}} um {{3}} Uhr wurde abgesagt. Neuen Termin buchen: {{4}} |
| `termin_warteliste` | {{1}} Leistung, {{2}} Datum, {{3}} Link | Für {{1}} am {{2}} ist ein Termin frei geworden. Jetzt buchen: {{3}} |

Bewusst **ohne Namen** der Kund:in (Datenminimierung, siehe Transfer Impact Assessment).

## In der App aktivieren

Verwaltung → Einstellungen → WhatsApp: Phone-Number-ID, Zugangsschlüssel und Vorlagennamen eintragen, die Bestätigung zum Meta-Vertrag anhaken, aktivieren und eine Testnachricht an die eigene Nummer senden.

Mit der Aktivierung erscheinen automatisch:

- das freiwillige Einwilligungskästchen bei der Buchung (nicht vorangekreuzt),
- der Abschnitt „Benachrichtigung per WhatsApp“ in der Datenschutzerklärung des Betriebs,
- die Möglichkeit zum Widerruf im Verwaltungslink und im Kundenkonto.

## Technik

- Endpunkt: `POST https://graph.facebook.com/{WHATSAPP_GRAPH_VERSION}/{phone-number-id}/messages` (Version per Umgebungsvariable, Standard `v23.0` – vor dem Livegang auf die aktuelle Graph-API-Version prüfen).
- Fehler 4xx (z. B. unbekannte Vorlage, ungültige Nummer) gelten als dauerhaft und werden nicht wiederholt; 5xx und 429 werden mit Backoff bis zu fünfmal wiederholt.
- `WHATSAPP_DRY_RUN=true` protokolliert statt zu senden (Entwicklung, Tests). Telefonnummern werden in Logs maskiert.

## Ohne Cloud API: wa.me-Links

Hinterlegt ein Betrieb unter „Allgemein“ eine WhatsApp-Nummer, zeigt die Buchungsseite einen Link „Nachricht per WhatsApp“ (`https://wa.me/…`). Es werden erst Daten an WhatsApp übertragen, wenn eine Person den Link anklickt. Im Verwaltungsbereich gibt es bei Kund:innen mit WhatsApp-Einwilligung einen Link, der WhatsApp auf dem eigenen Gerät mit vorausgefüllter Nachricht öffnet.
