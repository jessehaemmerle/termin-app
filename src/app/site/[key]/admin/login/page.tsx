import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Notice } from '@/components/ui'
import { AdminAuthPage } from '../_components/auth-page'
import { staffLoginAction } from '../_actions/auth'

export const metadata: Metadata = { title: 'Anmelden' }

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { hinweis } = await searchParams
  return (
    <AdminAuthPage title="Anmelden" description="Für Inhaber:innen und Teammitglieder.">
      {hinweis === 'passwort-neu' && (
        <div className="mb-5">
          <Notice tone="ok" title="Passwort geändert">Du kannst dich jetzt mit dem neuen Passwort anmelden.</Notice>
        </div>
      )}
      <ActionForm action={staffLoginAction}>
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
        <p className="text-sm">
          <Link href="/admin/passwort-vergessen">Passwort vergessen?</Link>
        </p>
      </ActionForm>
    </AdminAuthPage>
  )
}
