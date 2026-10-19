import Link from 'next/link'
import type { Metadata } from 'next'
import { env, platformBase } from '@/lib/env'
import { platformPath } from '@/lib/tenant'
import { platformUrl } from '@/lib/urls'
import { Icon, type IconName } from '@/components/icons'
import { buttonClass } from '@/components/ui'
import { AccessRequestForm } from './_components/access-request-form'

export async function generateMetadata(): Promise<Metadata> {
  const name = env().PLATFORM_NAME
  const description = `${name}: die eigene Online-Terminbuchung für kleine Betriebe – mit Ihrem Logo, als App installierbar, mit Erinnerungen per E-Mail und WhatsApp. Gehostet in der EU, ohne Tracking.`
  return {
    title: { absolute: `${name} – Online-Terminbuchung für kleine Betriebe` },
    description,
    alternates: { canonical: platformUrl('/') },
    openGraph: { title: `${name} – Online-Terminbuchung für kleine Betriebe`, description, url: platformUrl('/'), siteName: name, locale: 'de_AT', type: 'website' },
  }
}

const STEPS = [
  { title: 'Zugang anfragen', text: 'Sie schicken uns eine kurze Anfrage. Wir richten Ihren Betrieb ein und senden Ihnen die Einladung.' },
  { title: 'Einrichten in 15 Minuten', text: 'Logo und Farbe hochladen, Leistungen mit Dauer und Preis anlegen, Öffnungszeiten und Team eintragen.' },
  { title: 'Link teilen', text: 'Ihre Buchungsseite unter eigener Adresse auf Website, Google-Profil, Instagram oder per QR-Code an der Kasse teilen.' },
]

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar', title: 'Buchen rund um die Uhr', text: 'Kund:innen wählen Leistung, Person und freie Zeit – in vier Schritten, auch ohne Konto.' },
  { icon: 'bell', title: 'Weniger Ausfälle', text: 'Bestätigung und Erinnerung per E-Mail, auf Wunsch per WhatsApp. Absagen mit einem Klick geben den Platz frei.' },
  { icon: 'team', title: 'Für das ganze Team', text: 'Kalender mit Spalte pro Person, Arbeitszeiten, Urlaube, Rollen und Push-Nachrichten bei neuen Buchungen.' },
  { icon: 'box', title: 'Ressourcen und Puffer', text: 'Behandlungsräume, Hebebühnen oder Plätze mit Kapazität, Vor- und Nachbereitungszeiten, Vorlaufzeit.' },
  { icon: 'group', title: 'Kurse und Warteliste', text: 'Gruppentermine mit Platzanzahl. Wird etwas frei, erfahren Interessierte es automatisch.' },
  { icon: 'phone', title: 'Als App installierbar', text: 'Buchungsseite und Verwaltung lassen sich wie eine App auf dem Handy installieren – ohne App-Store.' },
  { icon: 'today', title: 'Freigabe-Modus', text: 'Wenn Sie lieber selbst entscheiden: Buchungen kommen als Anfrage und werden von Ihnen bestätigt.' },
  { icon: 'settings', title: 'Ihr Name, Ihre Marke', text: 'Logo, Markenfarbe, eigene Domain und eigener E-Mail-Absender. Ihre Kund:innen sehen Ihren Betrieb.' },
]

const PRIVACY: [string, string][] = [
  ['Hosting in der EU', 'Server und Datenbank stehen in der Europäischen Union.'],
  ['Kein Tracking, kein Cookie-Banner', 'Keine Analyse-Tools, keine Werbung, keine eingebundenen Drittinhalte – nur technisch notwendige Cookies.'],
  ['Rechtstexte inklusive', 'Impressum, Datenschutzerklärung und Buchungsbedingungen werden aus Ihren Angaben erzeugt, der AVV wird online abgeschlossen.'],
  ['Automatische Löschung', 'Alte Termine werden nach der von Ihnen gewählten Frist anonymisiert. Auskunft und Löschung mit einem Klick.'],
  ['WhatsApp nur mit Einwilligung', 'Eigenes, nicht vorangekreuztes Kästchen, Nachweis der Einwilligung und Widerruf mit einem Klick.'],
  ['Barrierefrei', 'Gestaltet nach WCAG 2.1 AA: gut lesbar, mit Tastatur bedienbar, ausreichende Kontraste – auch bei Ihrer Markenfarbe.'],
]

