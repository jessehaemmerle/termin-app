import type { ReactNode } from 'react'
import { requireTenant, platformUrl } from '@/lib/tenant'
import { hasLogo } from '@/lib/branding'
import { AuthShell, LegalFooterLinks } from '@/components/auth-shell'

export async function AdminAuthPage({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const tenant = await requireTenant()
  const logo = await hasLogo(tenant.id)
  return (
    <AuthShell
      brand={`${tenant.name} – Verwaltung`}
      logoSrc={logo ? `/assets/logo.png?v=${tenant.updatedAt.getTime()}` : null}
      title={title}
      description={description}
      footer={<LegalFooterLinks impressum={platformUrl('/impressum')} datenschutz={platformUrl('/datenschutz')} />}
    >
      {children}
    </AuthShell>
  )
}
