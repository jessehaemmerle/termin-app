// Buchungs- und Stornobedingungen eines Betriebs.
// Grundannahme: Über die Buchungsseite wird nur ein Zeitfenster reserviert; der
// entgeltliche Vertrag über die Leistung kommt vor Ort zustande, online wird nichts
// bezahlt und es fallen keine Storno- oder No-Show-Gebühren an. Werden später
// Anzahlungen oder Gebühren eingeführt, sind FAGG/KSchG neu zu prüfen.
// VOR LIVEGANG ANWALTLICH PRÜFEN LASSEN.

export const buchungsbedingungen = `
# Buchungs- und Stornobedingungen

Diese Bedingungen gelten für die Online-Terminvereinbarung bei {{betrieb.legalName}} („{{betrieb.name}}“, „wir“) über diese Buchungsseite.

## Was die Online-Buchung bedeutet

Mit der Online-Buchung reservieren Sie ein Zeitfenster für die gewählte Leistung. Der Vertrag über die Leistung selbst und deren Bezahlung erfolgen vor Ort. Über diese Buchungsseite wird nichts bezahlt, und durch die Buchung entstehen Ihnen keine Kosten.

Angegebene Preise sind Richtwerte inklusive Umsatzsteuer. Bei „ab“-Preisen hängt der Endpreis vom tatsächlichen Aufwand ab; wir besprechen ihn vor Beginn der Leistung mit Ihnen.

## Zustandekommen der Reservierung

{{#if betrieb.requireApproval}}Ihre Online-Buchung ist zunächst eine Anfrage. Die Reservierung ist erst verbindlich, wenn wir sie bestätigen; Sie erhalten dazu eine Nachricht. Können wir den Termin nicht bestätigen, informieren wir Sie ebenfalls.{{else}}Mit dem Klick auf „Termin verbindlich buchen“ ist die Reservierung verbindlich. Sie erhalten umgehend eine Bestätigung per E-Mail.{{/if}}

Bitte geben Sie korrekte Kontaktdaten an, damit wir Sie bei Änderungen erreichen können.

## Absage durch Sie

Sie können Ihren Termin über den Link in der Bestätigung kostenlos absagen:

- bis **{{betrieb.cancellationHours}} Stunden** vor Terminbeginn jederzeit online,
- unabhängig davon innerhalb von **{{betrieb.cancelGraceMinutes}} Minuten nach der Buchung** (z. B. bei einer Fehlbuchung).

Danach ist eine Online-Absage nicht mehr möglich. Bitte sagen Sie dann telefonisch{{#if betrieb.phone}} unter {{betrieb.phone}}{{/if}} oder per E-Mail an {{betrieb.email}} ab, damit wir den Platz weitergeben können. Für Absagen und Nichterscheinen werden über diese Buchungsseite keine Gebühren verrechnet.

## Absage oder Verschiebung durch uns

Müssen wir einen Termin aus wichtigem Grund (z. B. Krankheit) absagen oder verschieben, informieren wir Sie unverzüglich und bieten Ihnen nach Möglichkeit einen Ersatztermin an.

## Verspätung

Kommen Sie bitte pünktlich. Bei Verspätung kann sich die Leistung verkürzen, damit nachfolgende Termine eingehalten werden können, oder der Termin muss verschoben werden.

## Kurse und Gruppentermine

Bei Kursen reservieren Sie einen Platz. Für Absagen gilt der Abschnitt „Absage durch Sie“. Muss ein Kurs entfallen, informieren wir alle Teilnehmenden umgehend.

{{#if betrieb.waitlist}}
## Warteliste

Der Eintrag auf der Warteliste begründet keinen Anspruch auf einen Termin. Wird ein Platz frei, informieren wir alle Eingetragenen gleichzeitig; wer zuerst bucht, erhält den Termin.
{{/if}}

{{#if betrieb.accounts}}
## Kundenkonto

Das Kundenkonto ist freiwillig und gilt nur für {{betrieb.name}}. Halten Sie Ihr Passwort geheim. Sie können Ihr Konto jederzeit selbst löschen.
{{/if}}

## Rücktrittsrecht

Da über diese Buchungsseite kein entgeltlicher Vertrag geschlossen wird, sondern nur ein Zeitfenster reserviert wird, kommt das Rücktrittsrecht nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG) nicht zur Anwendung. Sie können die Reservierung wie unter „Absage durch Sie“ beschrieben kostenlos stornieren.

## Verfügbarkeit

Wir bemühen uns um eine ständige Erreichbarkeit der Buchungsseite, können diese aber nicht garantieren. Termine können Sie jederzeit auch telefonisch oder persönlich vereinbaren.

{{#if betrieb.additionalTerms}}
## Ergänzende Hinweise von {{betrieb.name}}

{{betrieb.additionalTerms}}
{{/if}}

## Datenschutz und anwendbares Recht

Wie wir mit Ihren Daten umgehen, lesen Sie in unserer [Datenschutzerklärung](/datenschutz).

Es gilt österreichisches Recht. Sind Sie Verbraucherin oder Verbraucher, bleiben die zwingenden Verbraucherschutzbestimmungen des Staates Ihres gewöhnlichen Aufenthalts unberührt.

Stand: {{stand}}
`