const INDUSTRIES = ['Friseur', 'Kosmetik & Nagelstudio', 'Massage & Wellness', 'Kfz-Werkstatt', 'Beratung & Coaching', 'Fotostudio', 'Kurse & Workshops', 'Tierpflege', 'Reparatur & Service']

function faq(name: string, price: string | null): [string, string][] {
  return [
    ['Brauchen meine Kund:innen ein Konto?', 'Nein. Gebucht wird mit Name und E-Mail-Adresse. Wer möchte, kann ein Kundenkonto anlegen, um Termine zu sehen und schneller zu buchen.'],
    ['Wie funktioniert die WhatsApp-Benachrichtigung?', `Sie verbinden Ihre eigene WhatsApp-Business-Nummer über die offizielle Schnittstelle von Meta. Nachrichten gehen nur an Kund:innen, die ausdrücklich eingewilligt haben. Ohne Verbindung kann Ihr Team Kund:innen trotzdem mit einem Klick per WhatsApp anschreiben.`],
    ['Kann ich meine eigene Domain verwenden?', `Ja. Sie bekommen sofort eine Adresse wie ihr-betrieb.${'{host}'} und können zusätzlich eine eigene Domain wie termine.ihr-betrieb.at verbinden – das HTTPS-Zertifikat wird automatisch eingerichtet.`],
    ['Ist das DSGVO-konform?', `${name} ist auf österreichisches und europäisches Datenschutzrecht ausgelegt: Hosting in der EU, Auftragsverarbeitungsvertrag, Datensparsamkeit, automatische Löschfristen und vorbereitete Rechtstexte. Für die Inhalte Ihrer Rechtstexte bleiben Sie als Betrieb verantwortlich.`],
    ['Für welche Betriebe ist das geeignet?', 'Für kleine Betriebe mit Terminen: Dienstleistungen, Werkstätten, Beratung, Kurse. Nicht vorgesehen ist der Einsatz im Gesundheitsbereich (z. B. Arztpraxen, Therapie), weil dort besondere Datenschutzanforderungen gelten.'],
    ['Gibt es eine Mindestlaufzeit?', price ? 'Nein. Der Vertrag ist monatlich kündbar. Ihre Daten können Sie jederzeit vollständig exportieren.' : 'Die Konditionen besprechen wir gerne persönlich. Ihre Daten können Sie jederzeit vollständig exportieren.'],
    ['Was passiert mit meinen Daten, wenn ich kündige?', 'Sie exportieren Ihre Daten, danach löschen wir den Betrieb mit allen Kundendaten. Datensicherungen laufen innerhalb von 30 Tagen aus.'],
  ]
}

