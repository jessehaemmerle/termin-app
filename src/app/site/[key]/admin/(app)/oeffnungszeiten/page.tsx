import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { PageTitle, Sheet, SheetHeader } from '@/components/ui'
import { HoursEditor } from '../../_components/hours-editor'
import { AbsenceForm, AbsenceList } from '../../_components/absences'
import { saveTenantHoursAction } from '../../_actions/catalog'

export const metadata: Metadata = { title: 'Öffnungszeiten' }

export default async function OpeningHoursPage() {
  const ctx = await requireStaff({ permission: 'hours.manage' })
  const [rows, closures] = await Promise.all([
    db.workingHours.findMany({ where: { tenantId: ctx.tenant.id, staffId: null } }),
    db.timeOff.findMany({ where: { tenantId: ctx.tenant.id, staffId: null, endsAt: { gt: new Date() } }, orderBy: { startsAt: 'asc' } }),
  ])
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle title="Öffnungszeiten" description="Gelten für alle Personen, die keine eigenen Arbeitszeiten haben, und werden auf der Buchungsseite angezeigt." />
      <Sheet>
        <div className="p-5">
          <ActionForm action={saveTenantHoursAction}>
            <HoursEditor rows={rows} />
            <SubmitButton>Öffnungszeiten speichern</SubmitButton>
          </ActionForm>
        </div>
      </Sheet>
      <Sheet>
        <SheetHeader title="Schließtage und Betriebsurlaub" description="An diesen Tagen ist für niemanden eine Online-Buchung möglich." />
        <AbsenceList items={closures} timeZone={ctx.tenant.timezone} emptyText="Keine Schließtage eingetragen." />
        <div className="p-5 border-t border-rule">
          <AbsenceForm timeZone={ctx.tenant.timezone} labelHint="z. B. Betriebsurlaub, Feiertag – wird nur intern angezeigt." />
        </div>
      </Sheet>
    </div>
  )
}
