import type { Metadata } from 'next'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { AccountCard } from '../_components/password-fields'
import { customerRequestResetAction } from '../actions'

export const metadata: Metadata = { title: 'Passwort vergessen' }

export default function CustomerForgotPage() {
  return (
    <AccountCard title="Passwort vergessen" description="Wir senden Ihnen einen Link zum Festlegen eines neuen Passworts.">
      <ActionForm action={customerRequestResetAction}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field-control" />
        </div>
        <SubmitButton className="w-full" pendingLabel="Wird gesendet …">Link anfordern</SubmitButton>
      </ActionForm>
    </AccountCard>
  )
}
