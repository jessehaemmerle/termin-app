import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { AccountCard } from '../_components/password-fields'
import { registerAction } from '../actions'

export const metadata: Metadata = { title: 'Kundenkonto anlegen' }

export default async function RegisterPage() {
  const tenant = await requireTenant()
  if (!tenant.allowCustomerAccounts) notFound()
  return (
    <AccountCard
      title="Kundenkonto anlegen"
      description={<>Freiwillig und nur für {tenant.name}. Sie können es jederzeit selbst löschen. Details in der <Link href="/datenschutz">Datenschutzerklärung</Link>.</>}
    >
      <ActionForm action={registerAction} resetOnSuccess>
        <div className="space-y-1.5">
          <label htmlFor="name" className="block font-semibold">Name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={100} className="field-control" />
          <FieldError name="name" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} className="field-control" aria-describedby="email-hint" />
          <p id="email-hint" className="text-sm text-graphite">Wir senden Ihnen einen Link, über den Sie Ihr Passwort festlegen.</p>
          <FieldError name="email" />
        </div>
        <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <SubmitButton pendingLabel="Wird gesendet …" className="w-full">Bestätigungslink anfordern</SubmitButton>
        <p className="text-sm">Bereits registriert? <Link href="/konto/anmelden">Anmelden</Link></p>
      </ActionForm>
    </AccountCard>
  )
}
