import Link from 'next/link'
import type { ReactNode } from 'react'

/** Schlichter Rahmen für Anmelde- und Passwortseiten. */
export function AuthShell({
  brand,
  logoSrc,
  title,
  description,
  children,
  footer,
}: {
  brand: string
  logoSrc?: string | null
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- Logo kommt aus der mandantenbezogenen Route
            <img src={logoSrc} alt="" className="h-10 w-auto max-w-28 object-contain" />
          )}
          <span className="font-display text-lg font-semibold">{brand}</span>
        </div>
        <div className="bg-surface border border-rule rounded-[var(--radius-sheet)] p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <div className="text-graphite mt-2">{description}</div>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-sm text-graphite space-y-2">{footer}</div>}
      </div>
    </main>
  )
}

export function LegalFooterLinks({ impressum, datenschutz }: { impressum: string; datenschutz: string }) {
  return (
    <p className="flex gap-4">
      <Link href={impressum}>Impressum</Link>
      <Link href={datenschutz}>Datenschutz</Link>
    </p>
  )
}
