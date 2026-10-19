# Sicherheitsreview (Oktober 2026)

Interne Code-Prüfung vor dem ersten Livegang, aufgeteilt in drei Bereiche: Mandantentrennung und Berechtigungen im Verwaltungsbereich, öffentliche Buchung mit Kundenkonten und Anmeldung, Plattform mit Infrastruktur, Worker und Kryptografie. Gemeldet wurden nur Befunde mit konkretem Angriffsweg. Jeder Befund wurde nachgeprüft.

**Ergebnis:** keine kritischen Lücken, keine Lücke zwischen Betrieben. Sieben Befunde wurden behoben. Ein externer Penetrationstest vor dem Produktivbetrieb bleibt empfohlen.

## Behobene Befunde

| # | Schwere | Befund | Behebung |
| --- | --- | --- | --- |
| 1 | Mittel | **Plattformzugriff auf Kundendaten über offene Einladungen.** „Einladung erneut senden“ im Plattformbereich erzeugte für *jede* offene Inhaber-Einladung (auch für später eingeladene Mitinhaber:innen) einen Link und zeigte ihn an. Ein Plattform-Admin hätte damit einen Inhaber-Zugang samt Kundendaten erhalten. | Nur noch möglich, solange der Betrieb keine eingerichtete Inhaber:in hat; Protokolleintrag. |
| 2 | Mittel | **SMTP-Passwort auslesbar.** Server und Port ließen sich ändern, während das gespeicherte Passwort erhalten blieb; der Verbindungstest schickte es dann an den neuen (fremden) Server. | Bei geändertem Server, Port oder Benutzer muss das Passwort neu eingegeben werden, sonst wird es verworfen. |
| 3 | Mittel | **SSRF über eigenen SMTP-Server.** Ein Hostname konnte auf interne Adressen (Datenbank, Docker-Netz, Cloud-Metadaten) zeigen; Fehlermeldungen gaben Serverantworten wieder. | Auflösung prüfen und nur öffentliche Adressen zulassen, Verbindung zur geprüften Adresse (gegen DNS-Rebinding), Ports 25/465/587/2525, eigene Fehlermeldungen. |
| 4 | Mittel | **Gastbuchung mit fremder E-Mail-Adresse.** Die Buchung wurde dem bestehenden Datensatz zugeordnet: Der Verwaltungslink zeigte den hinterlegten Namen, Name und Telefonnummer wurden überschrieben, WhatsApp-Einwilligungen ließen sich setzen oder für alle Termine widerrufen. | Gastangaben ändern bestehende Datensätze nicht mehr und übernehmen keine gespeicherten Daten; WhatsApp nur bei derselben, bereits eingewilligten Nummer; Verwaltungslink zeigt nur die angegebenen Kontaktdaten und widerruft nur für die dort angegebene Nummer. Integrationstest ergänzt. |
| 5 | Niedrig | **Konto-Ermittlung über die Sperrmeldung.** Nach fünf Fehlversuchen meldeten nur echte Konten „gesperrt“. | Einheitliche Meldung für falsches Passwort und Sperre. |
| 6 | Niedrig | **„Andere Geräte abmelden“ vor der Zwei-Faktor-Anmeldung** möglich und ohne Prüfung des Betriebs. | Vollständige Anmeldung erforderlich. |
| 7 | Niedrig | **Ungeprüfte gebundene Argumente.** Server Actions erhalten mit `bind` gebundene IDs ungeprüft vom Client, auch als Objekt (z. B. Prisma-Filter `{ in: [...] }`). Mitarbeiter:innen hätten so ggf. Termine anderer bearbeiten können; außerdem konnten Mitarbeiter:innen beim Anlegen eines Termins beliebige Kund:innen per ID verknüpfen. | Laufzeitprüfung aller gebundenen IDs und Statuswerte; Auswahl bestehender Kund:innen nur mit Berechtigung für die Kundenliste. |

## Bewusst akzeptierte Restrisiken

