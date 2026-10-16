import type { Metadata } from 'next'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { AccountCard } from '../../_components/password-fields'
import { customerSecondFactorAction } from '../../actions'

export const metadata: Metadata = { title: 'Bestätigungscode' }

export default function CustomerSecondFactorPage() {
  return (
    <AccountCard title="Bestätigungscode" description="Geben Sie den Code aus Ihrer Authenticator-App oder einen Wiederherstellungscode ein.">
      <ActionForm action={customerSecondFactorAction}>
        <div className="space-y-1.5">
          <label htmlFor="code" className="block font-semibold">Code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={20} className="field-control font-figures text-xl tracking-widest" />
        </div>
        <SubmitButton className="w-full">Bestätigen</SubmitButton>
      </ActionForm>
    </AccountCard>
  )
}