/** Volle Breite trotz zentriertem Inhaltsbereich (Layout begrenzt auf max-w-6xl). */
function Band({ className = '', children, id, labelledBy }: { className?: string; children: React.ReactNode; id?: string; labelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`mx-[calc(50%-50vw)] px-4 scroll-mt-16 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

/** Stilisierte Buchungsseite wie im echten Ablauf (reines HTML, keine Bilddatei). */
function PhonePreview() {
  const days = [['Mo', '20'], ['Di', '21'], ['Mi', '22'], ['Do', '23'], ['Fr', '24']]
  const times = ['09:00', '09:30', '10:30', '13:30', '14:00', '15:30']
  return (
    <div aria-hidden="true" className="relative mx-auto w-[17.5rem] select-none max-md:scale-90 max-md:-my-6">
      <div className="rounded-[2.4rem] bg-ink p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        <div className="rounded-[1.9rem] bg-paper overflow-hidden text-ink">
          <div className="bg-surface border-b border-rule px-5 pt-6 pb-3">
            <p className="font-display font-semibold">Friseur Mayer</p>
            <p className="text-[0.7rem] text-graphite mt-2">Schritt 3 von 4</p>
            <div className="mt-1 h-1 rounded-full bg-rule"><div className="h-1 w-3/4 rounded-full bg-accent" /></div>
          </div>
          <div className="px-4 py-3 space-y-3">
            <p className="text-sm flex justify-between"><span className="font-semibold">Damenhaarschnitt</span> <span className="text-graphite font-figures">45 Min. · 48 €</span></p>
            <div className="grid grid-cols-5 gap-1.5">
              {days.map(([d, n], i) => (
                <div key={d} className={`rounded-lg py-1.5 text-center ${i === 1 ? 'bg-brand text-on-brand' : 'bg-surface border border-rule'}`}>
                  <span className="block text-[0.65rem]">{d}</span>
                  <span className="block font-figures font-semibold text-sm">{n}</span>
                </div>
              ))}
            </div>
            <p className="text-[0.7rem] font-semibold text-graphite uppercase tracking-wide">Vormittag</p>
            <div className="grid grid-cols-3 gap-1.5">
              {times.slice(0, 3).map((t, i) => (
                <span key={t} className={`rounded-lg py-1.5 text-center font-figures text-sm font-semibold ${i === 2 ? 'bg-accent-soft border-[1.5px] border-accent' : 'bg-surface border border-rule'}`}>{t}</span>
              ))}
            </div>
            <p className="text-[0.7rem] font-semibold text-graphite uppercase tracking-wide">Nachmittag</p>
            <div className="grid grid-cols-3 gap-1.5">
              {times.slice(3).map((t) => (
                <span key={t} className="rounded-lg py-1.5 text-center font-figures text-sm font-semibold bg-surface border border-rule">{t}</span>
              ))}
            </div>
            <div className="rounded-lg bg-brand text-on-brand text-center py-2 text-sm font-semibold">Weiter</div>
          </div>
        </div>
      </div>
      <ReminderBubble className="absolute -right-8 bottom-16" />
    </div>
  )
}

function ReminderBubble({ className = '' }: { className?: string }) {
  return (
    <div className={`w-48 rounded-xl bg-surface text-ink border border-rule shadow-lg px-3 py-2.5 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-text"><Icon name="whatsapp" className="size-4" /> Erinnerung</p>
      <p className="text-xs mt-0.5">Morgen, 10:30 Uhr: Damenhaarschnitt bei Friseur Mayer</p>
    </div>
  )
}

const LEAD_FEATURES = FEATURES.filter((f) => f.title === 'Weniger Ausfälle' || f.title === 'Ihr Name, Ihre Marke')
const MORE_FEATURES = FEATURES.filter((f) => !LEAD_FEATURES.includes(f))

