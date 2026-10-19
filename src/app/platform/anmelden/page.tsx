import type { Metadata } from 'next'
import { platformBase } from '@/lib/env'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { goToBusinessLoginAction } from '../_public-actions'

export const metadata: Metadata = { title: 'Anmelden' }

export default function BusinessLoginFinderPage() {
  const host = platformBase().hostname
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Anmelden</h1>
      <p className="text-graphite mt-2">
        Jeder Betrieb hat seine eigene Adresse. Geben Sie sie ein, wir bringen Sie zur Anmeldung Ihres Teams.
      </p>
      <div className="mt-6 bg-surface border border-rule rounded-[var(--radius-sheet)] p-6">
        <ActionForm action={goToBusinessLoginAction}>
          <div className="space-y-1.5">
            <label htmlFor="adresse" className="block font-semibold">Adresse Ihres Betriebs</label>
            <div className="flex items-center gap-2">
              <input id="adresse" name="adresse" required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="ihr-betrieb" className="field-control" aria-describedby="adresse-hint" />
              <span className="text-graphite shrink-0">.{host}</span>
            </div>
            <p id="adresse-hint" className="text-sm text-graphite">Steht in Ihrer Einladungs-E-Mail. Mit eigener Domain melden Sie sich direkt unter ihre-domain/admin an.</p>
          </div>
          <SubmitButton className="w-full" pendingLabel="Wird gesucht …">Weiter zur Anmeldung</SubmitButton>
        </ActionForm>
      </div>
      <p className="text-sm text-graphite mt-6">
        Kund:innen eines Betriebs melden sich auf dessen Buchungsseite an, nicht hier.
      </p>
    </div>
  )
}
