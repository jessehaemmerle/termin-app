import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { env } from '@/lib/env'
import { platformPath } from '@/lib/tenant'
import { buttonClass } from '@/components/ui'
import { brandCss } from '@/lib/color'
import { currentNonce } from '@/lib/request'

/** Farben aus dem Plattform-Logo: Navy als Markenfarbe, Türkis als Akzent */
const PLATFORM_BRAND = '#0c3563'

export async function generateMetadata(): Promise<Metadata> {
  const name = env().PLATFORM_NAME
  return {
    title: { default: name, template: `%s – ${name}` },
    description: `${name}: Online-Terminbuchung für kleine Betriebe`,
    manifest: '/brand/site.webmanifest',
    icons: {
      icon: [
        { url: '/brand/favicon.ico', sizes: 'any' },
        { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: { url: '/brand/apple-touch-icon.png', sizes: '180x180' },
    },
    openGraph: { images: [{ url: '/brand/android-chrome-512x512.png', width: 512, height: 512 }] },
  }
}

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: PLATFORM_BRAND }
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const e = env()
  const nonce = await currentNonce()
  const home = platformPath('/')
  return (
    <div className="min-h-dvh flex flex-col overflow-x-clip">
      <style nonce={nonce}>{brandCss(PLATFORM_BRAND)}</style>
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2">Zum Inhalt springen</a>
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-rule safe-top">
        <div className="mx-auto max-w-6xl px-4 min-h-16 flex items-center justify-between gap-4">
          <Link href={home} className="inline-flex min-w-0 items-center gap-2 font-display text-xl font-semibold no-underline text-ink whitespace-nowrap">
            {/* eslint-disable-next-line @next/next/no-img-element -- statisches Logo, keine Optimierung nötig */}
            <img src="/brand/android-chrome-192x192.png" alt="" width={40} height={40} className="size-10 -my-1" />
            {e.PLATFORM_NAME}
          </Link>
          <nav aria-label="Hauptnavigation" className="flex min-w-0 items-center gap-1 sm:gap-5">
            <ul className="hidden md:flex items-center gap-5 text-sm">
              <li><Link href={`${home}#funktionen`} className="no-underline text-ink hover:text-brand-text">Funktionen</Link></li>
              <li><Link href={`${home}#datenschutz`} className="no-underline text-ink hover:text-brand-text">Datenschutz</Link></li>
              <li><Link href={`${home}#preis`} className="no-underline text-ink hover:text-brand-text">Preis</Link></li>
              <li><Link href={`${home}#fragen`} className="no-underline text-ink hover:text-brand-text">Fragen</Link></li>
            </ul>
            <Link href={platformPath('/anmelden')} className="text-sm font-semibold no-underline text-ink px-2 min-h-11 inline-flex items-center">Anmelden</Link>
            <span className="hidden sm:block">
              <Link href={`${home}#anfrage`} className={buttonClass('primary', 'min-h-11 px-4 text-sm whitespace-nowrap')}>Zugang anfragen</Link>
            </span>
          </nav>
        </div>
      </header>
      <main id="inhalt" className="flex-1 mx-auto w-full max-w-6xl px-4 py-10 md:py-16">{children}</main>
      <footer className="bg-ink text-white/80 safe-bottom [&_a]:text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 sm:grid-cols-[1.5fr_1fr_1fr] text-sm">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 font-display text-lg font-semibold text-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- statisches Logo */}
              <img src="/brand/android-chrome-192x192.png" alt="" width={36} height={36} className="size-9 rounded-lg bg-white" />
              {e.PLATFORM_NAME}
            </p>
            <p className="max-w-xs">Online-Terminbuchung für kleine Betriebe. Gehostet in der EU, ohne Tracking.</p>
            {e.OPERATOR_EMAIL && <p><a href={`mailto:${e.OPERATOR_EMAIL}`}>{e.OPERATOR_EMAIL}</a></p>}
          </div>
          <nav aria-label="Produkt">
            <p className="font-semibold text-white mb-2">Produkt</p>
            <ul className="space-y-1.5">
              <li><Link href={`${home}#funktionen`}>Funktionen</Link></li>
              <li><Link href={`${home}#datenschutz`}>Datenschutz</Link></li>
              <li><Link href={`${home}#preis`}>Preis</Link></li>
              <li><Link href={`${home}#fragen`}>Häufige Fragen</Link></li>
              <li><Link href={`${home}#anfrage`}>Zugang anfragen</Link></li>
              <li><Link href={platformPath('/anmelden')}>Anmelden für Betriebe</Link></li>
            </ul>
          </nav>
          <nav aria-label="Rechtliches">
            <p className="font-semibold text-white mb-2">Rechtliches</p>
            <ul className="space-y-1.5">
              <li><Link href={platformPath('/impressum')}>Impressum</Link></li>
              <li><Link href={platformPath('/datenschutz')}>Datenschutz</Link></li>
              <li><Link href={platformPath('/nutzungsbedingungen')}>Nutzungsbedingungen</Link></li>
              <li><Link href={platformPath('/unterauftragsverarbeiter')}>Unterauftragsverarbeiter</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/15">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs">
            <Link href={platformPath('/betriebe')}>Plattform-Verwaltung</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
