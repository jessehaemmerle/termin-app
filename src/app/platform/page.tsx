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

/** Stilisierte Buchungsseite als Produktbild (reines HTML, keine Bilddatei). */
function PhonePreview() {
  const days = [['Mo', '20'], ['Di', '21'], ['Mi', '22'], ['Do', '23'], ['Fr', '24']]
  const times = ['09:00', '09:30', '10:30', '13:30', '14:00', '15:30']
  return (
    <div aria-hidden="true" className="relative mx-auto w-[17.5rem] select-none">
      <div className="rounded-[2.4rem] bg-ink p-2.5 shadow-[0_30px_60px_-20px_rgba(24,32,46,0.45)]">
        <div className="rounded-[1.9rem] bg-paper overflow-hidden">
          <div className="bg-brand text-on-brand px-5 pt-6 pb-4">
            <p className="text-xs opacity-80">Friseur Mayer</p>
            <p className="font-display text-lg font-semibold leading-tight">Damenhaarschnitt</p>
            <p className="text-xs opacity-80">45 Min. · bei Anna</p>
          </div>
          <div className="px-4 py-3 space-y-3">
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
                <span key={t} className={`rounded-lg py-1.5 text-center font-figures text-sm font-semibold ${i === 2 ? 'bg-brand-soft text-brand-text border-[1.5px] border-brand' : 'bg-surface border border-rule'}`}>{t}</span>
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
      <div className="absolute -right-6 bottom-16 w-48 rounded-xl bg-surface border border-rule shadow-lg px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ok"><Icon name="whatsapp" className="size-4" /> Erinnerung</p>
        <p className="text-xs mt-0.5">Morgen, 10:30 Uhr: Damenhaarschnitt bei Friseur Mayer</p>
      </div>
    </div>
  )
}

