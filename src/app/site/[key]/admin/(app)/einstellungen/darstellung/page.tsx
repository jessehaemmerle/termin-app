import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { hasLogo } from '@/lib/branding'
import { brandPalette, contrastRatio } from '@/lib/color'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Checkbox, Sheet, SheetHeader } from '@/components/ui'
import { saveBrandingAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Darstellung' }

export default async function BrandingSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  const logo = await hasLogo(tenant.id)
  const palette = brandPalette(tenant.primaryColor)
  const ratio = contrastRatio(palette.brand, palette.onBrand)
  const v = tenant.updatedAt.getTime()
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsHeader title="Darstellung" description="Logo und Markenfarbe für Buchungsseite, E-Mails und App-Symbol." />
      <Sheet className="p-5">
        <ActionForm action={saveBrandingAction}>
          <div className="space-y-1.5">
            <label htmlFor="farbe" className="block font-semibold">Markenfarbe</label>
            <input id="farbe" name="farbe" type="color" defaultValue={palette.brand} className="field-control p-1 h-12 max-w-32" />
            <p className="text-sm text-graphite">Ist die Farbe zu hell für Text, wird sie für Schrift automatisch abgedunkelt (Barrierefreiheit, Kontrast mind. 4,5 : 1).</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="logo" className="block font-semibold">Logo <span className="font-normal text-graphite">(PNG, JPEG oder WebP, max. 1 MB)</span></label>
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-3 file:min-h-11 file:px-4 file:rounded-[var(--radius-control)] file:border-[1.5px] file:border-rule-strong file:bg-surface file:font-semibold" />
            <p className="text-sm text-graphite">Bildmetadaten (z. B. GPS-Daten) werden beim Hochladen entfernt.</p>
          </div>
          {logo && <Checkbox id="logoEntfernen" name="logoEntfernen" label="Aktuelles Logo entfernen" />}
          <SubmitButton pendingLabel="Wird gespeichert …">Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
      <Sheet>
        <SheetHeader title="Vorschau" description={`Kontrast der Schaltflächen: ${ratio.toFixed(1).replace('.', ',')} : 1`} />
        <div className="px-5 pb-5 flex flex-wrap items-center gap-5">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element -- mandantenbezogenes Logo
            <img src={`/assets/logo.png?v=${v}`} alt="Aktuelles Logo" className="h-14 w-auto max-w-40 object-contain border border-rule rounded p-1" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- erzeugtes App-Symbol */}
          <img src={`/assets/icon-192.png?v=${v}`} alt="App-Symbol" className="size-16 rounded-2xl border border-rule" />
          <span className="inline-flex items-center min-h-12 px-5 rounded-[var(--radius-control)] font-semibold" style={{ backgroundColor: palette.brand, color: palette.onBrand }}>Termin buchen</span>
          <span className="font-semibold underline" style={{ color: palette.brandText }}>Link in Markenfarbe</span>
        </div>
      </Sheet>
    </div>
  )
}
