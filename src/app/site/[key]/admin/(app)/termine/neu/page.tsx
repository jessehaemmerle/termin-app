import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff } from '@/lib/auth/guards'
import { isValidDateString, today } from '@/lib/time'
import { formatPhone } from '@/lib/phone'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { HEALTH_DATA_HINT_TEAM } from '@/lib/legal/consent'
import { createAdminBookingAction } from '../../../_actions/bookings'

export const metadata: Metadata = { title: 'Neuer Termin' }

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff()
  const { tenant } = ctx
  const search = await searchParams
  const seeAll = can(ctx.role, 'bookings.all')
  const canSearch = can(ctx.role, 'customers.manage')

  const [services, staff] = await Promise.all([
    db.service.findMany({ where: { tenantId: tenant.id, active: true, kind: 'INDIVIDUAL' }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    seeAll ? db.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: 'asc' } }) : Promise.resolve(ctx.staff ? [ctx.staff] : []),
  ])
  const chosen = search.kunde && canSearch ? await db.customer.findFirst({ where: { id: search.kunde, tenantId: tenant.id } }) : null
  const query = search.suche?.trim().slice(0, 80)
  const results =
    canSearch && query && !chosen
      ? await db.customer.findMany({
          where: { tenantId: tenant.id, OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query.replace(/\s/g, '') } }] },
          take: 10,
          orderBy: { lastActivityAt: 'desc' },
        })
      : []
  const date = isValidDateString(search.datum) ? search.datum : today(tenant.timezone)

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle title="Neuer Termin" description="Für telefonische oder persönliche Buchungen. Überschneidungen werden geprüft, Öffnungszeiten nicht erzwungen." />

      <Sheet>
        <SheetHeader title="Kund:in" />
        <div className="px-5 pb-5 space-y-4">
          {chosen ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{chosen.name}</p>
                <p className="text-sm text-graphite">{[chosen.email, chosen.phone ? formatPhone(chosen.phone) : null].filter(Boolean).join(', ')}</p>
              </div>
              <Link href="/admin/termine/neu">Ändern</Link>
            </div>
          ) : (
            canSearch && (
              <>
                <form role="search" className="flex gap-2">
                  <label htmlFor="suche" className="sr-only">Bestehende Kund:in suchen</label>
                  <input id="suche" name="suche" defaultValue={query} placeholder="Bestehende Kund:in suchen" className="field-control" />
                  <button type="submit" className="min-h-12 px-4 rounded-[var(--radius-control)] border-[1.5px] border-rule-strong bg-surface font-semibold">Suchen</button>
                </form>
                {query && (
                  results.length ? (
                    <ul className="ruled border border-rule rounded-[var(--radius-control)]">
                      {results.map((c) => (
                        <li key={c.id}>
                          <Link href={`/admin/termine/neu?kunde=${c.id}`} className="block px-4 py-2.5 no-underline text-ink hover:bg-paper">
                            <span className="font-semibold">{c.name}</span>
                            <span className="block text-sm text-graphite">{[c.email, c.phone ? formatPhone(c.phone) : null].filter(Boolean).join(', ')}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-graphite">Keine Treffer. Lege die Person unten neu an.</p>
                  )
                )}
              </>
            )
          )}
        </div>
      </Sheet>

      <ActionForm action={createAdminBookingAction}>
        {chosen && <input type="hidden" name="kunde" value={chosen.id} />}
        {!chosen && (
          <fieldset className="space-y-4">
            <legend className="font-display text-lg font-semibold mb-2">Neue Kund:in</legend>
            <div className="space-y-1.5">
              <label htmlFor="name" className="block font-semibold">Name</label>
              <input id="name" name="name" className="field-control" maxLength={100} />
              <FieldError name="name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block font-semibold">E-Mail <span className="font-normal text-graphite">(optional)</span></label>
                <input id="email" name="email" type="email" className="field-control" maxLength={200} />
                <FieldError name="email" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="telefon" className="block font-semibold">Telefon <span className="font-normal text-graphite">(optional)</span></label>
                <input id="telefon" name="telefon" type="tel" className="field-control" maxLength={30} />
                <FieldError name="telefon" />
              </div>
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold mb-2">Termin</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="leistung" className="block font-semibold">Leistung</label>
              <select id="leistung" name="leistung" required className="field-control" defaultValue={search.leistung}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} Min.)</option>
                ))}
              </select>
              <FieldError name="leistung" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="person" className="block font-semibold">Bei</label>
              <select id="person" name="person" required className="field-control" defaultValue={search.person}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <FieldError name="person" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="datum" className="block font-semibold">Datum</label>
              <input id="datum" name="datum" type="date" required defaultValue={date} className="field-control" />
              <FieldError name="datum" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="zeit" className="block font-semibold">Uhrzeit</label>
              <input id="zeit" name="zeit" type="time" step={300} required defaultValue={search.zeit} className="field-control" />
              <FieldError name="zeit" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notiz" className="block font-semibold">Notiz <span className="font-normal text-graphite">(optional)</span></label>
            <textarea id="notiz" name="notiz" rows={2} maxLength={500} className="field-control" aria-describedby="notiz-hint" />
            <p id="notiz-hint" className="text-sm text-graphite">{HEALTH_DATA_HINT_TEAM}</p>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display text-lg font-semibold mb-2">Benachrichtigung</legend>
          <Checkbox id="benachrichtigen" name="benachrichtigen" defaultChecked label="Bestätigung per E-Mail senden" hint="Nur wenn eine E-Mail-Adresse vorhanden ist." />
          {tenant.whatsappEnabled && (
            <Checkbox
              id="whatsapp"
              name="whatsapp"
              label="Die Kundin bzw. der Kunde möchte Nachrichten per WhatsApp"
              hint="Nur ankreuzen, wenn die Person ausdrücklich eingewilligt hat (z. B. am Telefon). Die Einwilligung wird mit Zeitpunkt protokolliert."
            />
          )}
        </fieldset>

        <SubmitButton pendingLabel="Wird eingetragen …">Termin eintragen</SubmitButton>
      </ActionForm>
    </div>
  )
}
