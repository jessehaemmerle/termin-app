import type { Metadata } from 'next'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { AdminAuthPage } from '../../_components/auth-page'
import { NewPasswordFields } from '../../_components/new-password-fields'
import { staffResetPasswordAction } from '../../_actions/auth'

export const metadata: Metadata = { title: 'Neues Passwort', referrer: 'no-referrer' }

export default async function StaffResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return (
    <AdminAuthPage title="Neues Passwort festlegen">
      <ActionForm action={staffResetPasswordAction.bind(null, token)}>
        <NewPasswordFields />
        <SubmitButton className="w-full">Passwort speichern</SubmitButton>
      </ActionForm>
    </AdminAuthPage>
  )
}
