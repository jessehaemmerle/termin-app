import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { AccountCard } from '../_components/password-fields'
import { customerLoginAction } from '../actions'

export const metadata: Metadata = { title: 'Anmelden' }

export default async function CustomerLoginPage() {
  const tenant = await requireTenant()
  if (!tenant.allowCustomerAccounts) notFound()
  return (
    <AccountCard title="Anmelden" description="Mit Ihrem Kundenkonto sehen Sie Ihre Termine und buchen schneller.">
      <ActionForm action={customerLoginAction}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
          <input id="email" name="email" type="email" autoComplete="username" required className="field-control" />
          <FieldError name="email" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block font-semibold">Passwort</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field-control" />
          <FieldError name="password" />
        </div>
        <SubmitButton pendingLabel="Wird angemeldet …" className="w-full">Anmelden</SubmitButton>
        <div className="text-sm space-y-1">
          <p><Link href="/konto/passwort-vergessen">Passwort vergessen?</Link></p>
          <p>Noch kein Konto? <Link href="/konto/registrieren">Kundenkonto anlegen</Link></p>
        </div>
      </ActionForm>
    </AccountCard>
  )
}
