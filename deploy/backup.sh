#!/usr/bin/env bash
# Tägliche, verschlüsselte Datenbanksicherung mit 30 Tagen Aufbewahrung.
# Einrichtung (Host, als root):  crontab -e  ->  15 3 * * * /opt/termin-app/deploy/backup.sh
# Voraussetzung: age (https://age-encryption.org) und ein öffentlicher Schlüssel in BACKUP_AGE_RECIPIENT.
# Den privaten Schlüssel NICHT auf dem Server aufbewahren.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-/var/backups/termin-app}"
RECIPIENT="${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT (age-Public-Key) fehlt}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
file="$BACKUP_DIR/termin-$(date +%Y%m%d-%H%M%S).sql.gz.age"

docker compose exec -T db sh -c 'pg_dump --format=plain --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 \
  | age --encrypt --recipient "$RECIPIENT" > "$file"

chmod 600 "$file"
find "$BACKUP_DIR" -name 'termin-*.sql.gz.age' -mtime +"$RETENTION_DAYS" -delete
echo "Sicherung erstellt: $file"
