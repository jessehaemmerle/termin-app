# Termin-App

White-Label-Plattform für die Online-Terminbuchung kleiner Betriebe (Friseur, Kosmetik, Werkstatt, Beratung …) – mandantenfähig, als App installierbar (PWA), mit Benachrichtigungen per E-Mail, WhatsApp und Web-Push. Ausgelegt auf österreichisches Recht (DSGVO, DSG, ECG, MedienG, TKG 2021, BaFG).

> **Rechtlicher Hinweis:** Die mitgelieferten Rechtstexte und Compliance-Dokumente sind sorgfältig erstellte Vorlagen, aber **keine Rechtsberatung**. Vor dem Livegang von einer Rechtsanwältin bzw. einem Rechtsanwalt prüfen lassen (Prüfexemplare in [`docs/rechtliches/`](docs/rechtliches/)).

## Funktionen

**Für Kund:innen (Buchungsseite je Betrieb, mobil optimiert)**
- Buchung in vier Schritten: Leistung → Person (oder „Keine Präferenz“) → Tag und Uhrzeit → Angaben; funktioniert auch ohne JavaScript
- „Nächster freier Termin“ direkt auf der Startseite
- Kurse/Gruppentermine mit Platzanzahl, Warteliste für volle Tage und Kurse
- Verwaltungslink zum Ansehen und Absagen (Stornofrist plus 30 Minuten Kulanz nach der Buchung)
- Optionales Kundenkonto (nur für den jeweiligen Betrieb) mit 2FA, Datenexport und Selbstlöschung
- Als App installierbar (eigenes Manifest und Symbol je Betrieb), Offline-Hinweis

**Für Betriebe (Verwaltung, ebenfalls als App installierbar)**
- „Heute“-Übersicht, Kalender (Tag mit Spalten je Person, Woche), Terminliste, telefonische Buchungen
- Freigabe-Modus (Anfragen bestätigen/ablehnen), Verschieben, Absagen, Nicht erschienen
- Leistungen mit Dauer, Pufferzeiten, Preisen; Ressourcen mit Kapazität (z. B. 2 Hebebühnen)
- Team: Arbeitszeiten, Abwesenheiten, Einladungen, Rollen (Inhaber:in, Leitung, Mitarbeiter:in)
- Kunden mit Auskunft (JSON-Export), Berichtigung, Löschung, Einwilligungsnachweisen
- White-Label: Logo, Markenfarbe (automatisch barrierefrei abgesichert), eigene Domain mit automatischem HTTPS, eigener E-Mail-Server
- WhatsApp Business Cloud API über das eigene Meta-Konto (nur nach Einwilligung), sonst wa.me-Links
- Web-Push für das Team, Aktivitätsprotokoll, Gesamtexport

**Für den Plattformbetreiber**
- Website mit Funktionen, Datenschutz, Preis, häufigen Fragen und Anfrageformular; Seite „Anmelden“ führt Teams zu ihrem Betrieb
- Zugangsanfragen im Plattformbereich (Benachrichtigung per E-Mail, automatische Löschung nach 6 Monaten)
- Betriebe anlegen, Inhaber:in einladen, sperren, nach Vertragsende löschen
- Keine Einsicht in Kundendaten der Betriebe (Auftragsverarbeitung nur auf Weisung)
- Verpflichtende 2FA für Plattform-Admins

## Datenschutz auf einen Blick

| Prinzip | Umsetzung |
| --- | --- |
| Kein Tracking, kein Cookie-Banner nötig | nur notwendige Sitzungs-Cookies (§ 165 Abs. 3 TKG 2021), Schriften lokal, keine Drittinhalte |
| Rollen | Betriebe = Verantwortliche, Plattform = Auftragsverarbeiter mit AVV (Art. 28), elektronisch abgeschlossen |
| Speicherbegrenzung | automatische Anonymisierung nach 12 Monaten (je Betrieb 3–36 Monate) |
| WhatsApp | nur nach separater, nicht vorangekreuzter Einwilligung mit Nachweis; Widerruf mit einem Klick |
| Datenminimierung | Telefon optional, keine IP-Speicherung, keine Nachrichteninhalte in der Datenbank, Push ohne Namen |
| Sicherheit | Argon2id, 2FA, gehashte Tokens, AES-256-GCM für Geheimnisse, CSP mit Nonce, strikte Mandantentrennung |

Details: [`docs/datenschutz/technische-umsetzung.md`](docs/datenschutz/technische-umsetzung.md)

## Technik

Next.js 16 (App Router, Server Actions) · TypeScript · Prisma 7 + PostgreSQL 16 · Tailwind CSS 4 · Worker-Prozess für Versand und Löschfristen · Caddy (On-Demand-TLS) · Docker Compose

## Schnellstart (Entwicklung)

Voraussetzungen: Node.js 22, PostgreSQL 16 mit Erweiterung `btree_gist`.

```bash
npm install
cp .env.example .env              # APP_ENCRYPTION_KEY setzen: openssl rand -base64 32
npx prisma migrate dev
npm run db:seed                   # Demo-Daten
npm run dev
npm run worker                    # zweites Terminal
```

| Adresse | Inhalt |
| --- | --- |
| http://mayer.localhost:3000 | Demo-Friseur (Kurse, Färbeplatz als Ressource) |
| http://huber.localhost:3000 | Demo-Werkstatt (Freigabe-Modus, 2 Hebebühnen, gelbe Markenfarbe) |
| http://mayer.localhost:3000/admin | Verwaltung: `anna@friseur-mayer.example` (Inhaberin) bzw. `ben@friseur-mayer.example` (Mitarbeiter) |
| http://huber.localhost:3000/admin | Verwaltung: `chef@huber.example` |
| http://localhost:3000/login | Plattform-Admin: `admin@example.at` (2FA wird beim ersten Login eingerichtet) |

