import Link from 'next/link'
import { db } from '@/lib/db'
import { isBookable, requireTenant } from '@/lib/tenant'
import { formatRanges, openingHours, openStatus } from '@/lib/hours'
import { formatDateShort, formatDuration, formatPrice, formatTime } from '@/lib/format'
import { getDayAvailability, loadService } from '@/lib/booking/data'
import { localDate, today } from '@/lib/time'
import { formatPhone, waMeLink } from '@/lib/phone'
import { ButtonLink, Notice } from '@/components/ui'
import { InstallPrompt } from '@/components/pwa'
import type { Service } from '@/generated/prisma/client'

export default async function TenantHome() {
  const tenant = await requireTenant()
  const [bookable, hours, services, upcomingCourses] = await Promise.all([
    isBookable(tenant),
    openingHours(tenant.id),
    db.service.findMany({
      where: { tenantId: tenant.id, active: true, staff: { some: { staff: { active: true } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    db.groupSession.count({ where: { tenantId: tenant.id, cancelledAt: null, startsAt: { gt: new Date() } } }),
  ])
  const status = await openStatus(tenant, hours)
  const individual = services.filter((s) => s.kind === 'INDIVIDUAL')

  // Frühester freier Termin für die erste Leistung – der schnellste Weg zum Termin
  let earliest: { service: Service; start: Date } | null = null
  if (bookable && individual[0]) {
    const service = await loadService(db, tenant.id, individual[0].id)
    if (service) {
      const days = await getDayAvailability(tenant, service, today(tenant.timezone), 14)
      const first = days.find((d) => d.first)
      if (first?.first) earliest = { service: individual[0], start: new Date(first.first) }
    }
  }

  const categories = new Map<string, Service[]>()
  for (const s of individual) {
    const key = s.category ?? ''
    categories.set(key, [...(categories.get(key) ?? []), s])
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="betrieb-name">
        <h1 id="betrieb-name" className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          {tenant.name}
        </h1>
        {tenant.tagline && <p className="text-lg text-graphite mt-3 max-w-prose">{tenant.tagline}</p>}
        <p className="mt-4 inline-flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${status.startsWith('Jetzt') ? 'bg-ok' : 'bg-rule-strong'}`} />
          {status}
        </p>

        {bookable ? (
          <div className="mt-6 space-y-4">
            {earliest && (
              <Link
                href={`/buchen?leistung=${earliest.service.id}&person=any&datum=${localDate(earliest.start, tenant.timezone)}&zeit=${formatTime(earliest.start, tenant.timezone)}`}
                className="block no-underline text-ink bg-surface border-[1.5px] border-brand-line rounded-[var(--radius-sheet)] p-5 hover:border-brand-text"
              >
                <span className="block text-graphite">Nächster freier Termin für {earliest.service.name}</span>
                <span className="flex items-baseline gap-3 mt-1">
                  <span className="font-figures text-4xl font-semibold text-brand-text">{formatTime(earliest.start, tenant.timezone)}</span>
                  <span className="text-lg font-semibold">{formatDateShort(earliest.start, tenant.timezone)}</span>
                </span>
                <span className="block mt-2 font-semibold text-brand-text">Diesen Termin übernehmen</span>
              </Link>
            )}
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/buchen" className="flex-1 sm:flex-none">
                Termin buchen
              </ButtonLink>
              {upcomingCourses > 0 && (
                <ButtonLink href="/kurse" variant="secondary" className="flex-1 sm:flex-none">
                  Kurse ansehen
                </ButtonLink>
              )}
            </div>
            <InstallPrompt appName={tenant.name} />
          </div>
        ) : (
          <div className="mt-6">
            <Notice tone="info" title="Online-Buchung derzeit nicht verfügbar">
              {tenant.phone || tenant.email ? 'Bitte vereinbaren Sie Ihren Termin telefonisch oder per E-Mail.' : 'Bitte versuchen Sie es später erneut.'}
            </Notice>
          </div>
        )}
      </section>

      {tenant.description && (
        <section aria-labelledby="ueber-uns">
          <h2 id="ueber-uns" className="font-display text-xl font-semibold mb-3">Über uns</h2>
          <p className="max-w-prose whitespace-pre-line">{tenant.description}</p>
        </section>
      )}

      {individual.length > 0 && (
        <section aria-labelledby="leistungen">
          <h2 id="leistungen" className="font-display text-xl font-semibold mb-3">Leistungen</h2>
          <div className="space-y-6">
            {[...categories.entries()].map(([category, list]) => (
              <div key={category || 'ohne'}>
                {category && <h3 className="font-semibold text-graphite mb-2">{category}</h3>}
                <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
                  {list.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={bookable ? `/buchen?leistung=${s.id}` : '#leistungen'}
                        className="flex items-start justify-between gap-4 px-5 py-4 no-underline text-ink hover:bg-brand-soft"
                      >
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
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="oeffnungszeiten">
          <h2 id="oeffnungszeiten" className="font-display text-xl font-semibold mb-3">Öffnungszeiten</h2>
          <table className="w-full text-sm">
            <tbody className="ruled">
              {hours.map((d) => (
                <tr key={d.weekday} className="border-t border-rule first:border-t-0">
                  <th scope="row" className="text-left font-normal py-2 pr-4">{d.label}</th>
                  <td className={`py-2 font-figures text-right ${d.ranges.length ? '' : 'text-graphite'}`}>{formatRanges(d.ranges)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="kontakt">
          <h2 id="kontakt" className="font-display text-xl font-semibold mb-3">Kontakt</h2>
          <address className="not-italic space-y-2">
            {tenant.street && (
              <p>
                {tenant.street}
                <br />
                {tenant.postalCode} {tenant.city}
              </p>
            )}
            {tenant.phone && (
              <p>
                <a href={`tel:${tenant.phone}`}>{formatPhone(tenant.phone)}</a>
              </p>
            )}
            {tenant.email && (
              <p>
                <a href={`mailto:${tenant.email}`}>{tenant.email}</a>
              </p>
            )}
            {tenant.whatsappDisplayNumber && (
              <p>
                <a href={waMeLink(tenant.whatsappDisplayNumber)} rel="noopener noreferrer" target="_blank">
                  Nachricht per WhatsApp
                </a>
                <span className="block text-xs text-graphite mt-0.5">Öffnet WhatsApp (Meta). Es gilt die Datenschutzerklärung von WhatsApp.</span>
              </p>
            )}
          </address>
        </section>
      </div>
    </div>
  )
}
