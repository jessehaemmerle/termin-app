import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { currentTenant } from '@/lib/tenant'
import { brandCss, brandPalette } from '@/lib/color'
import { currentNonce } from '@/lib/request'
import { ServiceWorkerRegistration } from '@/components/pwa'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant()
  if (!tenant) return {}
  const version = tenant.updatedAt.getTime()
  return {
    title: { default: `${tenant.name} – Termin buchen`, template: `%s – ${tenant.name}` },
    description: tenant.tagline ?? `Online-Terminbuchung bei ${tenant.name}`,
    applicationName: tenant.name,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: `/assets/icon-192.png?v=${version}`, sizes: '192x192', type: 'image/png' }],
      apple: [{ url: `/assets/apple-touch-icon.png?v=${version}`, sizes: '180x180' }],
    },
    appleWebApp: { capable: true, title: tenant.name, statusBarStyle: 'default' },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const tenant = await currentTenant()
  return { themeColor: tenant ? brandPalette(tenant.primaryColor).brand : '#1f5f8b' }
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const tenant = await currentTenant()
  if (!tenant) notFound()
  const nonce = await currentNonce()
  return (
    <>
      <style nonce={nonce}>{brandCss(tenant.primaryColor)}</style>
      {children}
      <ServiceWorkerRegistration />
    </>
  )
}
