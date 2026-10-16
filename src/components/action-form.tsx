'use client'

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import type { ActionState } from '@/lib/actions'
import { buttonClass } from './ui'

const FormStateContext = createContext<ActionState>(undefined)

export function ActionForm({
  action,
  children,
  className = 'space-y-5',
  successRedirectHint,
  resetOnSuccess = false,
  id,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
  className?: string
  successRedirectHint?: string
  resetOnSuccess?: boolean
  id?: string
}) {
  const [state, formAction] = useActionState(action, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state?.error) summaryRef.current?.focus()
    if (state?.ok && resetOnSuccess) formRef.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <FormStateContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={className} id={id} noValidate={false}>
        <div aria-live="polite" className="empty:hidden" ref={summaryRef} tabIndex={-1}>
          {state?.error && (
            <div role="alert" className="border border-danger/40 bg-danger-soft rounded-[var(--radius-control)] px-4 py-3">
              <p className="font-semibold text-danger">{state.error}</p>
              {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
                <ul className="mt-1 text-sm list-disc pl-5">
                  {Object.entries(state.fieldErrors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {state?.ok && state.message && (
            <div role="status" className="border border-ok/40 bg-ok-soft rounded-[var(--radius-control)] px-4 py-3">
              <p className="font-semibold">{state.message}</p>
              {successRedirectHint && <p className="text-sm mt-1">{successRedirectHint}</p>}
            </div>
          )}
        </div>
        {children}
      </form>
    </FormStateContext.Provider>
  )
}

export function useFormState() {
  return useContext(FormStateContext)
}

export function FieldError({ name }: { name: string }) {
  const state = useFormState()
  const message = state?.fieldErrors?.[name]
  if (!message) return null
  return (
    <p id={`${name}-error`} className="text-sm font-semibold text-danger">
      {message}
    </p>
  )
}

/** Zeigt Werte aus `state.data` (z. B. einen Einladungslink) nach erfolgreicher Aktion. */
export function ResultValue({ field, label, copyable = true }: { field: string; label: string; copyable?: boolean }) {
  const state = useFormState()
  const value = state?.data?.[field]
  if (!value) return null
  const values = Array.isArray(value) ? value : [value]
  return (
    <div className="border border-brand-line bg-brand-soft rounded-[var(--radius-control)] px-4 py-3 space-y-2">
      <p className="font-semibold">{label}</p>
      {values.map((v) => (
        <p key={v} className="font-figures text-sm break-all select-all bg-surface border border-rule rounded px-2 py-1">
          {v}
        </p>
      ))}
      {copyable && values.length === 1 && <CopyButton value={values[0]} />}
    </div>
  )
}

export function CopyButton({ value, label = 'Kopieren' }: { value: string; label?: string }) {
  return (
    <button
      type="button"
      className={buttonClass('secondary', 'min-h-10 px-3 text-sm')}
      onClick={(e) => {
        void navigator.clipboard?.writeText(value)
        e.currentTarget.textContent = 'Kopiert'
      }}
    >
      {label}
    </button>
  )
}

export function SubmitButton({
  children,
  pendingLabel = 'Wird gespeichert …',
  variant = 'primary',
  className = '',
  name,
  value,
}: {
  children: ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={buttonClass(variant, className)} aria-disabled={pending} disabled={pending} name={name} value={value}>
      {pending ? pendingLabel : children}
    </button>
  )
}
