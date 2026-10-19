# Verzeichnisse von Verarbeitungstätigkeiten (Art. 30 DSGVO)

> **Vorlage – keine Rechtsberatung.** Platzhalter ‹…› ausfüllen, mindestens jährlich und bei jeder wesentlichen Änderung prüfen. Letzte Prüfung: ‹Datum›.

Die Plattform hat zwei Rollen:

1. **Auftragsverarbeiter** für die Kundendaten der Betriebe → Verzeichnis nach Art. 30 Abs. 2 (Teil A).
2. **Verantwortlicher** für eigene Zwecke (Website, Vertragsverhältnis mit Betrieben, Sicherheit) → Verzeichnis nach Art. 30 Abs. 1 (Teil B).

Jeder Betrieb ist **Verantwortlicher** für seine Kundendaten und braucht ein eigenes Verzeichnis → Vorlage in Teil C (kann den Betrieben ausgehändigt werden).

---

## Teil A – Plattform als Auftragsverarbeiter (Art. 30 Abs. 2)

| Pflichtangabe | Inhalt |
| --- | --- |
| a) Name und Kontaktdaten des Auftragsverarbeiters | ‹Betreiber, Anschrift, E-Mail›; Datenschutzkontakt: ‹E-Mail› |
| a) Verantwortliche, in deren Auftrag verarbeitet wird | Alle Betriebe mit abgeschlossenem AVV. Die aktuelle Liste ergibt sich aus der Plattform-Verwaltung (`/betriebe`, Spalte „AVV“) bzw. der Tabelle `Tenant` (`dpaAcceptedAt`, `dpaVersion`). |
| a) Vertreter / DSB | ‹falls vorhanden› |
| b) Kategorien von Verarbeitungen | Bereitstellung der Buchungsseite; Speicherung und Verwaltung von Terminen, Kund:innen, Wartelisten und Einwilligungsnachweisen; Versand von Benachrichtigungen (E-Mail; WhatsApp und Web-Push auf Weisung); Datenexport und Löschung auf Weisung; automatisierte Anonymisierung nach der vom Betrieb festgelegten Frist; Datensicherung |
| c) Übermittlungen in Drittländer | Keine durch den Auftragsverarbeiter. WhatsApp-Versand an Meta Platforms Ireland Ltd. (mögliche Verarbeitung in den USA) nur auf ausdrückliche Weisung des Betriebs über dessen eigenes Meta-Konto. |
| d) TOM (Art. 32 Abs. 1) | siehe Anlage 1 des AVV (`docs/rechtliches/auftragsverarbeitungsvertrag.md`) und `docs/datenschutz/technische-umsetzung.md` |

---

## Teil B – Plattform als Verantwortlicher (Art. 30 Abs. 1)

**Verantwortlicher:** ‹Betreiber, Anschrift, E-Mail›

| Tätigkeit | Zweck | Betroffene | Datenkategorien | Rechtsgrundlage | Empfänger | Löschfrist |
| --- | --- | --- | --- | --- | --- | --- |
| Plattform-Website | Auslieferung, Missbrauchsabwehr | Besucher:innen | IP-Adresse (nur Arbeitsspeicher), technische Verbindungsdaten | Art. 6 Abs. 1 lit. f | Hosting | IP max. 1 Stunde im Arbeitsspeicher, keine Logs mit IP |
| Zugangsanfragen über die Website | Beantwortung, Angebot | Ansprechpersonen interessierter Betriebe | Betrieb, Name, E-Mail, optional Telefon, Branche, Teamgröße, Nachricht | Art. 6 Abs. 1 lit. b (vorvertraglich) | E-Mail-Versand (Benachrichtigung an Betreiber) | 6 Monate nach Eingang, automatisch (`runRetention`) |
| Vertragsverwaltung Betriebe | Vertragsabschluss und -abwicklung, Abrechnung | Ansprechpersonen der Betriebe | Name, Kontaktdaten, Vertrags-/AVV-Status | Art. 6 Abs. 1 lit. b, c | Steuerberatung (‹Name›) | Vertragsende + 7 Jahre (§ 132 BAO) für Buchhaltungsbelege |
| Benutzerkonten (Team, Plattform-Admins) – Sicherheit | Zugangsschutz, Nachvollziehbarkeit | Inhaber:innen, Teammitglieder, Plattform-Admins | Login-Daten (Hash), 2FA-Status, Sitzungen, Aktivitätsprotokoll ohne IP | Art. 6 Abs. 1 lit. b, c, f; Art. 32 | Hosting | Sitzungen 30 Tage; Protokoll 12 Monate; Konto bis Vertragsende |
| Web-Push für Teammitglieder | Benachrichtigung über Buchungen | Teammitglieder | Push-Endpunkt und Schlüssel | Art. 6 Abs. 1 lit. a (freiwillige Aktivierung) | Push-Dienste der Browser-Hersteller (Google, Apple, Mozilla; Inhalte Ende-zu-Ende verschlüsselt) | bis Deaktivierung bzw. Ablauf |
| Support-Anfragen | Bearbeitung | anfragende Personen | Kontaktdaten, Inhalt der Anfrage | Art. 6 Abs. 1 lit. b, f | – | 12 Monate nach Abschluss |

