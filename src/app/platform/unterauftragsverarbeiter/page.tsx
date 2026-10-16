import type { Metadata } from 'next'
import { platformContext, LEGAL_VERSION_DATE } from '@/lib/legal/context'

export const metadata: Metadata = { title: 'Unterauftragsverarbeiter' }

export default function SubprocessorsPage() {
  const p = platformContext()
  return (
    <article className="prose-legal">
      <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-4">Unterauftragsverarbeiter</h1>
      <p>{p.operator.name} setzt für den Betrieb von {p.name} folgende Unterauftragsverarbeiter ein (Anlage 2 zum Auftragsverarbeitungsvertrag). Änderungen werden den Betrieben mindestens 30 Tage im Voraus mitgeteilt.</p>
      <table>
        <thead><tr><th>Unternehmen</th><th>Leistung</th><th>Ort</th></tr></thead>
        <tbody>
          <tr><td>{p.hosting}</td><td>Rechenzentrum, Hosting, Datensicherung</td><td>{p.hostingLocation}</td></tr>
          <tr><td>{p.mailProvider}</td><td>E-Mail-Versand (sofern der Betrieb keinen eigenen Server nutzt)</td><td>EU/EWR</td></tr>
        </tbody>
      </table>
      <p>Nicht in dieser Liste: Dienste, die ein Betrieb selbst beauftragt (WhatsApp Business Platform von Meta, eigener E-Mail-Server). Diese sind Auftragsverarbeiter des jeweiligen Betriebs.</p>
      <p>Stand: {LEGAL_VERSION_DATE}</p>
    </article>
  )
}
