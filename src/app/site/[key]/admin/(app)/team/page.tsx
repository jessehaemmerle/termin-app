import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { can, requireStaff, ROLE_LABELS } from '@/lib/auth/guards'
import { ActionForm, FieldError, ResultValue, SubmitButton } from '@/components/action-form'
import { Checkbox, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { inviteUserAction, resendInviteAction, saveStaffAction, updateUserAction } from '../../_actions/team'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage() {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const isOwner = can(ctx.role, 'team.manage')
  const [staff, users] = await Promise.all([
    db.staff.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }], include: { _count: { select: { services: true } }, user: true } }),
    isOwner ? db.user.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: [{ role: 'asc' }, { name: 'asc' }], include: { staff: true } }) : Promise.resolve([]),
  ])
  const unlinkedStaff = staff.filter((s) => !s.userId)

  return (
    <div className="max-w-3xl space-y-8">
      <PageTitle title="Team" description="Buchbare Personen mit ihren Leistungen und Arbeitszeiten sowie die Zugänge zur Verwaltung." />

      <section aria-labelledby="personen" className="space-y-3">
        <h2 id="personen" className="font-display text-xl font-semibold">Buchbare Personen</h2>
        <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
          {staff.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/team/${s.id}`} className={`flex items-center justify-between gap-4 px-5 py-3.5 no-underline text-ink hover:bg-paper ${s.active ? '' : 'opacity-60'}`}>
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>
                    <span className="block font-semibold">{s.name}{!s.active && <span className="ml-2 text-xs text-graphite">inaktiv</span>}</span>
                    <span className="block text-sm text-graphite">{s._count.services} Leistungen, {s.usesTenantHours ? 'Öffnungszeiten des Betriebs' : 'eigene Arbeitszeiten'}{s.user ? `, Zugang: ${s.user.email}` : ''}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Sheet>
          <SheetHeader title="Neue Person" description="Wird automatisch allen aktiven Leistungen zugeordnet; das kannst du danach anpassen." />
          <div className="px-5 pb-5">
            <ActionForm action={saveStaffAction.bind(null, null)} className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5 grow">
                <label htmlFor="name-neu" className="block font-semibold">Name</label>
                <input id="name-neu" name="name" required className="field-control" />
                <FieldError name="name" />
              </div>
              <input type="hidden" name="farbe" value="#1f5f8b" />
              <SubmitButton>Anlegen</SubmitButton>
            </ActionForm>
          </div>
        </Sheet>
      </section>

      {isOwner && (
        <section aria-labelledby="zugaenge" className="space-y-3">
          <h2 id="zugaenge" className="font-display text-xl font-semibold">Zugänge zur Verwaltung</h2>
          <p className="text-graphite text-sm">Inhaber:innen dürfen alles. Leitung verwaltet Termine, Kunden, Leistungen und Zeiten. Mitarbeiter:innen sehen nur ihre eigenen Termine.</p>
          <ul className="space-y-3">
            {users.map((u) => (
              <li key={u.id}>
                <Sheet className="p-4">
                  <ActionForm action={updateUserAction.bind(null, u.id)} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                    <div>
                      <p className="font-semibold">{u.name}{u.id === ctx.user.id && <span className="text-graphite font-normal"> (du)</span>}</p>
                      <p className="text-sm text-graphite">{u.email}{!u.passwordHash && ', Einladung offen'}{u.totpEnabledAt && ', 2FA aktiv'}{u.staff && `, bucht als ${u.staff.name}`}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`rolle-${u.id}`} className="block text-sm font-semibold">Rolle</label>
                      <select id={`rolle-${u.id}`} name="rolle" defaultValue={u.role} className="field-control min-h-11 py-1.5">
                        {(['OWNER', 'MANAGER', 'STAFF'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id={`aktiv-${u.id}`} name="aktiv" defaultChecked={u.active} label="Aktiv" />
                      <SubmitButton variant="secondary" className="min-h-11">Speichern</SubmitButton>
                    </div>
                  </ActionForm>
                  {!u.passwordHash && (
                    <ActionForm action={resendInviteAction.bind(null, u.id)} className="mt-3 space-y-2">
                      <SubmitButton variant="quiet" className="min-h-10 px-2">Einladung erneut senden</SubmitButton>
                      <ResultValue field="inviteLink" label="Einladungslink (72 Stunden gültig)" />
                    </ActionForm>
                  )}
                </Sheet>
              </li>
            ))}
          </ul>
          <Sheet>
            <SheetHeader title="Person einladen" description="Die Person erhält eine E-Mail mit einem Link, über den sie ihr Passwort festlegt." />
            <div className="px-5 pb-5">
              <ActionForm action={inviteUserAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="inv-name" className="block font-semibold">Name</label>
                  <input id="inv-name" name="name" required className="field-control" />
                  <FieldError name="name" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="inv-email" className="block font-semibold">E-Mail-Adresse</label>
                  <input id="inv-email" name="email" type="email" required className="field-control" />
                  <FieldError name="email" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="inv-rolle" className="block font-semibold">Rolle</label>
                  <select id="inv-rolle" name="rolle" defaultValue="STAFF" className="field-control">
                    {(['STAFF', 'MANAGER', 'OWNER'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="inv-person" className="block font-semibold">Ist buchbar als</label>
                  <select id="inv-person" name="person" className="field-control">
                    <option value="">Nicht buchbar (nur Verwaltung)</option>
                    {unlinkedStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-3">
                  <SubmitButton pendingLabel="Wird eingeladen …">Einladen</SubmitButton>
                  <ResultValue field="inviteLink" label="Einladungslink (72 Stunden gültig)" />
                </div>
              </ActionForm>
            </div>
          </Sheet>
        </section>
      )}
    </div>
  )
}
