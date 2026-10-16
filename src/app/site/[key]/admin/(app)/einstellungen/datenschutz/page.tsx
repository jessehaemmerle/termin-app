import Link from 'next/link'
import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { platformContext } from '@/lib/legal/context'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Sheet, SheetHeader } from '@/components/ui'
import { saveRetentionAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Datenschutz' }

export default async function PrivacySettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  const platform = platformContext()
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader title="Datenschutz" description="Du bist Verantwortlicher für die Daten deiner Kund:innen; die Plattform verarbeitet sie in deinem Auftrag." />
      <Sheet>
        <SheetHeader title="Automatische Löschung" description="Termine werden nach dieser Frist anonymisiert, Kund:innen ohne neuere Termine gelöscht. Wähle die kürzeste Frist, die du wirklich brauchst." />
        <div className="px-5 pb-5">
          <ActionForm action={saveRetentionAction} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label htmlFor="monate" className="block font-semibold">Frist nach dem Termin</label>
              <select id="monate" name="monate" defaultValue={tenant.retentionMonths} className="field-control">
                {[3, 6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} Monate</option>)}
              </select>
            </div>
            <SubmitButton variant="secondary">Speichern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>
      <Sheet>
        <SheetHeader title="Wer verarbeitet die Daten?" />
        <ul className="px-5 pb-5 space-y-2 text-sm">
          <li><strong>Plattform (Auftragsverarbeiter):</strong> {platform.operator.name}</li>
          <li><strong>Hosting:</strong> {platform.hosting} ({platform.hostingLocation})</li>
          <li><strong>E-Mail-Versand:</strong> {tenant.smtpHost ? `dein eigener Anbieter (${tenant.smtpHost})` : platform.mailProvider}</li>
          {tenant.whatsappEnabled && <li><strong>WhatsApp:</strong> Meta Platforms Ireland Ltd. – nur für Kund:innen mit Einwilligung, über dein eigenes Konto</li>}
        </ul>
      </Sheet>
      <Sheet>
        <SheetHeader title="Anfragen von Kund:innen" />
        <div className="px-5 pb-5 space-y-2 text-sm">
          <p>Auskunft, Berichtigung und Löschung erledigst du direkt beim jeweiligen Eintrag unter <Link href="/admin/kunden">Kunden</Link>. Antwortfrist: ein Monat.</p>
          <p>Kund:innen mit Konto können ihre Daten selbst herunterladen und ihr Konto löschen.</p>
        </div>
      </Sheet>
      <Sheet>
        <SheetHeader title="Gesamtexport" description="Alle Daten deines Betriebs als JSON, z. B. zur Sicherung oder bei Vertragsende." />
        <div className="px-5 pb-5">
          <a href="/admin/einstellungen/datenschutz/export" className="inline-flex items-center min-h-12 px-5 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold no-underline text-ink">Alle Daten exportieren</a>
        </div>
      </Sheet>
    </div>
  )
}
