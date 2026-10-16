import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox, Notice, Sheet, SheetHeader } from '@/components/ui'
import { HoursEditor } from '../../../_components/hours-editor'
import { AbsenceForm, AbsenceList } from '../../../_components/absences'
import { saveStaffAction, saveStaffHoursAction } from '../../../_actions/team'

export const metadata: Metadata = { title: 'Person' }

export default async function StaffDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const { id } = await params
  const search = await searchParams
  const staff = await db.staff.findFirst({ where: { id, tenantId: ctx.tenant.id }, include: { services: true, user: true } })
  if (!staff) notFound()
  const [services, ownHours, tenantHours, absences] = await Promise.all([
    db.service.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }] }),
    db.workingHours.findMany({ where: { tenantId: ctx.tenant.id, staffId: staff.id } }),
    db.workingHours.findMany({ where: { tenantId: ctx.tenant.id, staffId: null } }),
    db.timeOff.findMany({ where: { tenantId: ctx.tenant.id, staffId: staff.id, endsAt: { gt: new Date() } }, orderBy: { startsAt: 'asc' } }),
  ])
  const offered = new Set(staff.services.map((s) => s.serviceId))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/team" className="text-sm">Team</Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-2">{staff.name}</h1>
        {staff.user && <p className="text-graphite">Zugang: {staff.user.email}</p>}
      </div>
      {search.neu && <Notice tone="ok" title="Person angelegt" role="status">Lege jetzt Leistungen und Arbeitszeiten fest.</Notice>}

      <Sheet>
        <SheetHeader title="Profil und Leistungen" />
        <div className="px-5 pb-5">
          <ActionForm action={saveStaffAction.bind(null, staff.id)}>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block font-semibold">Name</label>
                <input id="name" name="name" required defaultValue={staff.name} className="field-control" />
                <FieldError name="name" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="farbe" className="block font-semibold">Farbe</label>
                <input id="farbe" name="farbe" type="color" defaultValue={staff.color} className="field-control p-1 h-12" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reihenfolge" className="block font-semibold">Reihenfolge</label>
                <input id="reihenfolge" name="reihenfolge" type="number" min={0} max={999} defaultValue={staff.sortOrder} className="field-control" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bio" className="block font-semibold">Kurzbeschreibung <span className="font-normal text-graphite">(öffentlich, optional)</span></label>
              <input id="bio" name="bio" maxLength={200} defaultValue={staff.bio ?? ''} className="field-control" placeholder="z. B. Schnitt & Farbe" />
            </div>
            <fieldset className="space-y-2">
              <legend className="font-semibold mb-1">Bietet an</legend>
              {services.map((s) => (
                <Checkbox key={s.id} id={`l-${s.id}`} name="leistungen" value={s.id} defaultChecked={offered.has(s.id)} label={s.name} hint={s.active ? undefined : 'inaktiv'} />
              ))}
            </fieldset>
            <Checkbox id="aktiv" name="aktiv" defaultChecked={staff.active} label="Online buchbar" />
            <SubmitButton variant="secondary">Speichern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Arbeitszeiten" />
        <div className="px-5 pb-5">
          <ActionForm action={saveStaffHoursAction.bind(null, staff.id)}>
            <Checkbox id="betriebszeiten" name="betriebszeiten" defaultChecked={staff.usesTenantHours} label="Öffnungszeiten des Betriebs verwenden" hint="Wenn nicht angehakt, gelten die folgenden eigenen Zeiten." />
            <HoursEditor rows={staff.usesTenantHours && ownHours.length === 0 ? tenantHours : ownHours} />
            <SubmitButton variant="secondary">Arbeitszeiten speichern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="Abwesenheiten" description="In diesen Zeiträumen ist keine Buchung bei dieser Person möglich." />
        <AbsenceList items={absences} timeZone={ctx.tenant.timezone} emptyText="Keine Abwesenheiten eingetragen." />
        <div className="p-5 border-t border-rule">
          <AbsenceForm staffId={staff.id} timeZone={ctx.tenant.timezone} labelHint="Neutral formulieren, z. B. „Urlaub“ oder „Abwesend“ – keine Krankheitsgründe (Gesundheitsdaten)." />
        </div>
      </Sheet>
    </div>
  )
}
