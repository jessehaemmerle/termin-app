import Link from 'next/link'
import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { findBookingByToken } from '@/lib/booking/manage'
import { canCustomerCancel } from '@/lib/booking/service'
import { formatDateLong, formatDuration, formatTime } from '@/lib/format'
import { formatPhone, waMeLink } from '@/lib/phone'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { ButtonLink, Notice, StatusBadge } from '@/components/ui'
import { InstallPrompt } from '@/components/pwa'
import { cancelByTokenAction, withdrawWhatsappAction } from './actions'

export const metadata: Metadata = { title: 'Ihr Termin', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const tenant = await requireTenant()
  const { token } = await params
  const search = await searchParams
  const booking = await findBookingByToken(tenant, token)

  if (!booking) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-semibold">Termin nicht gefunden</h1>
        <p className="text-graphite mt-2">
          Der Link ist ungültig oder der Termin liegt so lange zurück, dass die Daten bereits gelöscht wurden.
        </p>
        <p className="mt-6">
          <Link href="/buchen">Neuen Termin buchen</Link>
        </p>
      </div>
    )
  }

  const tz = tenant.timezone
  const active = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const cancellable = canCustomerCancel(tenant, booking)
  const isNew = search.neu === '1'

  return (
    <div className="max-w-xl space-y-6">
      {isNew && booking.status === 'CONFIRMED' && (
        <Notice tone="ok" title="Ihr Termin ist gebucht" role="status">
          Eine Bestätigung ist unterwegs an {booking.customer?.email}. Über diese Seite können Sie den Termin jederzeit ansehen oder absagen.
        </Notice>
      )}
      {isNew && booking.status === 'PENDING' && (
        <Notice tone="info" title="Ihre Anfrage ist eingegangen" role="status">
          Wir prüfen die Anfrage und bestätigen den Termin so schnell wie möglich. Sie erhalten dazu eine Nachricht.
        </Notice>
      )}
      {search.abgesagt === '1' && (
        <Notice tone="ok" title="Der Termin ist abgesagt" role="status">
          Sie erhalten eine Bestätigung per E-Mail.
        </Notice>
      )}

      <section aria-labelledby="termin-titel" className="bg-surface border border-rule rounded-[var(--radius-sheet)] overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-rule">
          <div className="flex items-center justify-between gap-3">
            <h1 id="termin-titel" className="font-display text-xl font-semibold">{booking.service.name}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="font-figures text-4xl font-semibold mt-3 text-brand-text">{formatTime(booking.startsAt, tz)}</p>
          <p className="text-lg font-semibold">{formatDateLong(booking.startsAt, tz)}</p>
          <p className="text-graphite mt-1">
            Dauer {formatDuration(Math.round((+booking.endsAt - +booking.startsAt) / 60000))}
            {booking.staff && <>, bei {booking.staff.name}</>}
          </p>
        </div>
        <dl className="ruled text-sm">
          <div className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-3">
            <dt className="text-graphite">Adresse</dt>
            <dd>
              {tenant.name}
              <br />
              {tenant.street}, {tenant.postalCode} {tenant.city}
            </dd>
          </div>
          <div className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-3">
            <dt className="text-graphite">Gebucht für</dt>
            <dd>{booking.customer?.name}</dd>
          </div>
          <div className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-3">
            <dt className="text-graphite">Nachrichten</dt>
            <dd>{booking.notifyWhatsapp ? 'E-Mail und WhatsApp' : 'E-Mail'}</dd>
          </div>
        </dl>
      </section>

      {active && (
        <section aria-labelledby="absagen" className="space-y-3">
          <h2 id="absagen" className="font-display text-lg font-semibold">Termin absagen</h2>
          {cancellable ? (
            search.absagen === '1' ? (
              <ActionForm action={cancelByTokenAction.bind(null, token)} className="space-y-3">
                <p>Möchten Sie den Termin wirklich absagen? Der Platz wird danach wieder für andere freigegeben.</p>
                <div className="flex flex-wrap gap-3">
                  <SubmitButton variant="danger" pendingLabel="Wird abgesagt …">
                    Ja, Termin absagen
                  </SubmitButton>
                  <ButtonLink href={`/termin/${token}`} variant="secondary">
                    Termin behalten
                  </ButtonLink>
                </div>
              </ActionForm>
            ) : (
              <>
                <p className="text-graphite">
                  Online absagen ist bis {tenant.cancellationDeadlineHours} Stunden vor dem Termin möglich.
                </p>
                <ButtonLink href={`/termin/${token}?absagen=1`} variant="secondary">
                  Termin absagen
                </ButtonLink>
              </>
            )
          ) : (
            <p className="text-graphite">
              Die Frist für eine Online-Absage ist abgelaufen. Bitte melden Sie sich direkt bei uns
              {tenant.phone && (
                <>
                  {' '}unter <a href={`tel:${tenant.phone}`}>{formatPhone(tenant.phone)}</a>
                </>
              )}
              .
            </p>
          )}
        </section>
      )}

      {booking.notifyWhatsapp && active && (
        <section aria-labelledby="whatsapp" className="space-y-3">
          <h2 id="whatsapp" className="font-display text-lg font-semibold">WhatsApp-Nachrichten</h2>
          <ActionForm action={withdrawWhatsappAction.bind(null, token)} className="space-y-3">
            <p className="text-graphite">Sie erhalten Nachrichten zu Ihren Terminen auch per WhatsApp. Sie können das jederzeit beenden.</p>
            <SubmitButton variant="secondary" pendingLabel="Wird beendet …">
              WhatsApp-Nachrichten beenden
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      <section aria-labelledby="kontakt" className="space-y-2">
        <h2 id="kontakt" className="font-display text-lg font-semibold">Fragen zum Termin?</h2>
        <ul className="space-y-1">
          {tenant.phone && (
            <li>
              <a href={`tel:${tenant.phone}`}>Anrufen: {formatPhone(tenant.phone)}</a>
            </li>
          )}
          {tenant.email && (
            <li>
              <a href={`mailto:${tenant.email}`}>E-Mail an {tenant.email}</a>
            </li>
          )}
          {tenant.whatsappDisplayNumber && (
            <li>
              <a href={waMeLink(tenant.whatsappDisplayNumber, `Hallo, ich habe eine Frage zu meinem Termin am ${formatDateLong(booking.startsAt, tz)} um ${formatTime(booking.startsAt, tz)} Uhr.`)} target="_blank" rel="noopener noreferrer">
                Per WhatsApp schreiben
              </a>
            </li>
          )}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/buchen" variant="secondary">
          Weiteren Termin buchen
        </ButtonLink>
        <InstallPrompt appName={tenant.name} compact />
      </div>
      <p className="text-sm text-graphite">
        Bewahren Sie diesen Link vertraulich auf – wer ihn kennt, kann den Termin ansehen und absagen.
      </p>
    </div>
  )
}
