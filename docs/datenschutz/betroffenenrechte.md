# Bearbeitung von Betroffenenanfragen (Art. 12–22 DSGVO)

## Zuständigkeit

- Anfragen von **Kund:innen** richten sich an den **Betrieb** (Verantwortlicher). Erreicht eine solche Anfrage die Plattform, leiten wir sie unverzüglich an den Betrieb weiter und informieren die anfragende Person darüber (AVV § 7).
- Anfragen von **Teammitgliedern oder Betrieben** zu Daten, für die die Plattform Verantwortlicher ist, beantwortet die Plattform selbst.

## Frist

Antwort **innerhalb eines Monats** nach Eingang (Art. 12 Abs. 3), Verlängerung um zwei Monate nur bei komplexen Anfragen mit Begründung innerhalb des ersten Monats.

## Identitätsprüfung

- Anfrage von der hinterlegten E-Mail-Adresse oder Bestätigung über einen Link an diese Adresse.
- Kund:innen mit Konto: Selbstauskunft nach Anmeldung (Konto → „Meine Daten herunterladen“).
- Keine Ausweiskopien anfordern, wenn die Zuordnung über E-Mail möglich ist (Datenminimierung).

## Werkzeuge in der Anwendung

| Recht | So geht es | Technik |
| --- | --- | --- |
| Auskunft (Art. 15), Datenübertragbarkeit (Art. 20) | Verwaltung → Kunden → Person → „Alle Daten herunterladen (JSON)“; Kund:innen mit Konto selbst unter „Mein Konto“ | `src/lib/privacy/export.ts` – enthält Stammdaten, Termine, Einwilligungen, Warteliste, Versandprotokoll sowie Angaben nach Art. 15 Abs. 1 |
| Berichtigung (Art. 16) | Verwaltung → Kunden → Person → Kontaktdaten bearbeiten; Kund:innen mit Konto selbst | `updateCustomerAction`, `updateCustomerProfileAction` |
| Löschung (Art. 17) | Verwaltung → Kunden → Person → „Kundendaten löschen“; Kund:innen mit Konto selbst | `eraseCustomer` |
| Einschränkung (Art. 18) | interner Vermerk „Verarbeitung eingeschränkt“ und keine neuen Termine anlegen; ‹bei Bedarf technische Sperre ergänzen› | – |
| Widerspruch (Art. 21) | betrifft interne Vermerke: Vermerk löschen | Kundendetailseite |
| Widerruf der Einwilligung (Art. 7 Abs. 3) | Verwaltungslink des Termins, Kundenkonto oder Betrieb trägt den Widerruf ein | `withdrawWhatsappAction`, `withdrawCustomerWhatsappAction` |

Jeder Export und jede Löschung wird im Aktivitätsprotokoll festgehalten.

## Musterantwort Auskunft

> Guten Tag ‹Name›,
>
> vielen Dank für Ihre Anfrage vom ‹Datum›. Im Anhang finden Sie alle Daten, die wir zu Ihrer Person gespeichert haben, sowie die Angaben zu Zwecken, Empfängern und Speicherdauer. Bei Fragen erreichen Sie uns unter ‹E-Mail›. Sie haben außerdem das Recht, sich bei der Österreichischen Datenschutzbehörde zu beschweren (www.dsb.gv.at).
>
> Freundliche Grüße, ‹Betrieb›

## Protokoll der Anfragen

| Eingang | Art | Person (Initialen) | Identität geprüft | Erledigt am | Bearbeitet von | Anmerkung |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
