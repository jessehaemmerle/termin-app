import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { findValidAuthToken } from '@/lib/auth/tokens'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Notice } from '@/components/ui'
import { AdminAuthPage } from '../../_components/auth-page'
import { NewPasswordFields } from '../../_components/new-password-fields'
import { acceptInviteAction } from '../../_actions/auth'

export const metadata: Metadata = { title: 'Einladung annehmen', referrer: 'no-referrer' }

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const tenant = await requireTenant()
  const { token } = await params
  const record = await findValidAuthToken('INVITE', token)
  const user = record?.userId ? await db.user.findFirst({ where: { id: record.userId, tenantId: tenant.id } }) : null
  if (!user) {
    return (
      <AdminAuthPage title="Einladung nicht gültig">
        <Notice tone="warn">Diese Einladung ist abgelaufen oder wurde bereits verwendet. Bitte lass dir eine neue Einladung schicken.</Notice>
      </AdminAuthPage>
    )
  }
  return (
    <AdminAuthPage title={`Hallo ${user.name}`} description={`Lege ein Passwort für dein Konto bei ${tenant.name} fest (${user.email}).`}>
      <ActionForm action={acceptInviteAction.bind(null, token)}>
        <NewPasswordFields />
        <SubmitButton className="w-full">Konto aktivieren</SubmitButton>
      </ActionForm>
    </AdminAuthPage>
  )
}
