import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { findValidAuthToken } from '@/lib/auth/tokens'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Notice } from '@/components/ui'
import { AccountCard, CustomerPasswordFields } from '../../_components/password-fields'
import { setCustomerPasswordAction } from '../../actions'

export const metadata: Metadata = { title: 'Neues Passwort', referrer: 'no-referrer' }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  await requireTenant()
  const { token } = await params
  const valid = await findValidAuthToken('PASSWORD_RESET', token)
  if (!valid) {
    return (
      <AccountCard title="Link abgelaufen">
        <Notice tone="warn">Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.</Notice>
      </AccountCard>
    )
  }
  return (
    <AccountCard title="Neues Passwort" description="Legen Sie ein neues Passwort fest.">
      <ActionForm action={setCustomerPasswordAction.bind(null, 'PASSWORD_RESET', token)}>
        <CustomerPasswordFields />
        <SubmitButton className="w-full">Passwort speichern</SubmitButton>
      </ActionForm>
    </AccountCard>
  )
}
