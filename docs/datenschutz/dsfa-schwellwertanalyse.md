# Schwellwertanalyse zur Datenschutz-Folgenabschätzung (Art. 35 DSGVO)

> **Vorlage – keine Rechtsberatung.** Ergebnis bei jeder wesentlichen Änderung (neue Branchen, Marketing, Profiling, neue Empfänger) erneut prüfen. Stand: ‹Datum›, geprüft von: ‹Name›.

## Gegenstand

Online-Terminbuchung für kleine Betriebe (Friseur, Kosmetik, Werkstatt, Beratung u. ä.) mit Benachrichtigung per E-Mail und – nach Einwilligung – per WhatsApp. **Gesundheitsberufe sind ausdrücklich ausgeschlossen** (Nutzungsbedingungen, AVV § 2 Abs. 4).

## Prüfschritt 1: Österreichische Listen der Datenschutzbehörde

| Liste | Ergebnis |
| --- | --- |
| DSFA-Verordnung (DSFA-V, BGBl. II Nr. 278/2018) – Verarbeitungen, für die eine DSFA durchzuführen ist | Keiner der Tatbestände erfüllt: keine Bewertung/Scoring, keine automatisierte Entscheidung mit Rechtswirkung, keine systematische Überwachung, keine besonderen Kategorien in großem Umfang, keine Zusammenführung von Datensätzen aus verschiedenen Quellen, keine neuen Technologien mit hohem Risiko, keine Standortdaten. |
| DSFA-Ausnahmenverordnung (DSFA-AV, BGBl. II Nr. 108/2018) | Kundenverwaltung und Terminvereinbarung typischer Kleinbetriebe entsprechen den dort beschriebenen Standardanwendungen (Kunden-/Lieferantenverwaltung). ‹Konkrete Ziffer vor Livegang verifizieren.› |

## Prüfschritt 2: Kriterien der Leitlinien WP 248 rev.01 (EDSA)

Faustregel: Sind zwei oder mehr Kriterien erfüllt, ist eine DSFA in der Regel erforderlich.

| Kriterium | erfüllt? | Begründung |
| --- | --- | --- |
| 1. Bewerten/Einstufen (Scoring, Profiling) | nein | keine Profile, keine Auswertungen über Personen |
| 2. Automatisierte Entscheidung mit Rechtswirkung | nein | Freigabe von Anfragen erfolgt durch Menschen; Slot-Vergabe ist rein kapazitätsbasiert |
| 3. Systematische Überwachung | nein | kein Tracking, keine Logs mit IP-Adressen |
| 4. Sensible oder höchstpersönliche Daten | nein | Gesundheitsdaten ausgeschlossen; Hinweise an allen Freitextfeldern |
| 5. Verarbeitung in großem Umfang | nein (je Betrieb) | pro Verantwortlichem kleine Kundenzahlen; die Plattform verarbeitet zwar viele Datensätze, jedoch logisch getrennt und für unterschiedliche Verantwortliche |
| 6. Abgleich/Zusammenführung von Datensätzen | nein | strikte Mandantentrennung, keine plattformweiten Konten |
| 7. Schutzbedürftige Betroffene | nein | keine gezielte Verarbeitung von Kinderdaten; WhatsApp-Einwilligung ab 14 (§ 4 Abs. 4 DSG) |
| 8. Innovative Technologie | nein | etablierte Web-Technologie; WhatsApp ist ein verbreiteter Kanal |
| 9. Hindert Betroffene an der Ausübung eines Rechts / Nutzung eines Dienstes | nein | Buchung jederzeit auch telefonisch/persönlich möglich; WhatsApp ist freiwillig |

**Zwischenergebnis:** 0 von 9 Kriterien erfüllt.

## Prüfschritt 3: Besondere Betrachtung WhatsApp (Drittlandbezug)

Ein Drittlandtransfer ist für sich kein WP-248-Kriterium. Er wird gesondert im Transfer Impact Assessment (`transfer-impact-assessment-whatsapp.md`) bewertet. Risikomindernd: Einwilligung, Datenminimierung (nur Leistung, Datum, Uhrzeit, Link; kein Name in der Vorlage), jederzeitiger Widerruf, E-Mail bleibt vollwertige Alternative.

## Ergebnis

Eine Datenschutz-Folgenabschätzung ist für den beschriebenen Einsatz **nicht erforderlich**. Die Analyse ist zu dokumentieren und aufzubewahren (Rechenschaftspflicht, Art. 5 Abs. 2).

## Auslöser für eine Neubewertung

- Zulassung von Gesundheitsberufen (Physio, Therapie, Ärzt:innen) oder anderen Art.-9-Kontexten → DSFA voraussichtlich erforderlich (schon die Tatsache eines Termins kann ein Gesundheitsdatum sein)
- Einführung von Marketing-Nachrichten, Auswertungen über Kund:innen oder No-Show-Scoring
- Plattformweite Kundenkonten oder Datenaustausch zwischen Betrieben
- Neue Empfänger außerhalb der EU (z. B. SMS-Dienstleister, Analysewerkzeuge)
- Online-Zahlungen, Anzahlungen, Gebühren
