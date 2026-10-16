import type { Metadata, Viewport } from 'next'
import { connection } from 'next/server'
import '@fontsource-variable/atkinson-hyperlegible-next'
import '@fontsource-variable/bricolage-grotesque'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Termin buchen', template: '%s' },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3f5f8',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Alle Seiten dynamisch rendern: nötig für den CSP-Nonce pro Anfrage und
  // damit Konfiguration (Betreiberdaten) nicht zur Build-Zeit eingefroren wird.
  await connection()
  return (
    <html lang="de-AT">
      <body>{children}</body>
    </html>
  )
}