// Erklärung zur Barrierefreiheit (Barrierefreiheitsgesetz – BaFG, WCAG 2.1 AA / EN 301 549).
export const barrierefreiheit = `
# Erklärung zur Barrierefreiheit

{{betrieb.name}} möchte, dass alle Menschen Termine einfach online buchen können. Diese Erklärung beschreibt, wie die Buchungsseite die Anforderungen an Barrierefreiheit erfüllt.

## Grundlage

Die Buchungsseite wurde mit dem Ziel entwickelt, die Web Content Accessibility Guidelines (WCAG) 2.1 auf Konformitätsstufe AA bzw. die harmonisierte Norm EN 301 549 zu erfüllen, wie sie das österreichische Barrierefreiheitsgesetz (BaFG) für Dienstleistungen im elektronischen Geschäftsverkehr vorsieht.

## Wie die Buchungsseite zugänglich ist

- Alle Funktionen sind vollständig mit der Tastatur bedienbar; der Fokus ist jederzeit sichtbar.
- Texte und Bedienelemente haben ausreichende Kontraste; die Markenfarbe wird bei Bedarf automatisch abgedunkelt, damit Texte mindestens ein Kontrastverhältnis von 4,5 : 1 erreichen.
- Die Schrift Atkinson Hyperlegible ist auf gute Lesbarkeit, auch bei Sehbeeinträchtigungen, ausgelegt.
- Die Seite lässt sich auf 200 % vergrößern und ist auf kleinen Bildschirmen ohne horizontales Scrollen nutzbar.
- Formularfelder sind beschriftet; Fehlermeldungen werden als Text angezeigt und von Screenreadern angesagt.
- Es gibt keine Zeitbegrenzungen für das Ausfüllen von Formularen und kein Captcha.
- Die Buchung funktioniert auch ohne JavaScript.
- Animationen werden reduziert, wenn Sie das in Ihrem Betriebssystem eingestellt haben.

## Bekannte Einschränkungen

- Bilder und Texte, die {{betrieb.name}} selbst einstellt (z. B. das Logo oder Leistungsbeschreibungen), werden laufend auf Verständlichkeit geprüft.
- Externe Dienste wie WhatsApp unterliegen der Barrierefreiheit des jeweiligen Anbieters.

## Feedback und Kontakt

Sind Ihnen Barrieren aufgefallen oder benötigen Sie Unterstützung bei der Buchung? Schreiben Sie uns an {{betrieb.email}}{{#if betrieb.phone}} oder rufen Sie uns an: {{betrieb.phone}}{{/if}}. Wir antworten so rasch wie möglich und vereinbaren Ihren Termin auf Wunsch auch telefonisch.

## Durchsetzung

Wenn Sie der Ansicht sind, dass die Anforderungen des Barrierefreiheitsgesetzes nicht erfüllt werden, können Sie sich an die Marktüberwachungsbehörde wenden: Sozialministeriumservice, www.sozialministeriumservice.at.

## Hinweis für Kleinstunternehmen

Kleinstunternehmen (weniger als 10 Beschäftigte und Jahresumsatz bzw. Jahresbilanzsumme höchstens 2 Mio. Euro), die Dienstleistungen erbringen, sind von den Pflichten des BaFG ausgenommen. Trifft das auf {{betrieb.name}} zu, erfolgen die Angaben auf dieser Seite freiwillig.

Stand: {{stand}}
`
