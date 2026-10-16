import { can } from '@/lib/auth/guards'
import type { UserRole } from '@/generated/prisma/client'
import type { NavItem } from './nav'

export function navItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [
    { href: '/admin', label: 'Heute', icon: 'today', primary: true },
    { href: '/admin/kalender', label: 'Kalender', icon: 'calendar', primary: true },
    { href: '/admin/termine', label: 'Termine', icon: 'list', primary: true },
  ]
  if (can(role, 'customers.manage')) items.push({ href: '/admin/kunden', label: 'Kunden', icon: 'people', primary: true })
  if (can(role, 'services.manage')) {
    items.push({ href: '/admin/leistungen', label: 'Leistungen', icon: 'scissors' })
    items.push({ href: '/admin/kurse', label: 'Kurse', icon: 'group' })
  }
  if (can(role, 'hours.manage')) {
    items.push({ href: '/admin/team', label: 'Team', icon: 'team' })
    items.push({ href: '/admin/ressourcen', label: 'Ressourcen', icon: 'box' })
    items.push({ href: '/admin/oeffnungszeiten', label: 'Öffnungszeiten', icon: 'clock' })
  }
  if (can(role, 'settings.manage')) items.push({ href: '/admin/einstellungen', label: 'Einstellungen', icon: 'settings' })
  if (can(role, 'audit.view')) items.push({ href: '/admin/protokoll', label: 'Protokoll', icon: 'shield' })
  items.push({ href: '/admin/profil', label: 'Mein Profil', icon: 'user' })
  return items
}
