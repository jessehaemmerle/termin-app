import Link from 'next/link'

export default function AccountDeletedPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl font-semibold">Ihr Konto wurde gelöscht</h1>
      <p className="text-graphite mt-2">Ihre persönlichen Daten wurden entfernt und zukünftige Termine abgesagt.</p>
      <p className="mt-6"><Link href="/">Zur Startseite</Link></p>
    </div>
  )
}
