import type { Metadata } from 'next'
import { requireStaff, ROLE_LABELS } from '@/lib/auth/guards'
import { pendingTotpQr } from '@/lib/auth/two-factor'
import { env } from '@/lib/env'
import { ActionForm, FieldError, ResultValue, SubmitButton } from '@/components/action-form'
import { Notice, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { NewPasswordFields } from '../../_components/new-password-fields'
import { PushToggle } from '../../_components/push-toggle'
import { beginTotpAction, changePasswordAction, confirmTotpAction, disableTotpAction } from '../../_actions/profile'
import { revokeOwnSessionsAction } from '../../_actions/auth'

export const metadata: Metadata = { title: 'Mein Profil' }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { tenant, user, role } = await requireStaff({ allowMissing2fa: true })
  const search = await searchParams
  const pending = !user.totpEnabledAt && user.totpSecretEnc ? await pendingTotpQr(user.totpSecretEnc, tenant.name, user.email) : null

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle title="Mein Profil" description={`${user.name}, ${user.email} – ${ROLE_LABELS[role]}`} />
      {search['2fa'] === 'pflicht' && !user.totpEnabledAt && (
        <Notice tone="warn" title="Zwei-Faktor-Anmeldung erforderlich">In deinem Betrieb ist die Zwei-Faktor-Anmeldung verpflichtend. Richte sie bitte jetzt ein.</Notice>
      )}

      <Sheet>
        <SheetHeader title="Zwei-Faktor-Anmeldung" description="Schützt dein Konto zusätzlich mit einem Code aus einer Authenticator-App (z. B. Aegis, 2FAS, Google Authenticator)." />
        <div className="px-5 pb-5 space-y-4">
          {user.totpEnabledAt ? (
            <>
              <p className="font-semibold text-ok">Aktiv</p>
              {!tenant.require2faForStaff && (
                <ActionForm action={disableTotpAction} className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5">
                    <label htmlFor="passwort" className="block font-semibold">Passwort zur Bestätigung</label>
                    <input id="passwort" name="passwort" type="password" autoComplete="current-password" required className="field-control" />
                  </div>
                  <SubmitButton variant="quiet">Deaktivieren</SubmitButton>
                </ActionForm>
              )}
            </>
          ) : pending ? (
            <ActionForm action={confirmTotpAction}>
              <p>Scanne den QR-Code mit deiner Authenticator-App und gib den angezeigten Code ein.</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- QR-Code als data:-URL */}
              <img src={pending.qr} alt="QR-Code für die Authenticator-App" width={200} height={200} className="border border-rule rounded" />
              <p className="text-sm text-graphite">Manuelle Eingabe: <span className="font-figures select-all break-all">{pending.secret}</span></p>
              <div className="space-y-1.5 max-w-48">
                <label htmlFor="code" className="block font-semibold">Code</label>
                <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} className="field-control font-figures text-xl tracking-widest" />
              </div>
              <SubmitButton>Aktivieren</SubmitButton>
              <ResultValue field="codes" label="Wiederherstellungscodes (jeder nur einmal verwendbar)" copyable={false} />
            </ActionForm>
          ) : (
            <ActionForm action={beginTotpAction}>
              <SubmitButton variant="secondary">Einrichten</SubmitButton>
            </ActionForm>
          )}
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Push-Benachrichtigungen" description="Erhalte neue Buchungen und Absagen direkt aufs Gerät. Namen von Kund:innen werden darin nicht angezeigt." />
        <div className="px-5 pb-5">
          <PushToggle publicKey={env().VAPID_PUBLIC_KEY ?? null} />
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Passwort ändern" />
        <div className="px-5 pb-5">
          <ActionForm action={changePasswordAction} resetOnSuccess>
            <div className="space-y-1.5">
              <label htmlFor="aktuell" className="block font-semibold">Aktuelles Passwort</label>
              <input id="aktuell" name="aktuell" type="password" autoComplete="current-password" required className="field-control" />
              <FieldError name="aktuell" />
            </div>
            <NewPasswordFields />
            <SubmitButton variant="secondary">Passwort ändern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Angemeldete Geräte" description="Meldet dich überall außer auf diesem Gerät ab – z. B. wenn ein Telefon verloren gegangen ist." />
        <div className="px-5 pb-5">
          <ActionForm action={revokeOwnSessionsAction}>
            <SubmitButton variant="secondary">Alle anderen Geräte abmelden</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>
    </div>
  )
}
