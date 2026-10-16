import type { Metadata } from 'next'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { platformLoginAction } from '../_actions'

export const metadata: Metadata = { title: 'Anmeldung Plattform-Verwaltung', robots: { index: false } }

export default function PlatformLoginPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl font-semibold">Plattform-Verwaltung</h1>
      <p className="text-graphite mt-2">Nur für Administrator:innen des Plattformbetreibers.</p>
      <div className="mt-6 bg-surface border border-rule rounded-[var(--radius-sheet)] p-6">
        <ActionForm action={platformLoginAction}>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="field-control" />
            <FieldError name="email" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block font-semibold">Passwort</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="field-control" />
          </div>
          <SubmitButton className="w-full" pendingLabel="Wird angemeldet …">Anmelden</SubmitButton>
        </ActionForm>
      </div>
    </div>
  )
}
