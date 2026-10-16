import Link from 'next/link'
import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { missingImprintFields, tenantBaseUrl } from '@/lib/tenant'
import { PageTitle } from '@/components/ui'

export const metadata: Metadata = { title: 'Einstellungen' }

export default async function SettingsIndex() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  const missing = missingImprintFields(tenant)
  const sections = [
    { href: 'allgemein', title: 'Allgemein', text: 'Name, Beschreibung und Kontaktdaten' },
    { href: 'buchung', title: 'Buchungsregeln', text: `Raster ${tenant.slotIntervalMinutes} Min., Vorlauf ${tenant.minLeadMinutes} Min., Absage bis ${tenant.cancellationDeadlineHours} Std. vorher` },
    { href: 'darstellung', title: 'Darstellung', text: 'Logo, Markenfarbe und App-Symbol' },
    { href: 'rechtliches', title: 'Impressum und Rechtstexte', text: missing.length ? `Es fehlen: ${missing.join(', ')}` : 'Vollständig' },
    { href: 'email', title: 'E-Mail-Versand', text: tenant.smtpHost ? `Eigener Server: ${tenant.smtpHost}` : 'Über die Plattform, Antworten gehen an deine Adresse' },
    { href: 'whatsapp', title: 'WhatsApp', text: tenant.whatsappEnabled ? 'Aktiv' : 'Nicht aktiv' },
    { href: 'domain', title: 'Adresse und eigene Domain', text: tenantBaseUrl(tenant) },
    { href: 'datenschutz', title: 'Datenschutz', text: `Automatische Löschung nach ${tenant.retentionMonths} Monaten` },
    { href: 'vertrag', title: 'Vertrag (AVV)', text: tenant.dpaAcceptedAt ? 'Abgeschlossen' : 'Noch nicht abgeschlossen' },
  ]
  return (
    <div className="max-w-3xl">
      <PageTitle title="Einstellungen" />
      <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={`/admin/einstellungen/${s.href}`} className="block px-5 py-4 no-underline text-ink hover:bg-paper">
              <span className="block font-semibold">{s.title}</span>
              <span className="block text-sm text-graphite truncate">{s.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