---

## Teil C – Vorlage für Betriebe (Art. 30 Abs. 1)

**Verantwortlicher:** ‹Name/Firma des Betriebs, Anschrift, E-Mail, ggf. DSB›

### C1 Online-Terminvereinbarung

| Feld | Inhalt |
| --- | --- |
| Zweck | Vereinbarung, Bestätigung, Durchführung und Verwaltung von Terminen; Erinnerungen; Absagen; Warteliste |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO |
| Betroffene | Kund:innen und Interessent:innen |
| Datenkategorien | Name, E-Mail, Telefonnummer (optional bzw. falls Pflicht eingestellt), Leistung, Zeitpunkt, zugeordnete Person, Status, Nachricht der Kund:in, Versandprotokoll (ohne Inhalte) |
| Empfänger | eigene Mitarbeiter:innen (rollenbasiert); Auftragsverarbeiter: Plattformbetreiber ‹Name›, Hosting ‹Name›, E-Mail-Versand ‹Plattform-Anbieter oder eigener Anbieter› |
| Drittland | nein |
| Löschfrist | ‹12› Monate nach dem Termin Anonymisierung (automatisch); Gastdaten ohne Termine nach 30 Tagen |
| TOM | gemäß AVV Anlage 1; zusätzlich: ‹eigene Maßnahmen, z. B. Gerätesperre, Schulung› |

### C2 WhatsApp-Benachrichtigungen (nur wenn aktiviert)

| Feld | Inhalt |
| --- | --- |
| Zweck | Bestätigung, Erinnerung, Änderung und Absage von Terminen sowie Wartelisten-Hinweise per WhatsApp |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, nachgewiesen in `ConsentRecord` mit Textversion und Zeitpunkt) |
| Datenkategorien | Mobilnummer, Leistung, Datum, Uhrzeit, Verwaltungslink |
| Empfänger | Meta Platforms Ireland Ltd. (Auftragsverarbeiter des Betriebs nach den WhatsApp Business Data Processing Terms) |
| Drittland | USA möglich; Angemessenheitsbeschluss EU-US Data Privacy Framework (Art. 45), ergänzend SCC (Art. 46); siehe `transfer-impact-assessment-whatsapp.md` |
| Löschfrist | Einwilligungsnachweis solange Kundendaten bestehen; bei Meta gemäß deren Bedingungen |

### C3 Kundenkonten (nur wenn aktiviert)

| Feld | Inhalt |
| --- | --- |
| Zweck | Komfortable Buchung, Terminübersicht |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO |
| Datenkategorien | Name, E-Mail, Telefon, Passwort-Hash (Argon2id), optional 2FA-Geheimnis (verschlüsselt), Sitzungen |
| Löschfrist | auf Wunsch sofort (Selbstlöschung); automatisch ohne Termine und Aktivität nach ‹12› Monaten |

### C4 Interne Vermerke zu Kund:innen

| Feld | Inhalt |
| --- | --- |
| Zweck | Gute Betreuung (z. B. Vorlieben) |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO, Interessenabwägung siehe `interessenabwaegungen.md` |
| Einschränkung | keine Gesundheitsdaten oder sonstigen besonderen Kategorien (Art. 9) |

### C5 Teamverwaltung (Beschäftigtendaten)

| Feld | Inhalt |
| --- | --- |
| Zweck | Dienstplanung (Arbeitszeiten, Abwesenheiten), Zugang zur Terminverwaltung |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO (Arbeitsvertrag), ggf. Betriebsvereinbarung nach § 96a ArbVG prüfen |
| Datenkategorien | Name, E-Mail, Rolle, Arbeitszeiten, Abwesenheiten (ohne Gründe/Krankheitsangaben) |
| Hinweis | Abwesenheiten neutral bezeichnen („Urlaub“, „Abwesend“) – keine Krankenstände als Grund eintragen (Gesundheitsdaten). |
