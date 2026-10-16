import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/guards'
import { ActionForm, SubmitButton } from '@/components/action-form'
import { Checkbox, Sheet } from '@/components/ui'
import { TextField } from '../../../_components/fields'
import { saveBookingRulesAction } from '../../../_actions/settings'
import { SettingsHeader } from '../_header'

export const metadata: Metadata = { title: 'Buchungsregeln' }

export default async function BookingRulesSettings() {
  const { tenant } = await requireStaff({ permission: 'settings.manage' })
  return (
    <div className="max-w-2xl">
      <SettingsHeader title="Buchungsregeln" />
      <Sheet className="p-5">
        <ActionForm action={saveBookingRulesAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="raster" className="block font-semibold">Zeitraster</label>
              <select id="raster" name="raster" defaultValue={tenant.slotIntervalMinutes} className="field-control">
                {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>alle {m} Minuten</option>)}
              </select>
            </div>
            <TextField name="vorlauf" label="Mindestvorlauf (Minuten)" type="number" min={0} max={10080} defaultValue={tenant.minLeadMinutes} hint="So kurzfristig darf online gebucht werden." />
            <TextField name="horizont" label="Buchbar bis (Tage im Voraus)" type="number" min={1} max={365} defaultValue={tenant.maxAdvanceDays} />
            <TextField name="stornofrist" label="Online-Absage bis (Stunden vorher)" type="number" min={0} max={336} defaultValue={tenant.cancellationDeadlineHours} hint="Innerhalb von 30 Minuten nach der Buchung ist eine Absage immer möglich." />
            <TextField name="erinnerung" label="Erinnerung (Stunden vorher)" type="number" min={0} max={72} defaultValue={tenant.reminderHoursBefore} hint="0 = keine Erinnerung." />
          </div>
          <fieldset className="space-y-3">
            <legend className="font-semibold mb-1">Optionen</legend>
            <Checkbox id="freigabe" name="freigabe" defaultChecked={tenant.requireApproval} label="Online-Buchungen erst nach meiner Bestätigung verbindlich" />
            <Checkbox id="telefonPflicht" name="telefonPflicht" defaultChecked={tenant.requirePhone} label="Telefonnummer ist Pflicht" hint="Nur aktivieren, wenn ihr Kund:innen wirklich anrufen müsst (Datenminimierung)." />
            <Checkbox id="kundenkonten" name="kundenkonten" defaultChecked={tenant.allowCustomerAccounts} label="Kundenkonten erlauben" />
            <Checkbox id="warteliste" name="warteliste" defaultChecked={tenant.waitlistEnabled} label="Warteliste anbieten" />
            <Checkbox id="teamMail" name="teamMail" defaultChecked={tenant.notifyStaffByEmail} label="Team per E-Mail über neue Buchungen und Absagen informieren" />
            <Checkbox id="teamZweiFaktor" name="teamZweiFaktor" defaultChecked={tenant.require2faForStaff} label="Zwei-Faktor-Anmeldung für alle Teamzugänge verpflichtend" />
          </fieldset>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Sheet>
    </div>
  )
}
