import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-figures text-4xl font-semibold text-graphite">404</p>
        <h1 className="font-display text-2xl font-semibold mt-2">Diese Seite gibt es nicht</h1>
        <p className="text-graphite mt-2">Vielleicht hat sich die Adresse geändert oder der Link ist abgelaufen.</p>
        <p className="mt-6">
          <Link href="/">Zur Startseite</Link>
        </p>
      </div>
    </main>
  )
}
