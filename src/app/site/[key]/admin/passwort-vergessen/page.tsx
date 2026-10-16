import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { AdminAuthPage } from '../_components/auth-page'
import { staffRequestResetAction } from '../_actions/auth'

export const metadata: Metadata = { title: 'Passwort vergessen' }

export default function StaffForgotPasswordPage() {
  return (
    <AdminAuthPage title="Passwort vergessen" description="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst.">
      <ActionForm action={staffRequestResetAction}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field-control" />
        </div>
        <SubmitButton pendingLabel="Wird gesendet …" className="w-full">Link anfordern</SubmitButton>
        <p className="text-sm"><Link href="/admin/login">Zurück zur Anmeldung</Link></p>
      </ActionForm>
    </AdminAuthPage>
  )
}
