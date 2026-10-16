import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { centsToInput } from '@/lib/admin/forms'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { deleteServiceAction, saveServiceAction } from '../../../_actions/catalog'

export const metadata: Metadata = { title: 'Leistung bearbeiten' }

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff({ permission: 'services.manage' })
  const { id } = await params
  const isNew = id === 'neu'
  const service = isNew
    ? null
    : await db.service.findFirst({ where: { id, tenantId: ctx.tenant.id }, include: { staff: true, resources: true } })
  if (!isNew && !service) notFound()
  const [staff, resources] = await Promise.all([
    db.staff.findMany({ where: { tenantId: ctx.tenant.id, active: true }, orderBy: { sortOrder: 'asc' } }),
    db.resource.findMany({ where: { tenantId: ctx.tenant.id, active: true }, orderBy: { name: 'asc' } }),
  ])
  const offered = new Set(service ? service.staff.map((s) => s.staffId) : staff.map((s) => s.id))
  const needs = new Set(service?.resources.map((r) => r.resourceId) ?? [])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/leistungen" className="text-sm">Alle Leistungen</Link>
        <PageTitle title={isNew ? 'Neue Leistung' : service!.name} />
      </div>
      <ActionForm action={saveServiceAction.bind(null, service?.id ?? null)}>
        <div className="space-y-1.5">
          <label htmlFor="name" className="block font-semibold">Name</label>
          <input id="name" name="name" required maxLength={100} defaultValue={service?.name} className="field-control" />
          <FieldError name="name" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="beschreibung" className="block font-semibold">Beschreibung <span className="font-normal text-graphite">(optional)</span></label>
          <textarea id="beschreibung" name="beschreibung" rows={2} maxLength={500} defaultValue={service?.description ?? ''} className="field-control" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="kategorie" className="block font-semibold">Kategorie <span className="font-normal text-graphite">(optional)</span></label>
            <input id="kategorie" name="kategorie" maxLength={60} defaultValue={service?.category ?? ''} className="field-control" placeholder="z. B. Schneiden" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="art" className="block font-semibold">Art</label>
            <select id="art" name="art" defaultValue={service?.kind ?? 'INDIVIDUAL'} className="field-control">
              <option value="INDIVIDUAL">Einzeltermin</option>
              <option value="GROUP">Kurs / Gruppentermin</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="dauer" className="block font-semibold">Dauer (Min.)</label>
            <input id="dauer" name="dauer" type="number" min={5} max={720} step={5} required defaultValue={service?.durationMinutes ?? 30} className="field-control" />
            <FieldError name="dauer" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pufferVor" className="block font-semibold">Puffer davor</label>
            <input id="pufferVor" name="pufferVor" type="number" min={0} max={240} step={5} defaultValue={service?.bufferBeforeMinutes ?? 0} className="field-control" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pufferNach" className="block font-semibold">Puffer danach</label>
            <input id="pufferNach" name="pufferNach" type="number" min={0} max={240} step={5} defaultValue={service?.bufferAfterMinutes ?? 0} className="field-control" />
          </div>
        </div>
        <p className="text-sm text-graphite -mt-2">Pufferzeiten (z. B. Aufräumen, Einwirkzeit) blockieren die Person, werden Kund:innen aber nicht angezeigt.</p>
        <div className="grid gap-4 sm:grid-cols-2 items-end">
          <div className="space-y-1.5">
            <label htmlFor="preis" className="block font-semibold">Preis in Euro <span className="font-normal text-graphite">(optional)</span></label>
            <input id="preis" name="preis" inputMode="decimal" defaultValue={centsToInput(service?.priceCents)} className="field-control" placeholder="z. B. 32,00" />
            <FieldError name="preis" />
          </div>
          <Checkbox id="preisAb" name="preisAb" defaultChecked={service?.priceFrom} label="Ab-Preis" hint="Wird als „ab“ angezeigt." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="kapazitaet" className="block font-semibold">Max. Teilnehmende <span className="font-normal text-graphite">(nur Kurse)</span></label>
            <input id="kapazitaet" name="kapazitaet" type="number" min={1} max={500} defaultValue={service?.groupCapacity ?? ''} className="field-control" />
            <FieldError name="kapazitaet" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reihenfolge" className="block font-semibold">Reihenfolge</label>
            <input id="reihenfolge" name="reihenfolge" type="number" min={0} max={999} defaultValue={service?.sortOrder ?? 0} className="field-control" />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="font-semibold mb-1">Wer bietet diese Leistung an?</legend>
          {staff.length === 0 ? <p className="text-sm text-graphite">Lege zuerst unter Team eine Person an.</p> : staff.map((s) => (
            <Checkbox key={s.id} id={`p-${s.id}`} name="personen" value={s.id} defaultChecked={offered.has(s.id)} label={s.name} />
          ))}
        </fieldset>
        {resources.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="font-semibold mb-1">Benötigte Ressourcen</legend>
            {resources.map((r) => (
              <Checkbox key={r.id} id={`r-${r.id}`} name="ressourcen" value={r.id} defaultChecked={needs.has(r.id)} label={r.name} hint={`${r.capacity}× vorhanden`} />
            ))}
          </fieldset>
        )}
        <Checkbox id="aktiv" name="aktiv" defaultChecked={service?.active ?? true} label="Online buchbar" />
        <SubmitButton>Speichern</SubmitButton>
      </ActionForm>
      {service && (
        <Sheet>
          <SheetHeader title="Leistung entfernen" description="Gibt es bereits Termine dafür, wird die Leistung nur deaktiviert." />
          <div className="px-5 pb-5">
            <ActionForm action={deleteServiceAction.bind(null, service.id)}>
              <SubmitButton variant="danger" pendingLabel="Wird entfernt …">Leistung entfernen</SubmitButton>
            </ActionForm>
          </div>
        </Sheet>
      )}
    </div>
  )
}
