import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { isBookable, requireTenant } from '@/lib/tenant'
import { getDayAvailability, getSlots, loadService } from '@/lib/booking/data'
import { groupSlotsByDaypart } from '@/lib/booking/availability'
import { addDays, daysBetween, isValidDateString, localMinuteOfDay, timeToMinutes, today, zonedInstant } from '@/lib/time'
import { formatDayString, formatDuration, formatPrice, formatTime } from '@/lib/format'
import { getCustomerContext } from '@/lib/auth/guards'
import { Notice } from '@/components/ui'
import { BookingDetailsForm } from './details-form'
import { bookAction } from './actions'

export const metadata: Metadata = { title: 'Termin buchen' }

type Search = Record<string, string | string[] | undefined>

function param(search: Search, key: string): string | undefined {
  const v = search[key]
  return typeof v === 'string' && v.length < 80 ? v : undefined
}

function href(params: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  return `/buchen?${q.toString()}`
}

const STEPS = ['Leistung', 'Person', 'Termin', 'Ihre Angaben'] as const

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-graphite font-semibold">
        Schritt {step} von {STEPS.length}: {STEPS[step - 1]}
      </p>
      <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-1">{title}</h1>
      <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 rounded-full ${i < step ? 'bg-brand' : 'bg-rule'}`} />
        ))}
      </div>
    </div>
  )
}

export default async function BookingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const tenant = await requireTenant()
  if (!(await isBookable(tenant))) redirect('/')
  const search = await searchParams
  const serviceId = param(search, 'leistung')
  let person = param(search, 'person')
  const zeit = param(search, 'zeit')
  const todayLocal = today(tenant.timezone)

  // Schritt 1: Leistung wählen
  if (!serviceId) {
    const services = await db.service.findMany({
      where: { tenantId: tenant.id, active: true, kind: 'INDIVIDUAL', staff: { some: { staff: { active: true } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    const hasCourses = (await db.groupSession.count({ where: { tenantId: tenant.id, cancelledAt: null, startsAt: { gt: new Date() } } })) > 0
    return (
      <>
        <StepHeader step={1} title="Was dürfen wir für Sie tun?" />
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {services.map((s) => (
            <li key={s.id}>
              <Link href={href({ leistung: s.id })} className="flex items-start justify-between gap-4 px-5 py-4 no-underline text-ink hover:bg-brand-soft min-h-16">
                <span className="min-w-0">
                  <span className="block font-semibold">{s.name}</span>
                  {s.description && <span className="block text-sm text-graphite mt-0.5">{s.description}</span>}
                </span>
                <span className="text-right shrink-0 text-sm">
                  <span className="block font-figures">{formatDuration(s.durationMinutes)}</span>
                  {s.priceCents !== null && <span className="block text-graphite">{formatPrice(s.priceCents, s.priceFrom)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {hasCourses && (
          <p className="mt-6">
            Sie suchen einen Kurs? <Link href="/kurse">Zu den Kursterminen</Link>
          </p>
        )}
      </>
    )
  }

  const service = await loadService(db, tenant.id, serviceId)
  if (!service || service.kind !== 'INDIVIDUAL') redirect('/buchen')
  const staff = await db.staff.findMany({
    where: { tenantId: tenant.id, active: true, id: { in: service.staff.map((s) => s.staffId) } },
    orderBy: { sortOrder: 'asc' },
  })
  if (!staff.length) redirect('/buchen')
  if (staff.length === 1) person = staff[0].id
  if (person && person !== 'any' && !staff.some((s) => s.id === person)) person = undefined

  // Schritt 2: Person wählen
  if (!person) {
    return (
      <>
        <StepHeader step={2} title="Bei wem möchten Sie den Termin?" />
        <p className="mb-4 text-graphite">{service.name}, {formatDuration(service.durationMinutes)}</p>
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          <li>
            <Link href={href({ leistung: service.id, person: 'any' })} className="block px-5 py-4 no-underline text-ink hover:bg-brand-soft min-h-16">
              <span className="block font-semibold">Keine Präferenz</span>
              <span className="block text-sm text-graphite">Wir zeigen alle freien Termine</span>
            </Link>
          </li>
          {staff.map((s) => (
            <li key={s.id}>
              <Link href={href({ leistung: service.id, person: s.id })} className="block px-5 py-4 no-underline text-ink hover:bg-brand-soft min-h-16">
                <span className="block font-semibold">{s.name}</span>
                {s.bio && <span className="block text-sm text-graphite">{s.bio}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/buchen">Andere Leistung wählen</Link>
        </p>
      </>
    )
  }

  const staffFilter = person === 'any' ? undefined : [person]
  const personName = person === 'any' ? 'Keine Präferenz' : staff.find((s) => s.id === person)?.name

  // Tagesauswahl: 14 Tage ab "ab" (innerhalb des Buchungshorizonts)
  const requestedDate = param(search, 'datum')
  const stripStartParam = param(search, 'ab')
  let stripStart = isValidDateString(stripStartParam) && daysBetween(todayLocal, stripStartParam) >= 0 ? stripStartParam : todayLocal
  if (isValidDateString(requestedDate) && (daysBetween(stripStart, requestedDate) < 0 || daysBetween(stripStart, requestedDate) >= 14)) {
    stripStart = daysBetween(todayLocal, requestedDate) >= 0 ? requestedDate : todayLocal
  }
  const stripDays = Math.max(1, Math.min(14, tenant.maxAdvanceDays - daysBetween(todayLocal, stripStart) + 1))
  const days = await getDayAvailability(tenant, service, stripStart, stripDays, staffFilter)
  const date = isValidDateString(requestedDate) ? requestedDate : (days.find((d) => d.count > 0)?.date ?? stripStart)

  // Schritt 4: Angaben (Zeit gewählt)
  if (zeit) {
    const minute = timeToMinutes(zeit)
    const { slots } = await getSlots(tenant, service, date, staffFilter)
    const start = minute === null ? null : zonedInstant(date, minute, tenant.timezone).getTime()
    const slot = slots.find((s) => s.start === start)
    if (!slot) {
      return (
        <>
          <StepHeader step={3} title="Dieser Termin ist nicht mehr frei" />
          <Notice tone="warn" title="Zeit bereits vergeben">
            Inzwischen hat jemand anderes diesen Termin gebucht. Bitte wählen Sie eine andere Uhrzeit.
          </Notice>
          <p className="mt-6">
            <Link href={href({ leistung: service.id, person, datum: date })}>Freie Zeiten am {formatDayString(date)} ansehen</Link>
          </p>
        </>
      )
    }
    const customer = await getCustomerContext()
    return (
      <>
        <StepHeader step={4} title="Ihre Angaben" />
        <dl className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)] mb-6">
          {[
            { term: 'Leistung', value: `${service.name} (${formatDuration(service.durationMinutes)})`, change: href({}) },
            ...(staff.length > 1 ? [{ term: 'Bei', value: personName ?? '', change: href({ leistung: service.id }) }] : []),
            {
              term: 'Termin',
              value: `${formatDayString(date)}, ${formatTime(new Date(slot.start), tenant.timezone)} Uhr`,
              change: href({ leistung: service.id, person, datum: date }),
            },
          ].map((row) => (
            <div key={row.term} className="flex items-baseline justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <dt className="text-sm text-graphite">{row.term}</dt>
                <dd className="font-semibold">{row.value}</dd>
              </div>
              <Link href={row.change} className="text-sm shrink-0" aria-label={`${row.term} ändern`}>
                Ändern
              </Link>
            </div>
          ))}
        </dl>
        <BookingDetailsForm
          action={bookAction}
          hidden={{ leistung: service.id, person, datum: date, zeit: formatTime(new Date(slot.start), tenant.timezone) }}
          tenantName={tenant.name}
          whatsappEnabled={tenant.whatsappEnabled}
          requirePhone={tenant.requirePhone}
          requireApproval={tenant.requireApproval}
          cancellationDeadlineHours={tenant.cancellationDeadlineHours}
          customer={customer ? { name: customer.customer.name, email: customer.customer.email ?? '', phone: customer.customer.phone ?? '' } : null}
          accountsEnabled={tenant.allowCustomerAccounts}
          submitLabel={tenant.requireApproval ? 'Terminanfrage senden' : 'Termin verbindlich buchen'}
        />
      </>
    )
  }

  // Schritt 3: Tag und Uhrzeit
  const { slots } = await getSlots(tenant, service, date, staffFilter)
  const groups = groupSlotsByDaypart(slots, (s) => localMinuteOfDay(new Date(s.start), tenant.timezone))
  const nextFree = days.find((d) => d.count > 0 && daysBetween(date, d.date) > 0)
  const prevStart = addDays(stripStart, -14)
  const nextStart = addDays(stripStart, 14)
  const canGoBack = daysBetween(todayLocal, stripStart) > 0
  const canGoForward = daysBetween(todayLocal, nextStart) <= tenant.maxAdvanceDays

  return (
    <>
      <StepHeader step={3} title="Wann passt es Ihnen?" />
      <p className="mb-5 text-graphite">
        {service.name}
        {staff.length > 1 && `, ${personName}`}
      </p>

      <nav aria-label="Tag wählen" className="-mx-4 px-4 overflow-x-auto">
        <ul className="flex gap-2 pb-2 w-max">
          {days.map((d) => {
            const selected = d.date === date
            return (
              <li key={d.date}>
                <Link
                  href={href({ leistung: service.id, person, datum: d.date, ab: stripStart })}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={`${formatDayString(d.date)}: ${d.count ? `${d.count} freie Zeiten` : d.open ? 'ausgebucht' : 'geschlossen'}`}
                  className={`flex flex-col items-center justify-center w-16 h-20 rounded-[var(--radius-control)] border-[1.5px] no-underline ${
                    selected
                      ? 'bg-brand text-on-brand border-brand'
                      : d.count
                        ? 'bg-surface text-ink border-rule-strong hover:border-ink'
                        : 'bg-paper text-graphite border-rule'
                  }`}
                >
                  <span className="text-xs">{formatDayString(d.date, { weekday: 'short' })}</span>
                  <span className="font-figures text-2xl font-semibold leading-none my-1">{Number(d.date.slice(8))}</span>
                  <span className="text-xs">{d.count ? `${d.count} frei` : d.open ? 'voll' : 'zu'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="flex justify-between mt-2 text-sm">
        {canGoBack ? <Link href={href({ leistung: service.id, person, ab: prevStart, datum: prevStart < todayLocal ? todayLocal : prevStart })}>Frühere Tage</Link> : <span />}
        {canGoForward && <Link href={href({ leistung: service.id, person, ab: nextStart, datum: nextStart })}>Spätere Tage</Link>}
      </div>

      <section aria-labelledby="zeiten" className="mt-6">
        <h2 id="zeiten" className="font-display text-xl font-semibold mb-4">{formatDayString(date)}</h2>
        {groups.length === 0 ? (
          <div className="space-y-4">
            <Notice tone="info" title="An diesem Tag ist leider nichts frei." />
            <div className="flex flex-col gap-2">
              {nextFree && (
                <Link href={href({ leistung: service.id, person, datum: nextFree.date, ab: stripStart })} className="font-semibold">
                  Nächster freier Tag: {formatDayString(nextFree.date)}
                </Link>
              )}
              {tenant.waitlistEnabled && (
                <Link href={`/warteliste?leistung=${service.id}&datum=${date}${person !== 'any' ? `&person=${person}` : ''}`}>
                  Auf die Warteliste für diesen Tag setzen
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.label}>
                <h3 className="text-graphite font-semibold mb-2">{g.label}</h3>
                <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {g.slots.map((s) => {
                    const time = formatTime(new Date(s.start), tenant.timezone)
                    return (
                      <li key={s.start}>
                        <Link
                          href={href({ leistung: service.id, person, datum: date, zeit: time })}
                          className="flex items-center justify-center h-14 bg-surface border-[1.5px] border-rule-strong rounded-[var(--radius-control)] no-underline text-ink hover:border-brand-text hover:bg-brand-soft"
                          aria-label={`${time} Uhr wählen`}
                        >
                          <span className="font-figures text-xl font-semibold">{time}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8">
        <Link href={staff.length > 1 ? href({ leistung: service.id }) : '/buchen'}>Zurück</Link>
      </p>
    </>
  )
}
