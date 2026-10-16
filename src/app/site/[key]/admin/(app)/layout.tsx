import Link from 'next/link'
import { requireStaff, ROLE_LABELS } from '@/lib/auth/guards'
import { hasLogo } from '@/lib/branding'
import { Icon } from '@/components/icons'
import { InstallPrompt } from '@/components/pwa'
import { SideNav, TabBar } from '../_components/nav'
import { navItems } from '../_components/nav-items'
import { staffLogoutAction } from '../_actions/auth'

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { tenant, user, role } = await requireStaff({ allowMissing2fa: true })
  const items = navItems(role)
  const logo = await hasLogo(tenant.id)
  const logoSrc = logo ? `/assets/logo.png?v=${tenant.updatedAt.getTime()}` : null

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-4 focus:py-2 focus:bg-surface focus:rounded">
        Zum Inhalt springen
      </a>
      <aside className="hidden md:flex flex-col gap-6 border-r border-rule bg-surface px-3 py-5 sticky top-0 h-dvh overflow-y-auto">
        <Link href="/admin" className="flex items-center gap-3 px-3 no-underline text-ink">
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- mandantenbezogenes Logo
            <img src={logoSrc} alt="" className="h-8 w-auto max-w-20 object-contain" />
          )}
          <span className="font-display font-semibold leading-tight">{tenant.name}</span>
        </Link>
        <Link href="/admin/termine/neu" className="mx-3 inline-flex items-center justify-center gap-2 min-h-11 rounded-[var(--radius-control)] bg-brand text-on-brand font-semibold no-underline">
          <Icon name="plus" /> Neuer Termin
        </Link>
        <SideNav items={items} />
        <div className="mt-auto px-3 space-y-3 text-sm">
          <InstallPrompt appName={`${tenant.name} Team`} compact />
          <a href="/" target="_blank" className="flex items-center gap-2">
            <Icon name="external" className="size-4" /> Buchungsseite ansehen
          </a>
          <div className="border-t border-rule pt-3">
            <p className="font-semibold">{user.name}</p>
            <p className="text-graphite">{ROLE_LABELS[role]}</p>
            <form action={staffLogoutAction} className="mt-2">
              <button type="submit" className="flex items-center gap-2 text-brand-text font-semibold min-h-10">
                <Icon name="logout" className="size-4" /> Abmelden
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-rule safe-top">
          <div className="flex items-center justify-between gap-3 px-4 min-h-14">
            <Link href="/admin" className="font-display font-semibold no-underline text-ink truncate">
              {tenant.name}
            </Link>
            <Link href="/admin/termine/neu" className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-[var(--radius-control)] bg-brand text-on-brand font-semibold no-underline text-sm">
              <Icon name="plus" className="size-4" /> Termin
            </Link>
          </div>
        </header>
        <main id="inhalt" className="px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-12 max-w-5xl">
          {children}
        </main>
      </div>
      <TabBar items={items} />
    </div>
  )
}
