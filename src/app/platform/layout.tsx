import Link from 'next/link'
import type { Metadata } from 'next'
import { env } from '@/lib/env'
import { platformPath } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const name = env().PLATFORM_NAME
  return { title: { default: name, template: `%s – ${name}` }, description: `${name}: Online-Terminbuchung für kleine Betriebe` }
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const name = env().PLATFORM_NAME
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-surface border-b border-rule safe-top">
        <div className="mx-auto max-w-5xl px-4 min-h-16 flex items-center justify-between">
          <Link href={platformPath('/')} className="font-display text-lg font-semibold no-underline text-ink">{name}</Link>
          <Link href={platformPath('/betriebe')} className="text-sm font-semibold">Plattform-Verwaltung</Link>
        </div>
      </header>
      <main id="inhalt" className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 md:py-12">{children}</main>
      <footer className="border-t border-rule bg-surface safe-bottom">
        <nav aria-label="Rechtliches" className="mx-auto max-w-5xl px-4 py-6 text-sm">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link href={platformPath('/impressum')}>Impressum</Link></li>
            <li><Link href={platformPath('/datenschutz')}>Datenschutz</Link></li>
            <li><Link href={platformPath('/nutzungsbedingungen')}>Nutzungsbedingungen</Link></li>
            <li><Link href={platformPath('/unterauftragsverarbeiter')}>Unterauftragsverarbeiter</Link></li>
          </ul>
        </nav>
      </footer>
    </div>
  )
}
