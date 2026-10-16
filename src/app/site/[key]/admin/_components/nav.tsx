'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons'

export type NavItem = { href: string; label: string; icon: IconName; primary?: boolean }

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Verwaltung" className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 min-h-11 rounded-[var(--radius-control)] no-underline font-semibold ${
              active ? 'bg-brand-soft text-brand-text' : 'text-ink hover:bg-paper'
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Untere Tab-Leiste auf Mobilgeräten (Daumenzone). */
export function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const primary = items.filter((i) => i.primary)
  const moreActive = !primary.some((i) => isActive(pathname, i.href))
  return (
    <nav aria-label="Verwaltung" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-rule safe-bottom">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
        {primary.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs font-semibold no-underline ${active ? 'text-brand-text' : 'text-graphite'}`}
              >
                <Icon name={item.icon} className="size-6" />
                {item.label}
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            href="/admin/mehr"
            aria-current={moreActive && pathname === '/admin/mehr' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs font-semibold no-underline ${moreActive ? 'text-brand-text' : 'text-graphite'}`}
          >
            <Icon name="more" className="size-6" />
            Mehr
          </Link>
        </li>
      </ul>
    </nav>
  )
}