export default function PlatformHome() {
  const e = env()
  const host = platformBase().hostname
  const price = e.PRICE_MONTHLY || null
  const questions = faq(e.PLATFORM_NAME, price).map(([q, a]) => [q, a.replace('{host}', host)] as const)
  const operator = e.OPERATOR_NAME && !e.OPERATOR_NAME.startsWith('(') ? [e.OPERATOR_NAME, e.OPERATOR_CITY].filter(Boolean).join(', ') : null

  return (
    <div className="-mt-10 md:-mt-16">
      {/* Einstieg */}
      <Band labelledBy="hero-titel" className="bg-brand text-on-brand pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-sm text-white/90">
              <Icon name="shield" className="size-4 text-accent" /> Gehostet in der EU · ohne Tracking
            </p>
            <h1 id="hero-titel" className="font-display text-[2.5rem] leading-[1.02] md:text-[3.75rem] font-semibold tracking-tight">
              Ihre eigene Buchungsseite – in 15&nbsp;Minuten online.
            </h1>
            <p className="text-base md:text-lg text-white/85 max-w-[52ch]">
              Mit Ihrem Logo und Ihren Farben, als App installierbar, mit Erinnerungen per E-Mail und WhatsApp – und einem Kalender, den Ihr ganzes Team versteht.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <a href="#anfrage" className={buttonClass('primary', '!bg-accent !text-ink')}>Zugang anfragen</a>
              <a href="#funktionen" className={buttonClass('secondary', '!bg-transparent !text-white !border-white/50 hover:!border-white')}>Funktionen</a>
            </div>
            <p className="text-sm text-white/80">
              {price ? `${price} ${e.PRICE_NOTE}.` : 'Ein Tarif mit allen Funktionen.'} Keine Provision pro Buchung.
            </p>
          </div>
          <PhonePreview />
        </div>
      </Band>

      {/* So geht's: als liniertes Terminbuch statt Kartenraster */}
      <section aria-labelledby="ablauf-titel" className="py-16 md:py-20 space-y-8">
        <h2 id="ablauf-titel" className="font-display text-3xl md:text-4xl font-semibold tracking-tight">In drei Schritten online buchbar</h2>
        <ol className="grid md:grid-cols-3 border-t-2 border-ink">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-b border-rule md:border-b-0 md:border-r last:border-r-0 py-6 md:px-6 md:first:pl-0">
              <span className="font-figures font-display text-5xl font-semibold text-accent-text">{i + 1}</span>
              <h3 className="font-semibold text-lg mt-2">{s.title}</h3>
              <p className="text-graphite mt-1 max-w-[40ch]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Funktionen */}
      <section id="funktionen" aria-labelledby="funktionen-titel" className="pb-20 space-y-10 scroll-mt-16">
        <div className="max-w-2xl space-y-3">
          <h2 id="funktionen-titel" className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Alles, was ein kleiner Betrieb braucht</h2>
          <p className="text-lg text-graphite max-w-[62ch]">Ohne Zusatzmodule und ohne Einarbeitungswoche. Gemacht für das Handy an der Theke genauso wie für den Bildschirm im Büro.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {LEAD_FEATURES.map((f) => (
            <div key={f.title} className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-6 md:p-8 flex flex-col gap-6">
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-lg bg-accent-soft text-accent-text"><Icon name={f.icon} /></span>
                <h3 className="font-display text-2xl font-semibold mt-4">{f.title}</h3>
                <p className="text-graphite mt-2 max-w-[48ch]">{f.text}</p>
              </div>
              {f.icon === 'bell' ? (
                <ReminderBubble className="self-start" />
              ) : (
                <div aria-hidden="true" className="flex items-center gap-2">
                  {['#0c3563', '#b4472c', '#2f6b3a', '#6b3fa0', '#d9a21b'].map((c) => (
                    <span key={c} className="size-8 rounded-full ring-2 ring-white shadow" style={{ background: c }} />
                  ))}
                  <span className="text-sm text-graphite ml-2">Ihre Farbe – Kontrast automatisch geprüft</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text"><Icon name={f.icon} /></span>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-graphite text-sm mt-0.5">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-graphite">
          <span className="font-semibold text-ink">Passt zum Beispiel für </span>
          {INDUSTRIES.join(' · ')}
        </p>
      </section>

      {/* Datenschutz */}
      <Band id="datenschutz" labelledBy="datenschutz-titel" className="bg-ink text-white py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-5">
            <Icon name="shield" className="size-10 text-accent" />
            <h2 id="datenschutz-titel" className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Datenschutz ist eingebaut, nicht nachgerüstet</h2>
            <p className="text-lg text-white/80 max-w-[48ch]">
              Ausgelegt auf österreichisches Recht – DSGVO, Datenschutzgesetz, E-Commerce-Gesetz und Barrierefreiheitsgesetz. Sie sparen sich Recherche, Cookie-Banner und Zusatz-Tools.
            </p>
            <dl className="grid grid-cols-2 gap-4 pt-2">
              <div><dt className="text-sm text-white/70">Server-Standort</dt><dd className="font-display text-3xl font-semibold">EU</dd></div>
              <div><dt className="text-sm text-white/70">Tracker &amp; Werbung</dt><dd className="font-display text-3xl font-semibold font-figures">0</dd></div>
            </dl>
            <p className="text-sm text-white/80">
              Details: <Link href={platformPath('/unterauftragsverarbeiter')} className="text-white">Unterauftragsverarbeiter</Link> · <Link href={platformPath('/datenschutz')} className="text-white">Datenschutzerklärung</Link>
            </p>
          </div>
          <ul className="divide-y divide-white/15 border-y border-white/15">
            {PRIVACY.map(([t, d]) => (
              <li key={t} className="py-4 flex gap-3">
                <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-ink text-xs font-bold mt-0.5">✓</span>
                <div>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="text-white/75 text-sm">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      {/* Preis */}
      <section id="preis" aria-labelledby="preis-titel" className="py-16 md:py-24 scroll-mt-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center bg-brand text-on-brand rounded-[var(--radius-sheet)] p-6 md:p-12">
          <div className="space-y-3">
            <h2 id="preis-titel" className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Ein Preis. Alles drin.</h2>
            <p className="text-white/80">Keine Provision pro Buchung, keine Staffel nach Terminen, keine kostenpflichtigen Zusatzmodule.</p>
            <p className="pt-3">
              {price ? (
                <>
                  <span className="font-display font-figures text-6xl font-semibold">{price}</span>
                  <span className="block text-white/80 mt-1">{e.PRICE_NOTE}</span>
                </>
              ) : (
                <span className="font-display text-3xl font-semibold">Preis auf Anfrage</span>
              )}
            </p>
            <a href="#anfrage" className={buttonClass('primary', 'mt-3 !bg-accent !text-ink')}>Zugang anfragen</a>
          </div>
          <ul className="space-y-3">
            {[
              'Buchungsseite mit Logo, Farbe und eigener Subdomain',
              'Eigene Domain und eigener E-Mail-Absender',
              'Unbegrenzt Termine, Leistungen und Kund:innen',
              'Team mit Rollen, Arbeitszeiten und Abwesenheiten',
              'Erinnerungen per E-Mail, WhatsApp über Ihr Meta-Konto',
              'Kurse, Warteliste, Freigabe-Modus',
              'Rechtstexte, AVV, Datenexport und Löschfristen',
              'Updates und Sicherungen inklusive',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-ink text-xs font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="fragen" aria-labelledby="fragen-titel" className="pb-20 space-y-6 scroll-mt-16 max-w-3xl">
        <h2 id="fragen-titel" className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Häufige Fragen</h2>
        <div className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {questions.map(([q, a]) => (
            <details key={q} className="group px-5">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-semibold list-none [&::-webkit-details-marker]:hidden">
                {q}
                <Icon name="plus" className="size-5 shrink-0 text-accent-text transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-4 text-graphite max-w-[62ch]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Anfrage */}
      <section id="anfrage" aria-labelledby="anfrage-titel" className="pb-8 grid gap-10 md:grid-cols-[1fr_1.6fr] scroll-mt-16">
        <div className="space-y-3">
          <h2 id="anfrage-titel" className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Zugang anfragen</h2>
          <p className="text-lg text-graphite">Erzählen Sie uns kurz von Ihrem Betrieb. Wir melden uns innerhalb von zwei Werktagen und richten alles mit Ihnen ein.</p>
          {operator && <p className="text-graphite">Persönlich betreut von {operator}.</p>}
          {e.OPERATOR_EMAIL && (
            <p className="flex items-center gap-2">
              <Icon name="mail" className="size-5 text-graphite" />
              <a href={`mailto:${e.OPERATOR_EMAIL}`}>{e.OPERATOR_EMAIL}</a>
            </p>
          )}
          {e.OPERATOR_PHONE && (
            <p className="flex items-center gap-2">
              <Icon name="phone" className="size-5 text-graphite" />
              <a href={`tel:${e.OPERATOR_PHONE.replace(/\s/g, '')}`}>{e.OPERATOR_PHONE}</a>
            </p>
          )}
        </div>
        <div className="bg-surface border border-rule border-t-4 border-t-accent rounded-[var(--radius-sheet)] p-5 md:p-8">
          <AccessRequestForm privacyHref={platformPath('/datenschutz')} />
        </div>
      </section>
    </div>
  )
}