Demo-Passwort für alle: `demo-passwort-123`. Ohne SMTP-Konfiguration landen E-Mails als JSON in `.mail/`, WhatsApp läuft mit `WHATSAPP_DRY_RUN=true` im Testmodus.

## Tests

```bash
npm run lint && npm run typecheck
npm test                          # Unit-Tests (Slot-Berechnung, Zeitzonen, Kontrast, Templates, Krypto …)
npm run test:integration          # gegen termin_test-Datenbank: Doppelbuchungen bei Nebenläufigkeit, Löschfristen, Export/Löschung
npm run build && npm run test:e2e # Playwright mobil + Desktop, inkl. axe (WCAG 2.1 AA), Cookie-/Drittanbieter-Prüfung, Mandantentrennung
```

## Produktion

Siehe [`docs/betrieb.md`](docs/betrieb.md): Docker Compose mit Caddy, Datenbank im internen Netz, Container ohne root und mit schreibgeschütztem Dateisystem, verschlüsselte Backups.

## Dokumentation

| Dokument | Inhalt |
| --- | --- |
| [`docs/betrieb.md`](docs/betrieb.md) | Installation, Updates, Backups, Schlüsselrotation, Vertragsende |
| [`docs/whatsapp.md`](docs/whatsapp.md) | WhatsApp-Einrichtung für Betriebe, Vorlagen |
| [`docs/sicherheitsreview.md`](docs/sicherheitsreview.md) | Ergebnisse der internen Sicherheitsprüfung, akzeptierte Restrisiken |
| [`docs/rechtliches/`](docs/rechtliches/) | Prüfexemplare: Impressum, Datenschutzerklärungen, Buchungsbedingungen, Barrierefreiheit, Nutzungsbedingungen, AVV mit TOM (erzeugt mit `npx tsx scripts/export-legal.ts`) |
| [`docs/datenschutz/verarbeitungsverzeichnis.md`](docs/datenschutz/verarbeitungsverzeichnis.md) | Art. 30 für Plattform und Vorlage für Betriebe |
| [`docs/datenschutz/dsfa-schwellwertanalyse.md`](docs/datenschutz/dsfa-schwellwertanalyse.md) | Art. 35, DSFA-V/DSFA-AV, WP 248 |
| [`docs/datenschutz/transfer-impact-assessment-whatsapp.md`](docs/datenschutz/transfer-impact-assessment-whatsapp.md) | Drittlandtransfer Meta |
| [`docs/datenschutz/interessenabwaegungen.md`](docs/datenschutz/interessenabwaegungen.md) | Art. 6 Abs. 1 lit. f |
| [`docs/datenschutz/loeschkonzept.md`](docs/datenschutz/loeschkonzept.md) | Fristen und Umsetzung |
| [`docs/datenschutz/datenschutzverletzungen.md`](docs/datenschutz/datenschutzverletzungen.md) | Art. 33/34, Verletzungsregister |
| [`docs/datenschutz/betroffenenrechte.md`](docs/datenschutz/betroffenenrechte.md) | Art. 12–22, Werkzeuge, Musterantwort |
| [`docs/datenschutz/technische-umsetzung.md`](docs/datenschutz/technische-umsetzung.md) | Anforderungen ↔ Code |

## Vor dem Livegang

- [ ] Rechtstexte, AVV und Nutzungsbedingungen anwaltlich prüfen lassen; Fassungsdatum `LEGAL_VERSION_DATE` (`src/lib/legal/context.ts`) und bei Änderungen `DPA_VERSION`/`TERMS_VERSION` (`src/lib/legal/consent.ts`) anpassen
- [ ] Betreiberangaben (`OPERATOR_*`), Hosting- und E-Mail-Anbieter in `.env` eintragen und AVV mit diesen Unterauftragsverarbeitern abschließen
- [ ] Platzhalter ‹…› in `docs/datenschutz/*` ausfüllen (Zuständigkeiten, Prüfdaten), DSFA-AV-Ziffer verifizieren
- [ ] DPF-Zertifizierung von Meta prüfen und im TIA dokumentieren; aktuelle Graph-API-Version in `WHATSAPP_GRAPH_VERSION` setzen
- [ ] Plattformnamen auf Markenrechte prüfen (ÖPA/EUIPO), `PLATFORM_NAME` setzen
- [ ] Backups einrichten und Wiederherstellung testen
- [ ] Penetrationstest bzw. externes Security-Review vor Produktivbetrieb mit echten Kundendaten; offene Punkte aus [`docs/sicherheitsreview.md`](docs/sicherheitsreview.md) bewerten

## Projektstruktur

```
src/proxy.ts                  Host → Plattform/Betrieb, CSP-Nonce
src/app/platform/             Plattform-Website und -Verwaltung
src/app/site/[key]/(public)/  Buchungsseite, Kurse, Warteliste, Kundenkonto, Rechtstexte
src/app/site/[key]/admin/     Verwaltung der Betriebe
src/lib/booking/              Verfügbarkeit (rein funktional), Buchungsdienst
src/lib/auth/                 Sitzungen, Passwörter, 2FA, Rollen
src/lib/notifications/        E-Mail, WhatsApp, Push, Inhalte
src/lib/jobs/ + src/worker/   Versand-Outbox, Erinnerungen, Löschfristen
src/lib/legal/                Rechtstext-Vorlagen (Markdown) und Einwilligungstexte
prisma/                       Schema, Migrationen, Demo-Daten
deploy/                       Caddyfile, Backup-Skript
```
