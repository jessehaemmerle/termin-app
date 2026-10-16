import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox, PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { saveResourceAction } from '../../_actions/catalog'

export const metadata: Metadata = { title: 'Ressourcen' }

export default async function ResourcesPage() {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const resources = await db.resource.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { name: 'asc' } })
  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle title="Ressourcen" description="Räume, Plätze oder Geräte, die für eine Leistung frei sein müssen – z. B. ein Färbeplatz oder zwei Hebebühnen." />
      {resources.map((r) => (
        <Sheet key={r.id}>
          <div className="p-5">
            <ActionForm action={saveResourceAction.bind(null, r.id)} className="grid gap-4 sm:grid-cols-[1fr_8rem] items-end">
              <div className="space-y-1.5">
                <label htmlFor={`name-${r.id}`} className="block font-semibold">Name</label>
                <input id={`name-${r.id}`} name="name" defaultValue={r.name} required className="field-control" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`kap-${r.id}`} className="block font-semibold">Anzahl</label>
                <input id={`kap-${r.id}`} name="kapazitaet" type="number" min={1} max={100} defaultValue={r.capacity} className="field-control" />
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                <Checkbox id={`aktiv-${r.id}`} name="aktiv" defaultChecked={r.active} label="Aktiv" />
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Sheet>
      ))}
      <Sheet>
        <SheetHeader title="Neue Ressource" />
        <div className="px-5 pb-5">
          <ActionForm action={saveResourceAction.bind(null, null)} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_8rem] items-end">
            <div className="space-y-1.5">
              <label htmlFor="name-neu" className="block font-semibold">Name</label>
              <input id="name-neu" name="name" required className="field-control" placeholder="z. B. Behandlungsraum" />
              <FieldError name="name" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="kap-neu" className="block font-semibold">Anzahl</label>
              <input id="kap-neu" name="kapazitaet" type="number" min={1} max={100} defaultValue={1} className="field-control" />
            </div>
            <div className="sm:col-span-2"><SubmitButton>Anlegen</SubmitButton></div>
          </ActionForm>
        </div>
      </Sheet>
    </div>
  )
}
