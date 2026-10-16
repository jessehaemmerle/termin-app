import type { Metadata } from 'next'
import { currentTenant } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant()
  return {
    title: { default: 'Verwaltung', template: `%s – ${tenant?.name ?? 'Verwaltung'}` },
    manifest: '/admin/manifest.webmanifest',
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: tenant ? `${tenant.name} Team` : 'Team', statusBarStyle: 'default' },
  }
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
