import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth/guards'
import { platformBase } from '@/lib/env'
import { platformPath, tenantBaseUrl } from '@/lib/tenant'
import { DPA_VERSION } from '@/lib/legal/consent'
import { formatDate } from '@/lib/format'
import { ActionForm, FieldError, ResultValue, SubmitButton } from '@/components/action-form'
import { PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { createTenantAction, platformLogoutAction } from '../_actions'

export const metadata: Metadata = { title: 'Betriebe', robots: { index: false } }

export default async function TenantsPage() {
  const admin = await requirePlatformAdmin()
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, slug: true, status: true, createdAt: true, dpaAcceptedAt: true, dpaVersion: true, customDomain: true, customDomainVerifiedAt: true, _count: { select: { users: true } } },
  })
  const newRequests = await db.accessRequest.count({ where: { status: 'NEW' } })
  return (
    <div className="space-y-8">
      <p>
        <Link href={platformPath('/betriebe/anfragen')} className="font-semibold">
          Zugangsanfragen{newRequests > 0 ? ` (${newRequests} neu)` : ''}
        </Link>
      </p>
      <PageTitle
        title="Betriebe"
        description="Plattform-Admins sehen nur Stammdaten der Betriebe – keine Kunden- oder Termindaten (Auftragsverarbeitung nur auf Weisung)."
        action={<form action={platformLogoutAction}><button type="submit" className="font-semibold text-brand-text min-h-11">Abmelden ({admin.email})</button></form>}
      />
      <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
        {tenants.map((t) => (
          <li key={t.id}>
            <Link href={platformPath(`/betriebe/${t.id}`)} className="grid sm:grid-cols-[1fr_auto] gap-2 px-5 py-3.5 no-underline text-ink hover:bg-paper">
              <span>
                <span className="block font-semibold">{t.name}{t.status === 'SUSPENDED' && <span className="ml-2 text-xs text-danger">gesperrt</span>}</span>
                <span className="block text-sm text-graphite">{tenantBaseUrl(t)}</span>
              </span>
              <span className="text-sm text-graphite sm:text-right">
                {t.dpaAcceptedAt && t.dpaVersion === DPA_VERSION ? 'AVV abgeschlossen' : 'AVV offen'}
                <span className="block">seit {formatDate(t.createdAt, 'Europe/Vienna')}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Sheet>
        <SheetHeader title="Neuen Betrieb anlegen" description="Die Inhaberin bzw. der Inhaber erhält eine Einladung, legt ein Passwort fest und schließt den AVV im Verwaltungsbereich ab." />
        <div className="px-5 pb-5">
          <ActionForm action={createTenantAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block font-semibold">Name des Betriebs</label>
              <input id="name" name="name" required className="field-control" />
              <FieldError name="name" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slug" className="block font-semibold">Subdomain</label>
              <div className="flex items-center gap-2">
                <input id="slug" name="slug" required pattern="[a-z0-9-]+" className="field-control" aria-describedby="slug-hint" />
                <span className="text-graphite shrink-0">.{platformBase().hostname}</span>
              </div>
              <p id="slug-hint" className="text-sm text-graphite">Kleinbuchstaben, Ziffern, Bindestriche.</p>
              <FieldError name="slug" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inhaberName" className="block font-semibold">Inhaber:in – Name</label>
              <input id="inhaberName" name="inhaberName" required className="field-control" />
              <FieldError name="inhaberName" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inhaberEmail" className="block font-semibold">Inhaber:in – E-Mail</label>
              <input id="inhaberEmail" name="inhaberEmail" type="email" required className="field-control" />
              <FieldError name="inhaberEmail" />
            </div>
            <div className="sm:col-span-2 space-y-3">
              <SubmitButton pendingLabel="Wird angelegt …">Betrieb anlegen und einladen</SubmitButton>
              <ResultValue field="inviteLink" label="Einladungslink (72 Stunden gültig)" />
            </div>
          </ActionForm>
        </div>
      </Sheet>
    </div>
  )
}
