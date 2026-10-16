import Link from 'next/link'
import type { Metadata } from 'next'
import { requireStaff, ROLE_LABELS } from '@/lib/auth/guards'
import { platformUrl } from '@/lib/tenant'
import { Icon } from '@/components/icons'
import { InstallPrompt } from '@/components/pwa'
import { navItems } from '../../_components/nav-items'
import { staffLogoutAction } from '../../_actions/auth'

export const metadata: Metadata = { title: 'Mehr' }

export default async function MorePage() {
  const { tenant, user, role } = await requireStaff({ allowMissing2fa: true })
  const items = navItems(role).filter((i) => !i.primary)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{user.name}</h1>
        <p className="text-graphite">{ROLE_LABELS[role]} bei {tenant.name}</p>
      </div>
      <ul className="ruled bg-surface border border-rule rounded-[var(--radius-sheet)]">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 px-5 min-h-14 no-underline text-ink font-semibold">
              <Icon name={item.icon} /> {item.label}
            </Link>
          </li>
        ))}
        <li>
          <a href="/" target="_blank" className="flex items-center gap-3 px-5 min-h-14 no-underline text-ink font-semibold">
            <Icon name="external" /> Buchungsseite ansehen
          </a>
        </li>
      </ul>
      <InstallPrompt appName={`${tenant.name} Team`} />
      <form action={staffLogoutAction}>
        <button type="submit" className="flex items-center gap-2 text-brand-text font-semibold min-h-11">
          <Icon name="logout" /> Abmelden
        </button>
      </form>
      <p className="text-sm text-graphite flex gap-4">
        <a href={platformUrl('/impressum')}>Impressum</a>
        <a href={platformUrl('/datenschutz')}>Datenschutz</a>
      </p>
    </div>
  )
}
