import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff } from '@/lib/auth/guards'
import { formatDateTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { HEALTH_DATA_HINT_TEAM } from '@/lib/legal/consent'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { ButtonLink, Sheet, SheetHeader, StatusBadge } from '@/components/ui'
import { eraseCustomerAction, updateCustomerAction, withdrawCustomerWhatsappAction } from '../../../_actions/customers'

export const metadata: Metadata = { title: 'Kund:in' }

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'customers.manage' })
  const tz = ctx.tenant.timezone
  const { id } = await params
  const search = await searchParams
  const customer = await db.customer.findFirst({
    where: { id, tenantId: ctx.tenant.id },
    include: {
      bookings: { include: { service: true, staff: true }, orderBy: { startsAt: 'desc' }, take: 100 },
      consentRecords: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!customer) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/kunden" className="text-sm">Alle Kunden</Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-2">{customer.name}</h1>
        <p className="text-graphite">
          {customer.passwordHash ? 'Mit Kundenkonto' : 'Gastkund:in'}, angelegt am {formatDateTime(customer.createdAt, tz)}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <ButtonLink href={`/admin/termine/neu?kunde=${customer.id}`}>Termin eintragen</ButtonLink>
          {customer.phone && <ButtonLink href={`tel:${customer.phone}`} variant="secondary">Anrufen</ButtonLink>}
        </div>
      </div>

      <Sheet>
        <SheetHeader title="Kontaktdaten und Vermerk" />
        <div className="px-5 pb-5">
          <ActionForm action={updateCustomerAction.bind(null, customer.id)}>
            <div className="space-y-1.5">
              <label htmlFor="name" className="block font-semibold">Name</label>
              <input id="name" name="name" required defaultValue={customer.name} className="field-control" maxLength={100} />
              <FieldError name="name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block font-semibold">E-Mail</label>
                <input id="email" name="email" type="email" defaultValue={customer.email ?? ''} className="field-control" maxLength={200} />
                <FieldError name="email" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="telefon" className="block font-semibold">Telefon</label>
                <input id="telefon" name="telefon" type="tel" defaultValue={customer.phone ? formatPhone(customer.phone) : ''} className="field-control" maxLength={30} />
                <FieldError name="telefon" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="notiz" className="block font-semibold">Interner Vermerk</label>
              <textarea id="notiz" name="notiz" rows={3} maxLength={1000} defaultValue={customer.internalNote ?? ''} className="field-control" aria-describedby="notiz-hint" />
              <p id="notiz-hint" className="text-sm text-graphite">Nur für das Team sichtbar, wird bei einer Auskunft aber mitgeteilt. {HEALTH_DATA_HINT_TEAM}</p>
            </div>
            <SubmitButton variant="secondary">Speichern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Termine" description={`${customer.bookings.length} insgesamt`} />
        <ul className="ruled border-t border-rule">
          {customer.bookings.map((b) => (
            <li key={b.id}>
              <Link href={b.groupSessionId ? `/admin/kurse/${b.groupSessionId}` : `/admin/termine/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 no-underline text-ink hover:bg-paper">
                <span>
                  <span className="block font-semibold">{b.service.name}</span>
                  <span className="block text-sm text-graphite">{formatDateTime(b.startsAt, tz)}{b.staff && `, ${b.staff.name}`}</span>
                </span>
                <StatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet>
        <SheetHeader title="Einwilligungen" description="Nachweis nach Art. 7 Abs. 1 DSGVO." />
        <div className="px-5 pb-5 space-y-3">
          <p>WhatsApp-Benachrichtigungen: <strong>{customer.whatsappOptIn ? 'eingewilligt' : 'keine Einwilligung'}</strong></p>
          {customer.consentRecords.length > 0 && (
            <ul className="text-sm text-graphite space-y-1">
              {customer.consentRecords.map((c) => (
                <li key={c.id}>{formatDateTime(c.createdAt, tz)}: {c.granted ? 'erteilt' : 'widerrufen'} ({c.source}, Textversion {c.textVersion})</li>
              ))}
            </ul>
          )}
          {customer.whatsappOptIn && (
            <ActionForm action={withdrawCustomerWhatsappAction.bind(null, customer.id)}>
              <SubmitButton variant="secondary">Widerruf eintragen</SubmitButton>
            </ActionForm>
          )}
        </div>
      </Sheet>

      {can(ctx.role, 'customers.privacy') && (
        <Sheet>
          <SheetHeader title="Datenschutz-Anfragen" description="Für Anfragen nach Art. 15 (Auskunft), Art. 20 (Datenübertragbarkeit) und Art. 17 DSGVO (Löschung). Antwortfrist: ein Monat." />
          <div className="px-5 pb-5 space-y-5">
            <a href={`/admin/kunden/${customer.id}/export`} className="inline-flex items-center min-h-12 px-5 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold no-underline text-ink">
              Alle Daten herunterladen (JSON)
            </a>
            {search.loeschen === '1' ? (
              <ActionForm action={eraseCustomerAction.bind(null, customer.id)} className="space-y-3 border border-danger/40 bg-danger-soft rounded-[var(--radius-control)] p-4">
                <p className="font-semibold">Kundendaten endgültig löschen?</p>
                <p className="text-sm">Zukünftige Termine werden abgesagt (ohne Benachrichtigung), alle Termine anonymisiert, Konto und Einwilligungsnachweise gelöscht. Das kann nicht rückgängig gemacht werden.</p>
                <div className="space-y-1.5">
                  <label htmlFor="bestaetigung" className="block font-semibold">Zur Bestätigung LÖSCHEN eingeben</label>
                  <input id="bestaetigung" name="bestaetigung" autoComplete="off" className="field-control" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton variant="danger" pendingLabel="Wird gelöscht …">Endgültig löschen</SubmitButton>
                  <Link href={`/admin/kunden/${customer.id}`} className="inline-flex items-center min-h-12 px-4 font-semibold">Abbrechen</Link>
                </div>
              </ActionForm>
            ) : (
              <p>
                <Link href={`/admin/kunden/${customer.id}?loeschen=1`} className="text-danger font-semibold">Kundendaten löschen …</Link>
              </p>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}