| Thema | Bewertung | Empfehlung |
| --- | --- | --- |
| Eigene Domain wird nach der Bestätigung nicht erneut geprüft | Lässt ein Betrieb die Domain auslaufen, ohne sie zu entfernen, könnten Links in E-Mails (z. B. Verwaltungslinks) bei einer neuen Inhaberin bzw. einem neuen Inhaber der Domain landen. | TXT-Eintrag regelmäßig im Worker prüfen und die Bestätigung bei Fehlschlag aufheben. |
| Unbestätigte Domains blockieren andere Betriebe | Nur Verfügbarkeit betroffen; Betriebe werden von der Plattform angelegt. | Im Konfliktfall durch den Plattformbetrieb klären; ggf. Ablauf unbestätigter Domains nach einigen Tagen. |
| TOTP-Codes innerhalb des Zeitfensters wiederverwendbar | Erfordert bereits das Passwort; Versuche sind begrenzt. | Zuletzt verwendeten Zeitschritt speichern. |
| Mitarbeiter:innen können über die E-Mail-Adresse einen Termin mit bestehender Kundin anlegen und sehen dann deren Namen | Innentäter:innen beim Verantwortlichen; jede Buchung wird protokolliert. | Bei Bedarf Anlegen von Terminen auf Leitung beschränken. |
| Kursbuchung mit fremder E-Mail meldet „bereits gebucht“ | Gibt nur preis, ob diese Adresse diesen Kurs gebucht hat. | Bei sensiblen Kursangeboten Meldung vereinheitlichen. |

## Geprüft und ohne Befund

Mandantentrennung (Betrieb nur aus dem Host-Header, alle Abfragen mit `tenantId`, Sitzungen an Betrieb und Host gebunden), Rollen und Rechte aller Server Actions, Seiten und Exporte, Einmal-Links (256 Bit, nur Hash, Zweck, Ablauf, Betrieb), Zwei-Faktor-Pflicht in allen Guards, Sitzungsverwaltung, Proxy und Routing (direkte Aufrufe von `/site/…` und `/platform/…`), interne Endpunkte, eigene Domains (TXT-Bestätigung, Zertifikate nur für bestätigte Domains), Logo-Upload und Auslieferung, CSP und Header, E-Mail-HTML (Maskierung, erlaubte Link-Schemata), Rechtstexte (kein rohes HTML), WhatsApp-API-Aufrufe, Web-Push, Verschlüsselung (AES-256-GCM mit zufälligem IV), Container- und Netzkonfiguration.

## Nachprüfung (Oktober 2026, nach Plattform-Website)

Sicherheit, Backend, Barrierefreiheit und Design wurden erneut geprüft. Keine ausnutzbaren Lücken in den neuen Teilen (Anfrageformular, Anmelden-Weiterleitung, Plattform-Manifest, Proxy-Ausnahme `/brand/`). Umgesetzt:

- SSRF-Schutz erkennt auch IPv4-kompatible und SIIT-IPv6-Adressen (`::127.0.0.1`, `::ffff:0:…`); Zeitsperre im Anfrageformular verpflichtend
- Statusänderungen ohne Doppel-Benachrichtigung: Zeilensperre bei Absage/Entscheidung, bedingtes Verfallen offener Anfragen im Worker
- Zeitlimits für SMTP, Web-Push und je Zustellung; Worker erhält 30 s zum Beenden
- Fehlermeldungen in Logs und Versandprotokoll ohne E-Mail-Adressen/Telefonnummern; Versandprotokolle werden mit der Anonymisierung gelöscht
- Sommerzeit-Lücke erzeugt keine doppelten Termine; kein Verschieben in die Vergangenheit
- Indizes für Slot-Berechnung, Worker und Löschfristen
- Barrierefreiheit: `aria-invalid` an fehlerhaften Feldern, Fehlermeldung wird nur einmal angesagt, Tageskalender per Tastatur scrollbar, größere Zielflächen, kein seitliches Scrollen der Website am Handy

Offen (bewusst): Rate-Limits im Arbeitsspeicher setzen genau eine App-Instanz voraus (in `docker-compose.yml` vermerkt).
