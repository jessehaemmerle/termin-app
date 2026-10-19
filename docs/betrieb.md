# Betrieb: Installation, Updates, Sicherung

## Voraussetzungen

- Server in der EU (z. B. 2 vCPU, 4 GB RAM) mit Docker Engine und Docker Compose Plugin
- Domain für die Plattform, z. B. `termin-app.at`, mit DNS-Einträgen:
  - `A`/`AAAA` für `termin-app.at` und `*.termin-app.at` auf den Server
- Offene Ports 80 und 443 (TCP) sowie 443/UDP (HTTP/3)
- SMTP-Zugang eines EU-Anbieters für den Plattform-Versand
- Optional: [age](https://age-encryption.org) für verschlüsselte Backups

## Erstinstallation

```bash
git clone <repo> /opt/termin-app && cd /opt/termin-app
cp .env.example .env
```

In `.env` mindestens setzen:

| Variable | Wert |
| --- | --- |
| `PLATFORM_BASE_URL` | `https://termin-app.at` |
| `PLATFORM_NAME` | Name der Plattform |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` – **sicher aufbewahren**, ohne ihn sind gespeicherte Zugangsdaten und Verwaltungslinks nicht mehr lesbar |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` – nur Buchstaben und Ziffern, da es in die Verbindungs-URL eingesetzt wird (sonst Fehler P1013) |
| `ACME_EMAIL` | Kontakt für Let’s Encrypt |
| `OPERATOR_*`, `HOSTING_*`, `MAIL_PROVIDER` | Betreiberangaben für Impressum, Datenschutzerklärung und AVV |
| `SMTP_*` | Plattform-E-Mail-Versand |
| `VAPID_*` | `npx web-push generate-vapid-keys` |
| `WHATSAPP_GRAPH_VERSION` | aktuelle Version der Graph API prüfen |

`TRUST_PROXY` und `COOKIE_SECURE` setzt `docker-compose.yml` in Produktion automatisch auf `true`.

```bash
docker compose up -d --build
```

Den ersten Plattform-Admin anlegen (das Startpasswort wird einmalig ausgegeben; beim ersten Login ist 2FA einzurichten):

```bash
docker compose run --rm -e PLATFORM_ADMIN_EMAIL=du@example.at -e PLATFORM_ADMIN_NAME="Vorname Nachname" \
  app node dist/create-platform-admin.mjs
```

Dasselbe Kommando setzt bei einem bestehenden Plattform-Admin Passwort und 2FA zurück (Notfallzugang, nur mit Serverzugriff möglich) und beendet alle Sitzungen.

Danach unter `https://termin-app.at/login` anmelden, 2FA einrichten und unter „Betriebe“ den ersten Betrieb anlegen.

## Dienste

| Dienst | Aufgabe |
| --- | --- |
| `caddy` | HTTPS (Let’s Encrypt, On-Demand für Subdomains und eigene Domains), HSTS, keine Zugriffsprotokolle |
| `app` | Next.js-Anwendung (Buchungsseiten, Verwaltung, Plattform) |
| `worker` | Versand (E-Mail, WhatsApp, Push), Erinnerungen, Statuspflege, Löschfristen |
| `migrate` | wendet Datenbankmigrationen beim Start an und beendet sich |
| `db` | PostgreSQL 16, nur im internen Netz erreichbar |

Alle Anwendungscontainer laufen als Nicht-root-Benutzer mit schreibgeschütztem Dateisystem, ohne Linux-Capabilities und mit `no-new-privileges`.

## Updates

```bash
cd /opt/termin-app
git pull
docker compose up -d --build
```

Migrationen laufen automatisch (Dienst `migrate`). Vor größeren Updates ein Backup erstellen.

Sicherheitsupdates: Basis-Images (`node:22-bookworm-slim`, `postgres:16-alpine`, `caddy:2.10-alpine`) und npm-Abhängigkeiten mindestens monatlich aktualisieren (`npm audit`, `docker compose build --pull`).

## Sicherung und Wiederherstellung

Tägliche, mit age verschlüsselte Sicherung, 30 Tage Aufbewahrung (siehe Löschkonzept):

```bash
age-keygen -o backup-key.txt        # privaten Schlüssel NICHT auf dem Server lassen
export BACKUP_AGE_RECIPIENT=age1…   # öffentlicher Schlüssel, z. B. in /etc/environment
crontab -e
# 15 3 * * * cd /opt/termin-app && BACKUP_AGE_RECIPIENT=age1… ./deploy/backup.sh >> /var/log/termin-backup.log 2>&1
```

Sicherungen zusätzlich an einen zweiten Ort in der EU kopieren (z. B. Storage Box) und **vierteljährlich die Wiederherstellung testen**:

```bash
age --decrypt -i backup-key.txt termin-….sql.gz.age | gunzip | docker compose exec -T db psql -U termin -d termin_restore
```

## Überwachung

- Healthcheck der App: `/api/internal/health` (nur intern; Caddy blockt `/api/internal/*` von außen)
- `docker compose ps` zeigt den Zustand aller Dienste
- Logs: `docker compose logs -f app worker` (rotiert, max. 30 MB je Dienst). Logs enthalten keine IP-Adressen; Telefonnummern werden maskiert.
- Fehlgeschlagene Benachrichtigungen sehen Betriebe im Versandprotokoll eines Termins.

## Schlüsselrotation

- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: jederzeit änderbar (offene Formulare müssen neu geladen werden).
- `APP_ENCRYPTION_KEY`: Wechsel erfordert Neuverschlüsselung aller Felder mit Suffix `Enc` (SMTP-Passwörter, WhatsApp-Token, TOTP, Verwaltungslinks). Bis ein Migrationsskript existiert: Schlüssel nur bei Verdacht auf Kompromittierung wechseln und betroffene Betriebe bitten, SMTP/WhatsApp-Zugangsdaten neu einzugeben und 2FA neu einzurichten.
- VAPID-Schlüssel: Wechsel macht bestehende Push-Abos ungültig (Teammitglieder aktivieren Push neu).

## Vertragsende eines Betriebs

1. Betrieb exportiert seine Daten (Einstellungen → Datenschutz → Gesamtexport).
2. Plattform-Admin sperrt den Betrieb (alle Sitzungen werden beendet).
3. Nach 30 Tagen: Plattform-Admin löscht den Betrieb endgültig (Eingabe der Subdomain zur Bestätigung).
4. Backups mit diesen Daten laufen innerhalb von 30 Tagen aus.

## Einzelinstanz für einen Betrieb

`SINGLE_TENANT_SLUG=<slug>` setzen: Jede Domain zeigt dann diesen Betrieb, der Plattformbereich liegt unter `/plattform`. Den Betrieb vorher mit genau diesem Slug anlegen.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env    # APP_ENCRYPTION_KEY setzen
npx prisma migrate dev
npm run db:seed         # Demo-Betriebe „mayer“ und „huber“
npm run dev             # http://mayer.localhost:3000, http://huber.localhost:3000, Plattform: http://localhost:3000
npm run worker          # zweites Terminal; E-Mails landen ohne SMTP in .mail/
```