export default function PlatformHome() {
  const e = env()
  const host = platformBase().hostname
  const price = e.PRICE_MONTHLY || null
  const questions = faq(e.PLATFORM_NAME, price).map(([q, a]) => [q, a.replace('{host}', host)] as const)

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Einstieg */}
      <section aria-labelledby="hero-titel" className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-center pt-2">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1 text-sm text-graphite">
            <Icon name="shield" className="size-4 text-ok" /> Gehostet in der EU · ohne Tracking
          </p>
          <h1 id="hero-titel" className="font-display text-4xl md:text-[3.5rem] md:leading-[1.02] font-semibold tracking-tight">
            Ihre Termine. Online gebucht. Unter Ihrem Namen.
          </h1>
          <p className="text-lg text-graphite max-w-xl">
            {e.PLATFORM_NAME} gibt Ihrem Betrieb eine eigene Buchungsseite mit Logo und Farben – als App installierbar, mit Erinnerungen per E-Mail und WhatsApp, und mit einem Kalender, den Ihr ganzes Team versteht.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#anfrage" className={buttonClass('primary')}>Zugang anfragen</a>
            <a href="#funktionen" className={buttonClass('secondary')}>Funktionen ansehen</a>
          </div>
          <p className="text-sm text-graphite">{price ? `${price} ${e.PRICE_NOTE}.` : 'Ein Tarif mit allen Funktionen.'} Keine Provision pro Buchung.</p>
        </div>
        <PhonePreview />
      </section>

      {/* So geht's */}
      <section aria-labelledby="ablauf-titel" className="space-y-8">
        <h2 id="ablauf-titel" className="font-display text-3xl font-semibold tracking-tight">In drei Schritten online buchbar</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-6">
              <span className="font-figures font-display text-4xl font-semibold text-brand-text">{i + 1}</span>
              <h3 className="font-semibold text-lg mt-3">{s.title}</h3>
              <p className="text-graphite mt-1">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Funktionen */}
      <section id="funktionen" aria-labelledby="funktionen-titel" className="space-y-8 scroll-mt-24">
        <div className="max-w-2xl space-y-3">
          <h2 id="funktionen-titel" className="font-display text-3xl font-semibold tracking-tight">Alles, was ein kleiner Betrieb braucht</h2>
          <p className="text-lg text-graphite">Ohne Zusatzmodule und ohne Einarbeitungswoche. Gemacht für das Handy an der Theke genauso wie für den Bildschirm im Büro.</p>
        </div>
        <ul className="grid gap-px bg-rule border border-rule rounded-[var(--radius-sheet)] overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="bg-surface p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-text"><Icon name={f.icon} /></span>
              <h3 className="font-semibold mt-4">{f.title}</h3>
              <p className="text-graphite text-sm mt-1">{f.text}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <p className="font-semibold">Passt zum Beispiel für</p>
          <ul className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <li key={i} className="rounded-full border border-rule-strong bg-surface px-3 py-1 text-sm">{i}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Datenschutz */}
      <section id="datenschutz" aria-labelledby="datenschutz-titel" className="grid gap-10 md:grid-cols-[1fr_1.4fr] scroll-mt-24">
        <div className="space-y-3">
          <h2 id="datenschutz-titel" className="font-display text-3xl font-semibold tracking-tight">Datenschutz ist eingebaut, nicht nachgerüstet</h2>
          <p className="text-lg text-graphite">
            Ausgelegt auf österreichisches Recht – DSGVO, Datenschutzgesetz, E-Commerce-Gesetz und Barrierefreiheitsgesetz. Sie sparen sich Recherche, Cookie-Banner und Zusatz-Tools.
          </p>
          <p className="text-sm text-graphite">
            Details: <Link href={platformPath('/unterauftragsverarbeiter')}>Unterauftragsverarbeiter</Link> · <Link href={platformPath('/datenschutz')}>Datenschutzerklärung</Link>
          </p>
        </div>
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {PRIVACY.map(([t, d]) => (
            <li key={t} className="px-5 py-4 flex gap-3">
              <Icon name="shield" className="size-5 shrink-0 mt-0.5 text-ok" />
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-graphite text-sm">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Preis */}
      <section id="preis" aria-labelledby="preis-titel" className="scroll-mt-24">
        <div className="grid gap-8 md:grid-cols-2 md:items-center bg-surface border border-rule rounded-[var(--radius-sheet)] p-6 md:p-10">
          <div className="space-y-3">
            <h2 id="preis-titel" className="font-display text-3xl font-semibold tracking-tight">Ein Preis. Alles drin.</h2>
            <p className="text-graphite">Keine Provision pro Buchung, keine Staffel nach Terminen, keine kostenpflichtigen Zusatzmodule.</p>
            <p className="pt-2">
              {price ? (
                <>
                  <span className="font-display font-figures text-5xl font-semibold">{price}</span>
                  <span className="block text-graphite mt-1">{e.PRICE_NOTE}</span>
                </>
              ) : (
                <span className="font-display text-3xl font-semibold">Preis auf Anfrage</span>
              )}
            </p>
            <a href="#anfrage" className={buttonClass('primary', 'mt-2')}>Zugang anfragen</a>
          </div>
          <ul className="space-y-2.5">
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
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="text-ok font-semibold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="fragen" aria-labelledby="fragen-titel" className="space-y-6 scroll-mt-24 max-w-3xl">
        <h2 id="fragen-titel" className="font-display text-3xl font-semibold tracking-tight">Häufige Fragen</h2>
        <div className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {questions.map(([q, a]) => (
            <details key={q} className="group px-5">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-semibold list-none [&::-webkit-details-marker]:hidden">
                {q}
                <Icon name="plus" className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-4 text-graphite">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Anfrage */}
      <section id="anfrage" aria-labelledby="anfrage-titel" className="grid gap-10 md:grid-cols-[1fr_1.6fr] scroll-mt-24">
        <div className="space-y-3">
          <h2 id="anfrage-titel" className="font-display text-3xl font-semibold tracking-tight">Zugang anfragen</h2>
          <p className="text-lg text-graphite">Erzählen Sie uns kurz von Ihrem Betrieb. Wir melden uns innerhalb von zwei Werktagen und richten alles mit Ihnen ein.</p>
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
        <div className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-5 md:p-8">
          <AccessRequestForm privacyHref={platformPath('/datenschutz')} />
        </div>
      </section>
    </div>
  )
}
