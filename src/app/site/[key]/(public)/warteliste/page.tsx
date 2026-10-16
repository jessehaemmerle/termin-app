import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { getCustomerContext } from '@/lib/auth/guards'
import { daysBetween, isValidDateString, today } from '@/lib/time'
import { formatDayString } from '@/lib/format'
import { BookingDetailsForm } from '../buchen/details-form'
import { joinDayWaitlistAction } from './actions'

export const metadata: Metadata = { title: 'Warteliste', robots: { index: false } }

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const tenant = await requireTenant()
  if (!tenant.waitlistEnabled) notFound()
  const search = await searchParams
  const date = search.datum
  if (!search.leistung || !isValidDateString(date) || daysBetween(today(tenant.timezone), date) < 0) notFound()
  const service = await db.service.findFirst({ where: { id: search.leistung, tenantId: tenant.id, active: true, kind: 'INDIVIDUAL' } })
  if (!service) notFound()
  const staff = search.person ? await db.staff.findFirst({ where: { id: search.person, tenantId: tenant.id, active: true } }) : null
  const customer = await getCustomerContext()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Warteliste</h1>
        <p className="mt-2">
          <span className="font-semibold">{service.name}</span> am <span className="font-semibold">{formatDayString(date)}</span>
          {staff && <> bei {staff.name}</>}
        </p>
        <p className="text-graphite mt-2">
          Sagt jemand ab, benachrichtigen wir alle auf der Warteliste. Wer zuerst bucht, erhält den Termin. Der Eintrag wird nach diesem Tag automatisch gelöscht.
        </p>
      </div>
      <BookingDetailsForm
        action={joinDayWaitlistAction}
        hidden={{ leistung: service.id, datum: date, ...(staff ? { person: staff.id } : {}) }}
        tenantName={tenant.name}
        whatsappEnabled={tenant.whatsappEnabled}
        requirePhone={false}
        customer={customer ? { name: customer.customer.name, email: customer.customer.email ?? '', phone: customer.customer.phone ?? '' } : null}
        accountsEnabled={tenant.allowCustomerAccounts}
        submitLabel="Auf die Warteliste setzen"
        showNote={false}
      />
      <p>
        <Link href={`/buchen?leistung=${service.id}`}>Zurück zur Terminauswahl</Link>
      </p>
    </div>
  )
}
