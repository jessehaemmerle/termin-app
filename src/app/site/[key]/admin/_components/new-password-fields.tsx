import { FieldError } from '@/components/action-form'

export function NewPasswordFields({ formal = false }: { formal?: boolean }) {
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block font-semibold">Neues Passwort</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="field-control" aria-describedby="password-hint" />
        <p id="password-hint" className="text-sm text-graphite">
          Mindestens 10 Zeichen. {formal ? 'Am besten ein Satz, den nur Sie kennen.' : 'Am besten ein Satz, den nur du kennst.'}
        </p>
        <FieldError name="password" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block font-semibold">Passwort wiederholen</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field-control" />
        <FieldError name="confirm" />
      </div>
    </>
  )
}
