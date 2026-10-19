# Löschkonzept (Art. 5 Abs. 1 lit. e, Art. 17, Art. 25 DSGVO)

Grundsatz: Daten werden **automatisch** gelöscht oder anonymisiert, sobald der Zweck entfällt. Umsetzung im Worker (`src/lib/jobs/maintenance.ts`, Job „Löschfristen“, stündlich) und in `src/lib/privacy/erase.ts`.

## Fristen

| Datenart | Frist | Auslöser | Methode | Umsetzung |
| --- | --- | --- | --- | --- |
| Termine (Bezug zur Person, Nachricht, Telefonnummer, Verwaltungslink) | Löschfrist des Betriebs (3–36 Monate, Standard 12) nach Terminende | Zeit | Anonymisierung: Termin bleibt ohne Personenbezug für die Statistik | `runRetention` → `anonymizeBookings` |
| Gastkund:innen | 30 Tage nach letzter Aktivität, sobald keine (nicht anonymisierten) Termine und keine Wartelisten-Einträge mehr bestehen | Zeit | Löschung | `runRetention` |
| Kundenkonten | Löschfrist des Betriebs nach letzter Aktivität, sofern keine Termine mehr bestehen; jederzeit per Selbstlöschung | Zeit / Antrag | Löschung inkl. Einwilligungsnachweisen, Sitzungen | `runRetention`, `deleteAccountAction` |
| Löschung auf Antrag (Art. 17) | sofort | Antrag bei Betrieb | zukünftige Termine absagen, Termine anonymisieren, Datensatz löschen | `eraseCustomer` (Verwaltung → Kunden) |
| Wartelisten-Einträge | Ende des Wunschtages bzw. Beginn des Kurstermins | Zeit | Löschung | `runRetention` |
| Einwilligungsnachweise | solange die Kundendaten bestehen | Löschung der Kund:in | Löschung (Kaskade) | Datenbank-Fremdschlüssel |
| Sitzungen | 30 Tage (absolute Laufzeit), bei Abmeldung sofort | Zeit / Abmeldung | Löschung | `runRetention`, `destroySession` |
| Einmal-Links (Einladung, Passwort, Bestätigung) | 1–72 Stunden Gültigkeit; Löschung 24 Stunden nach Ablauf/Verwendung | Zeit | Löschung | `runRetention` |
| Versandprotokoll von Benachrichtigungen (ohne Inhalte) | 90 Tage | Zeit | Löschung | `runRetention` |
| Aktivitätsprotokoll | 12 Monate | Zeit | Löschung | `runRetention` |
| Zugangsanfragen (Plattform-Website) | 6 Monate nach Eingang | Zeit | Löschung | `runRetention` |
| Push-Abos | bei Deaktivierung, Ablauf beim Push-Dienst (404/410) oder Deaktivierung des Teamzugangs | Ereignis | Löschung | `sendPushToUser`, `runRetention` |
| IP-Adressen | höchstens 1 Stunde, nur im Arbeitsspeicher | Zeit | Verwerfen | `src/lib/rate-limit.ts` |
| Daten eines Betriebs nach Vertragsende | 30 Tage nach Vertragsende (vorher Gesamtexport durch den Betrieb möglich) | Vertragsende | Betrieb sperren, dann endgültig löschen (Kaskade über alle Tabellen) | Plattform-Verwaltung → Betrieb → „Endgültig löschen“ (`deleteTenantAction`) |
| Datensicherungen | 30 Tage Rotation | Zeit | Überschreiben | Backup-Konfiguration (siehe `docs/betrieb.md`) |

## Nicht automatisch gelöscht

- Rechnungen und Buchhaltungsunterlagen des Plattformbetreibers (7 Jahre, § 132 BAO) – liegen nicht in dieser Anwendung.
- Belege, die Betriebe vor Ort ausstellen, unterliegen deren eigener Aufbewahrungspflicht und sind nicht Teil der Anwendung.

## Kontrolle

- Der Worker protokolliert je Betrieb, wie viele Termine anonymisiert und Datensätze gelöscht wurden (Aktivitätsprotokoll, Aktion „Automatische Löschung durchgeführt“).
- Quartalsweise Stichprobe: ‹Verantwortliche Person› prüft per SQL, dass keine Termine mit Personenbezug älter als die Frist existieren:
  `SELECT count(*) FROM "Booking" b JOIN "Tenant" t ON t.id = b."tenantId" WHERE b."customerId" IS NOT NULL AND b."endsAt" < now() - (t."retentionMonths" || ' months')::interval;`
