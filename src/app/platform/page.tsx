import { env } from '@/lib/env'

export default function PlatformHome() {
  const e = env()
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Online-Terminbuchung mit Ihrem Namen</h1>
      <p className="text-lg text-graphite">
        {e.PLATFORM_NAME} gibt kleinen Betrieben eine eigene Buchungsseite – mit Logo, Farben und eigener Adresse, installierbar als App, mit Erinnerungen per E-Mail und auf Wunsch per WhatsApp.
      </p>
      <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
        {[
          ['Gehostet in der EU', 'Ohne Tracking, ohne Cookie-Banner, mit automatischer Löschung.'],
          ['Für Ihr Team', 'Kalender, Arbeitszeiten, Abwesenheiten und Push-Benachrichtigungen.'],
          ['Rechtssicher vorbereitet', 'Impressum, Datenschutzerklärung und AVV werden aus Ihren Angaben erzeugt.'],
        ].map(([title, text]) => (
          <li key={title} className="px-5 py-4">
            <p className="font-semibold">{title}</p>
            <p className="text-graphite text-sm">{text}</p>
          </li>
        ))}
      </ul>
      {e.OPERATOR_EMAIL && (
        <p>
          Interesse? Schreiben Sie uns: <a href={`mailto:${e.OPERATOR_EMAIL}`}>{e.OPERATOR_EMAIL}</a>
        </p>
      )}
    </div>
  )
}
