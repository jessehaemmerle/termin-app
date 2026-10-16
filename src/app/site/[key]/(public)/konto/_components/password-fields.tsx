import { FieldError } from '@/components/action-form'

export function CustomerPasswordFields() {
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block font-semibold">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="field-control" aria-describedby="password-hint" />
        <p id="password-hint" className="text-sm text-graphite">Mindestens 10 Zeichen.</p>
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

export function AccountCard({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <div className="text-graphite mt-2">{description}</div>}
      <div className="mt-6 bg-surface border border-rule rounded-[var(--radius-sheet)] p-5 sm:p-6">{children}</div>
    </div>
  )
}
