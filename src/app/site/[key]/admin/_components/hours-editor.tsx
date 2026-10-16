import { WEEKDAYS } from '@/lib/format'
import { minutesToTime } from '@/lib/time'
import { FieldError } from '@/components/action-form'

/** Wochenzeiten mit bis zu zwei Zeitfenstern je Tag (z. B. Mittagspause). */
export function HoursEditor({ rows }: { rows: { weekday: number; startMinute: number; endMinute: number }[] }) {
  return (
    <div className="space-y-3">
      {WEEKDAYS.map((label, i) => {
        const day = i + 1
        const ranges = rows.filter((r) => r.weekday === day).sort((a, b) => a.startMinute - b.startMinute)
        return (
          <fieldset key={day} className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr] sm:items-center border-t border-rule pt-3 first:border-t-0 first:pt-0">
            <legend className="font-semibold float-left sm:float-none">{label}</legend>
            {[1, 2].map((slot) => {
              const r = ranges[slot - 1]
              return (
                <div key={slot} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`d${day}_s${slot}`}>{label} Zeitfenster {slot} Beginn</label>
                  <input id={`d${day}_s${slot}`} name={`d${day}_s${slot}`} type="time" step={300} defaultValue={r ? minutesToTime(r.startMinute) : ''} className="field-control min-h-11 py-1.5" />
                  <span aria-hidden="true">–</span>
                  <label className="sr-only" htmlFor={`d${day}_e${slot}`}>{label} Zeitfenster {slot} Ende</label>
                  <input id={`d${day}_e${slot}`} name={`d${day}_e${slot}`} type="time" step={300} defaultValue={r ? minutesToTime(r.endMinute) : ''} className="field-control min-h-11 py-1.5" />
                </div>
              )
            })}
            <div className="sm:col-span-3"><FieldError name={`d${day}`} /></div>
          </fieldset>
        )
      })}
      <p className="text-sm text-graphite">Leere Felder bedeuten: geschlossen bzw. nicht verfügbar. Das zweite Zeitfenster ist optional (z. B. nach der Mittagspause).</p>
    </div>
  )
}
