import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

// Basiskomponenten. Zielgrößen mind. 44 px (WCAG 2.5.5), sichtbarer Fokus,
// Farben ausschließlich über Design-Tokens.

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-[var(--radius-control)] font-semibold text-base no-underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:brightness-95 active:brightness-90',
  secondary: 'bg-surface text-ink border-[1.5px] border-rule-strong hover:border-ink',
  quiet: 'bg-transparent text-brand-text hover:bg-brand-soft',
  danger: 'bg-surface text-danger border-[1.5px] border-danger hover:bg-danger-soft',
}

export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `${base} ${variants[variant]} ${extra}`
}

export function Button({ variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  optional,
}: {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  htmlFor: string
  optional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-semibold">
        {label}
        {optional && <span className="font-normal text-graphite"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-sm text-graphite">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input(props: ComponentProps<'input'>) {
  return <input {...props} className={`field-control ${props.className ?? ''}`} />
}

export function Textarea(props: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`field-control ${props.className ?? ''}`} />
}

export function Select(props: ComponentProps<'select'>) {
  return <select {...props} className={`field-control ${props.className ?? ''}`} />
}

export function Checkbox({ label, hint, id, ...props }: ComponentProps<'input'> & { label: ReactNode; hint?: ReactNode; id: string }) {
  return (
    <div className="flex gap-3 items-start">
      <input
        type="checkbox"
        id={id}
        {...props}
        className="mt-1 size-5 shrink-0 accent-[var(--brand-text)]"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <div>
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-graphite mt-0.5">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

type NoticeTone = 'info' | 'ok' | 'warn' | 'danger'

const noticeTones: Record<NoticeTone, string> = {
  info: 'bg-brand-soft border-brand-line',
  ok: 'bg-ok-soft border-ok/40',
  warn: 'bg-warn-soft border-warn/40',
  danger: 'bg-danger-soft border-danger/40',
}

export function Notice({ tone = 'info', title, children, role }: { tone?: NoticeTone; title?: string; children?: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div className={`border rounded-[var(--radius-control)] px-4 py-3 ${noticeTones[tone]}`} role={role}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1 text-sm' : 'text-sm'}>{children}</div>}
    </div>
  )
}

export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-surface border border-rule rounded-[var(--radius-sheet)] ${className}`}>{children}</section>
}

export function SheetHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-graphite mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-graphite mt-2 max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const statusStyles: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Anfrage offen', className: 'bg-warn-soft text-warn' },
  CONFIRMED: { label: 'Bestätigt', className: 'bg-ok-soft text-ok' },
  DECLINED: { label: 'Abgelehnt', className: 'bg-danger-soft text-danger' },
  CANCELLED_BY_CUSTOMER: { label: 'Vom Kunden abgesagt', className: 'bg-paper text-graphite' },
  CANCELLED_BY_BUSINESS: { label: 'Vom Betrieb abgesagt', className: 'bg-paper text-graphite' },
  NO_SHOW: { label: 'Nicht erschienen', className: 'bg-danger-soft text-danger' },
  COMPLETED: { label: 'Erledigt', className: 'bg-paper text-graphite' },
  EXPIRED: { label: 'Verfallen', className: 'bg-paper text-graphite' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] ?? { label: status, className: 'bg-paper text-graphite' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${s.className}`}>{s.label}</span>
}

export function statusLabel(status: string) {
  return statusStyles[status]?.label ?? status
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="text-graphite mt-2 max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function DefinitionList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="ruled">
      {items.map((item) => (
        <div key={item.term} className="grid grid-cols-[minmax(7rem,35%)_1fr] gap-3 px-5 py-3">
          <dt className="text-graphite">{item.term}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
