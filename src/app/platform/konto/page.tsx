import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/auth/guards'
import { pendingTotpQr } from '@/lib/auth/two-factor'
import { env } from '@/lib/env'
import { platformPath } from '@/lib/tenant'
import { ActionForm, ResultValue, SubmitButton } from '@/components/action-form'
import { Notice } from '@/components/ui'
import { platformBeginTotpAction, platformConfirmTotpAction, platformLogoutAction } from '../_actions'

export default async function PlatformAccountPage() {
  const user = await requirePlatformAdmin({ allowMissing2fa: true })
  const pending = !user.totpEnabledAt && user.totpSecretEnc ? await pendingTotpQr(user.totpSecretEnc, env().PLATFORM_NAME, user.email) : null
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Mein Konto</h1>
      {!user.totpEnabledAt && <Notice tone="warn" title="Zwei-Faktor-Anmeldung erforderlich">Plattform-Administrator:innen müssen die Zwei-Faktor-Anmeldung verwenden.</Notice>}
      <div className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-6 space-y-4">
        {user.totpEnabledAt ? (
          <>
            <p className="text-ok font-semibold">Zwei-Faktor-Anmeldung aktiv.</p>
            <Link href={platformPath('/betriebe')}>Zur Betriebsverwaltung</Link>
          </>
        ) : pending ? (
          <ActionForm action={platformConfirmTotpAction}>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR-Code als data:-URL */}
            <img src={pending.qr} alt="QR-Code für die Authenticator-App" width={200} height={200} className="border border-rule rounded" />
            <p className="text-sm text-graphite">Manuell: <span className="font-figures select-all break-all">{pending.secret}</span></p>
            <div className="space-y-1.5 max-w-48">
              <label htmlFor="code" className="block font-semibold">Code</label>
              <input id="code" name="code" inputMode="numeric" maxLength={6} required className="field-control font-figures" />
            </div>
            <SubmitButton>Aktivieren</SubmitButton>
            <ResultValue field="codes" label="Wiederherstellungscodes" copyable={false} />
          </ActionForm>
        ) : (
          <ActionForm action={platformBeginTotpAction}>
            <SubmitButton>Zwei-Faktor-Anmeldung einrichten</SubmitButton>
          </ActionForm>
        )}
      </div>
      <form action={platformLogoutAction}><button type="submit" className="font-semibold text-brand-text min-h-11">Abmelden</button></form>
    </div>
  )
}
