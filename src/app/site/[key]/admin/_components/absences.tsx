import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { formatDateTime } from '@/lib/format'
import { today } from '@/lib/time'
import { addAbsenceAction, deleteAbsenceAction } from '../_actions/catalog'
import type { TimeOff } from '@/generated/prisma/client'

export function AbsenceList({ items, timeZone, emptyText }: { items: TimeOff[]; timeZone: string; emptyText: string }) {
  if (!items.length) return <p className="px-5 pb-4 text-graphite">{emptyText}</p>
  return (
    <ul className="ruled border-t border-rule">
      {items.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span>
            <span className="block font-semibold">{t.label || 'Ohne Bezeichnung'}</span>
            <span className="block text-sm text-graphite">{formatDateTime(t.startsAt, timeZone)} bis {formatDateTime(t.endsAt, timeZone)}</span>
          </span>
          <ActionForm action={deleteAbsenceAction.bind(null, t.id)} className="contents">
            <SubmitButton variant="quiet" className="min-h-10" pendingLabel="…">Entfernen</SubmitButton>
          </ActionForm>
        </li>
      ))}
    </ul>
  )
}

export function AbsenceForm({ staffId, timeZone, labelHint }: { staffId?: string; timeZone: string; labelHint: string }) {
  const day = today(timeZone)
  return (
    <ActionForm action={addAbsenceAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      {staffId && <input type="hidden" name="person" value={staffId} />}
      <div className="space-y-1.5">
        <label htmlFor={`von-${staffId ?? 'b'}`} className="block font-semibold">Von</label>
        <div className="flex gap-2">
          <input id={`von-${staffId ?? 'b'}`} name="von" type="date" required defaultValue={day} className="field-control" />
          <label className="sr-only" htmlFor={`vonZeit-${staffId ?? 'b'}`}>Uhrzeit von (optional)</label>
          <input id={`vonZeit-${staffId ?? 'b'}`} name="vonZeit" type="time" step={300} className="field-control max-w-32" />
        </div>
        <FieldError name="von" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`bis-${staffId ?? 'b'}`} className="block font-semibold">Bis</label>
        <div className="flex gap-2">
          <input id={`bis-${staffId ?? 'b'}`} name="bis" type="date" required defaultValue={day} className="field-control" />
          <label className="sr-only" htmlFor={`bisZeit-${staffId ?? 'b'}`}>Uhrzeit bis (optional)</label>
          <input id={`bisZeit-${staffId ?? 'b'}`} name="bisZeit" type="time" step={300} className="field-control max-w-32" />
        </div>
        <FieldError name="bis" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`bez-${staffId ?? 'b'}`} className="block font-semibold">Bezeichnung <span className="font-normal text-graphite">(optional)</span></label>
        <input id={`bez-${staffId ?? 'b'}`} name="bezeichnung" maxLength={80} className="field-control" aria-describedby={`bez-${staffId ?? 'b'}-hint`} />
        <p id={`bez-${staffId ?? 'b'}-hint`} className="text-sm text-graphite">{labelHint}</p>
      </div>
      <p className="text-sm text-graphite sm:col-span-2">Ohne Uhrzeiten gilt der ganze Tag.</p>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">Eintragen</SubmitButton></div>
    </ActionForm>
  )
}
