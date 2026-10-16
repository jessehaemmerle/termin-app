import type { ReactNode } from 'react'
import { FieldError } from '@/components/action-form'

type Props = {
  name: string
  label: string
  defaultValue?: string | number | null
  type?: string
  hint?: ReactNode
  optional?: boolean
  required?: boolean
  placeholder?: string
  multiline?: boolean
  rows?: number
  maxLength?: number
  min?: number
  max?: number
  step?: number
  autoComplete?: string
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'email' | 'text'
}

/** Beschriftetes Eingabefeld mit Hinweis und Fehlermeldung (für Formulare im Verwaltungsbereich). */
export function TextField(p: Props) {
  const describedBy = [p.hint ? `${p.name}-hint` : null, `${p.name}-error`].filter(Boolean).join(' ')
  const common = {
    id: p.name,
    name: p.name,
    defaultValue: p.defaultValue ?? '',
    required: p.required,
    placeholder: p.placeholder,
    maxLength: p.maxLength,
    autoComplete: p.autoComplete,
    'aria-describedby': describedBy,
    className: 'field-control',
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={p.name} className="block font-semibold">
        {p.label}
        {p.optional && <span className="font-normal text-graphite"> (optional)</span>}
      </label>
      {p.multiline ? (
        <textarea {...common} rows={p.rows ?? 3} />
      ) : (
        <input {...common} type={p.type ?? 'text'} min={p.min} max={p.max} step={p.step} inputMode={p.inputMode} />
      )}
      {p.hint && (
        <p id={`${p.name}-hint`} className="text-sm text-graphite">
          {p.hint}
        </p>
      )}
      <FieldError name={p.name} />
    </div>
  )
}
