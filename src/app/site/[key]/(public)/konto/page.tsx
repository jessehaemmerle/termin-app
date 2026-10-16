import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { requireCustomer } from '@/lib/auth/guards'
import { decryptOrNull } from '@/lib/crypto'
import { pendingTotpQr } from '@/lib/auth/two-factor'
import { formatDateLong, formatTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { whatsappConsentText } from '@/lib/legal/consent'
import { ActionForm, FieldError, ResultValue, SubmitButton } from '@/components/action-form'
import { ButtonLink, Checkbox, Notice, Sheet, SheetHeader, StatusBadge } from '@/components/ui'
import { CustomerPasswordFields } from './_components/password-fields'
import {
  customerBeginTotpAction,
  customerChangePasswordAction,
  customerConfirmTotpAction,
  customerDisableTotpAction,
  customerLogoutAction,
  deleteAccountAction,
  updateCustomerProfileAction,
} from './actions'

export const metadata: Metadata = { title: 'Mein Konto', robots: { index: false } }

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const tenantCheck = await requireTenant()
  if (!tenantCheck.allowCustomerAccounts) notFound()
  const { tenant, customer } = await requireCustomer()
  const search = await searchParams
  const tz = tenant.timezone
  const now = new Date()
  const bookings = await db.booking.findMany({
    where: { tenantId: tenant.id, customerId: customer.id },
    include: { service: true, staff: true },
    orderBy: { startsAt: 'desc' },
    take: 50,
  })
  const upcoming = bookings.filter((b) => b.endsAt > now && (b.status === 'PENDING' || b.status === 'CONFIRMED')).reverse()
  const past = bookings.filter((b) => !upcoming.includes(b))
  const pending = !customer.totpEnabledAt && customer.totpSecretEnc ? await pendingTotpQr(customer.totpSecretEnc, tenant.name, customer.email ?? customer.name) : null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Hallo {customer.name.split(' ')[0]}</h1>
          <p className="text-graphite mt-1">Ihr Kundenkonto bei {tenant.name}</p>
        </div>
        <ButtonLink href="/buchen">Termin buchen</ButtonLink>
      </div>
      {search.willkommen && <Notice tone="ok" title="Ihr Konto ist aktiv" role="status">Ab jetzt sind Ihre Daten bei der Buchung bereits ausgefüllt.</Notice>}

      <section aria-labelledby="anstehend">
        <h2 id="anstehend" className="font-display text-xl font-semibold mb-3">Anstehende Termine</h2>
        {upcoming.length === 0 ? (
          <p className="text-graphite">Keine anstehenden Termine.</p>
        ) : (
          <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
            {upcoming.map((b) => {
              const token = decryptOrNull(b.manageTokenEnc)
              return (
                <li key={b.id}>
                  <Link href={token ? `/termin/${token}` : '#'} className="flex items-center gap-4 px-5 py-3.5 no-underline text-ink hover:bg-brand-soft">
                    <span className="font-figures text-2xl font-semibold w-20 shrink-0">{formatTime(b.startsAt, tz)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{b.service.name}</span>
                      <span className="block text-sm text-graphite">{formatDateLong(b.startsAt, tz)}{b.staff && `, bei ${b.staff.name}`}</span>
                    </span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="vergangen">
          <h2 id="vergangen" className="font-display text-xl font-semibold mb-3">Frühere Termine</h2>
          <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)] text-sm">
            {past.map((b) => (
              <li key={b.id} className="flex justify-between gap-3 px-5 py-2.5">
                <span>{b.service.name}, {formatDateLong(b.startsAt, tz)}</span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-graphite mt-2">Termine werden {tenant.retentionMonths} Monate nach dem Termin automatisch anonymisiert.</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Sheet>
          <SheetHeader title="Ihre Daten" />
          <div className="px-5 pb-5">
            <ActionForm action={updateCustomerProfileAction}>
              <div className="space-y-1.5">
                <label htmlFor="name" className="block font-semibold">Name</label>
                <input id="name" name="name" required defaultValue={customer.name} className="field-control" />
                <FieldError name="name" />
              </div>
              <div className="space-y-1.5">
                <span className="block font-semibold">E-Mail-Adresse</span>
                <p>{customer.email}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="telefon" className="block font-semibold">Mobilnummer <span className="font-normal text-graphite">(optional)</span></label>
                <input id="telefon" name="telefon" type="tel" defaultValue={customer.phone ? formatPhone(customer.phone) : ''} className="field-control" />
                <FieldError name="telefon" />
              </div>
              {tenant.whatsappEnabled && (
                <Checkbox id="whatsapp" name="whatsapp" defaultChecked={customer.whatsappOptIn} label="Nachrichten zu meinen Terminen auch per WhatsApp" hint={whatsappConsentText(tenant.name)} />
              )}
              <SubmitButton variant="secondary">Speichern</SubmitButton>
            </ActionForm>
          </div>
        </Sheet>

        <Sheet>
          <SheetHeader title="Sicherheit" />
          <div className="px-5 pb-5 space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Zwei-Faktor-Anmeldung</h3>
              {customer.totpEnabledAt ? (
                <ActionForm action={customerDisableTotpAction} className="space-y-3">
                  <p className="text-ok font-semibold">Aktiv</p>
                  <div className="space-y-1.5">
                    <label htmlFor="pw-2fa" className="block text-sm font-semibold">Passwort zum Deaktivieren</label>
                    <input id="pw-2fa" name="passwort" type="password" autoComplete="current-password" className="field-control" />
                  </div>
                  <SubmitButton variant="quiet">Deaktivieren</SubmitButton>
                </ActionForm>
              ) : pending ? (
                <ActionForm action={customerConfirmTotpAction} className="space-y-3">
                  <p className="text-sm">Scannen Sie den QR-Code mit einer Authenticator-App und geben Sie den Code ein.</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- QR-Code als data:-URL */}
                  <img src={pending.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} className="border border-rule rounded" />
                  <div className="space-y-1.5 max-w-40">
                    <label htmlFor="code" className="block text-sm font-semibold">Code</label>
                    <input id="code" name="code" inputMode="numeric" maxLength={6} className="field-control font-figures" />
                  </div>
                  <SubmitButton variant="secondary">Aktivieren</SubmitButton>
                  <ResultValue field="codes" label="Wiederherstellungscodes" copyable={false} />
                </ActionForm>
              ) : (
                <ActionForm action={customerBeginTotpAction}>
                  <p className="text-sm text-graphite">Optional: schützt Ihr Konto mit einem zusätzlichen Code.</p>
                  <SubmitButton variant="secondary">Einrichten</SubmitButton>
                </ActionForm>
              )}
            </div>
            <details>
              <summary className="font-semibold cursor-pointer min-h-11 flex items-center">Passwort ändern</summary>
              <ActionForm action={customerChangePasswordAction} resetOnSuccess className="space-y-4 mt-3">
                <div className="space-y-1.5">
                  <label htmlFor="aktuell" className="block font-semibold">Aktuelles Passwort</label>
                  <input id="aktuell" name="aktuell" type="password" autoComplete="current-password" required className="field-control" />
                </div>
                <CustomerPasswordFields />
                <SubmitButton variant="secondary">Passwort ändern</SubmitButton>
              </ActionForm>
            </details>
          </div>
        </Sheet>
      </div>

      <Sheet>
        <SheetHeader title="Ihre Daten und Rechte" description="Sie können jederzeit eine Kopie Ihrer Daten herunterladen oder Ihr Konto löschen." />
        <div className="px-5 pb-5 space-y-5">
          <a href="/konto/export" className="inline-flex items-center min-h-12 px-5 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold no-underline text-ink">
            Meine Daten herunterladen
          </a>
          <details>
            <summary className="text-danger font-semibold cursor-pointer min-h-11 flex items-center">Konto löschen …</summary>
            <ActionForm action={deleteAccountAction} className="space-y-3 mt-3 border border-danger/40 bg-danger-soft rounded-[var(--radius-control)] p-4">
              <p className="text-sm">Ihr Konto und Ihre persönlichen Daten werden gelöscht, zukünftige Termine abgesagt. Das kann nicht rückgängig gemacht werden.</p>
              <div className="space-y-1.5">
                <label htmlFor="pw-del" className="block font-semibold">Passwort zur Bestätigung</label>
                <input id="pw-del" name="passwort" type="password" autoComplete="current-password" required className="field-control" />
              </div>
              <SubmitButton variant="danger" pendingLabel="Wird gelöscht …">Konto endgültig löschen</SubmitButton>
            </ActionForm>
          </details>
        </div>
      </Sheet>

      <form action={customerLogoutAction}>
        <button type="submit" className="font-semibold text-brand-text min-h-11">Abmelden</button>
      </form>
    </div>
  )
}
