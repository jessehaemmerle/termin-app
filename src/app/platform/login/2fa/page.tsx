import { ActionForm, SubmitButton } from '@/components/action-form'
import { platformSecondFactorAction } from '../../_actions'

export default function PlatformSecondFactorPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl font-semibold">Bestätigungscode</h1>
      <div className="mt-6 bg-surface border border-rule rounded-[var(--radius-sheet)] p-6">
        <ActionForm action={platformSecondFactorAction}>
          <div className="space-y-1.5">
            <label htmlFor="code" className="block font-semibold">Code aus der Authenticator-App</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={20} className="field-control font-figures text-xl tracking-widest" />
          </div>
          <SubmitButton className="w-full">Bestätigen</SubmitButton>
        </ActionForm>
      </div>
    </div>
  )
}
