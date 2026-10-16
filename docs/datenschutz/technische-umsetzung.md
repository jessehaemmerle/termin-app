# Technische Umsetzung der Datenschutz- und Sicherheitsanforderungen

Zuordnung der Anforderungen zu den Stellen im Code – als Nachweis (Art. 5 Abs. 2, Art. 24, 25, 32 DSGVO) und als Einstieg für Prüfungen.

| Anforderung | Umsetzung | Code |
| --- | --- | --- |
| Mandantentrennung | Betrieb wird ausschließlich aus dem Host-Header abgeleitet, jede Abfrage enthält `tenantId`; Sitzungen sind an Betrieb und Host gebunden (`__Host-`-Cookies) | `src/proxy.ts`, `src/lib/hosts.ts`, `src/lib/tenant.ts`, `src/lib/auth/guards.ts` |
| Need-to-know (Rollen) | Inhaber:in / Leitung / Mitarbeiter:in; Mitarbeiter:innen sehen nur eigene Termine; Plattform-Admins sehen keine Kundendaten | `src/lib/auth/guards.ts` (`PERMISSIONS`), `src/lib/admin/queries.ts` (`bookingScope`) |
| Passwörter | Argon2id (19 MiB, t=2), Mindestlänge 10, Sperre nach 5 Fehlversuchen für 15 Minuten, Laufzeitangleich bei unbekannten Konten | `src/lib/auth/password.ts`, `src/lib/auth/flows.ts` |
| Zwei-Faktor | TOTP (RFC 6238) mit Wiederherstellungscodes (nur Hash gespeichert); für Plattform-Admins Pflicht, für Teams erzwingbar | `src/lib/auth/totp.ts`, `src/lib/auth/two-factor.ts` |
| Sitzungen | 256-Bit-Zufallstoken, in der DB nur SHA-256-Hash, HttpOnly, SameSite=Lax, Secure + `__Host-` in Produktion, 30 Tage absolut, „Alle Geräte abmelden“ | `src/lib/auth/session.ts` |
| Einmal-Links | 256 Bit, nur Hash gespeichert, kurze Gültigkeit, Einmalverwendung | `src/lib/auth/tokens.ts` |
| Sichere Registrierung | Passwort erst nach E-Mail-Bestätigung festlegbar (keine Kontoübernahme fremder Gastdaten); keine Auskunft, ob ein Konto existiert | `src/app/site/[key]/(public)/konto/actions.ts` |
| Verschlüsselung ruhender Geheimnisse | AES-256-GCM für SMTP-Passwörter, WhatsApp-Token, TOTP-Geheimnisse, Verwaltungslinks | `src/lib/crypto.ts` |
| Transportverschlüsselung | TLS über Caddy (automatisch Let’s Encrypt), HSTS, `upgrade-insecure-requests` | `deploy/Caddyfile`, `src/proxy.ts` |
| Content-Security-Policy | Nonce pro Anfrage, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'` | `src/proxy.ts` |
| Weitere Header | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP | `next.config.ts` |
| CSRF | Origin-Prüfung von Next.js für Server Actions; eigene Prüfung für Route-Handler | Next.js, `src/lib/same-origin.ts` |
| Eingabevalidierung | zod-Schemas in allen Server Actions; Telefonnummern via libphonenumber | `src/app/**/actions.ts`, `src/lib/phone.ts` |
| Bot-Schutz ohne Drittanbieter | Honeypot, Mindestbearbeitungszeit, Rate-Limit pro IP (nur Arbeitsspeicher) | `src/lib/booking/public-form.ts`, `src/lib/rate-limit.ts` |
| Doppelbuchungen | Advisory-Lock pro Betrieb + Exclusion-Constraint in PostgreSQL | `src/lib/booking/service.ts`, `prisma/migrations/*_init` |
| Upload-Sicherheit | nur PNG/JPEG/WebP, max. 1 MB, Neukodierung mit sharp (entfernt EXIF/GPS), Auslieferung mit `nosniff` und Sandbox-CSP | `src/lib/branding.ts`, `src/app/site/[key]/assets/[file]/route.ts` |
| Rechtstexte ohne XSS-Risiko | Markdown ohne rohes HTML, Betriebsangaben werden maskiert | `src/lib/legal/template.ts`, `src/components/legal-document.tsx` |
| Datenminimierung | Telefonnummer optional; keine IP-Speicherung; Nachrichteninhalte nicht gespeichert; Push ohne Kundennamen; WhatsApp-Vorlagen ohne Namen | `src/lib/notifications/*` |
| Einwilligung (Art. 7) | eigenes, nicht vorangekreuztes Kästchen, vollständiger Text, Versionierung, Nachweis mit Zeitpunkt und Quelle, Widerruf so einfach wie Erteilung | `src/lib/legal/consent.ts`, `ConsentRecord`, Verwaltungslink |
| Speicherbegrenzung | automatische Anonymisierung/Löschung (siehe Löschkonzept) | `src/lib/jobs/maintenance.ts`, `src/lib/privacy/erase.ts` |
| Betroffenenrechte | Export (JSON), Berichtigung, Löschung, Widerruf – für Betrieb und Kund:innen | `src/lib/privacy/export.ts`, Kundenseiten |
| Rechenschaft | Aktivitätsprotokoll ohne IP/Inhalte, 12 Monate | `src/lib/audit.ts` |
| Kein Tracking, kein Cookie-Banner nötig | ausschließlich notwendige Sitzungs-Cookies; Schriften lokal; keine Drittinhalte; Next.js-Telemetrie im Container deaktiviert | `src/app/layout.tsx`, `Dockerfile` |
| PWA ohne Datenreste | Service Worker cacht nur statische Programmdateien und die Offline-Seite | `public/sw.js` |
| Barrierefreiheit (BaFG, WCAG 2.1 AA) | Tastaturbedienung, sichtbarer Fokus, Kontrast-Absicherung der Markenfarbe, Formular-Labels, `aria-live`-Fehlermeldungen, Skip-Link, Zielgrößen ≥ 44 px, reduzierte Bewegung | `src/lib/color.ts`, `src/components/*`, `tests/e2e/*` (axe) |
