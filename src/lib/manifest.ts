import type { Tenant } from '@/generated/prisma/client'
import { brandPalette } from './color'

/** Web-App-Manifest je Betrieb: eine App für Kunden, eine für das Team. */
export function buildManifest(tenant: Tenant, variant: 'public' | 'admin') {
  const palette = brandPalette(tenant.primaryColor)
  const v = tenant.updatedAt.getTime()
  const isAdmin = variant === 'admin'
  const name = isAdmin ? `${tenant.name} – Verwaltung` : tenant.name
  return {
    id: isAdmin ? '/admin' : '/',
    name,
    short_name: (isAdmin ? `${tenant.name} Team` : tenant.name).slice(0, 24),
    description: isAdmin ? `Termine und Kalender von ${tenant.name}` : `Termine bei ${tenant.name} online buchen`,
    lang: 'de-AT',
    dir: 'ltr',
    start_url: isAdmin ? '/admin' : '/',
    scope: isAdmin ? '/admin' : '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f5f8',
    theme_color: palette.brand,
    categories: ['business', 'productivity'],
    icons: [
      { src: `/assets/icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/assets/icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/assets/icon-maskable.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: isAdmin
      ? [
          { name: 'Heute', url: '/admin' },
          { name: 'Kalender', url: '/admin/kalender' },
          { name: 'Neuer Termin', url: '/admin/termine/neu' },
        ]
      : [{ name: 'Termin buchen', url: '/buchen' }],
  }
}

export function manifestResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  })
}
