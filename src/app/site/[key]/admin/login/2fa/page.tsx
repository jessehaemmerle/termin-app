import type { Metadata } from 'next'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { AdminAuthPage } from '../../_components/auth-page'
import { staffSecondFactorAction } from '../../_actions/auth'

export const metadata: Metadata = { title: 'Bestätigungscode' }

export default function StaffSecondFactorPage() {
  return (
    <AdminAuthPage title="Bestätigungscode" description="Gib den 6-stelligen Code aus deiner Authenticator-App oder einen Wiederherstellungscode ein.">
      <ActionForm action={staffSecondFactorAction}>
        <div className="space-y-1.5">
          <label htmlFor="code" className="block font-semibold">Code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={20} className="field-control font-figures text-xl tracking-widest" />
        </div>
        <SubmitButton pendingLabel="Wird geprüft …" className="w-full">Bestätigen</SubmitButton>
      </ActionForm>
    </AdminAuthPage>
  )
}
