import Link from 'next/link'

export default function WaitlistRemovedPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold">Sie wurden ausgetragen</h1>
      <p className="text-graphite mt-2">Ihr Wartelisten-Eintrag ist gelöscht. Sie erhalten dazu keine Nachrichten mehr.</p>
      <p className="mt-6">
        <Link href="/buchen">Termin buchen</Link>
      </p>
    </div>
  )
}
