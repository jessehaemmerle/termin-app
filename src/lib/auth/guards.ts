import { redirect } from 'next/navigation'
import { db } from '../db'
import { platformPath, requireTenant } from '../tenant'
import { readCustomerSession, readPlatformSession, readStaffSession } from './session'
import type { Customer, Staff, Tenant, User, UserRole } from '@/generated/prisma/client'

// Rollen und Berechtigungen im Betrieb (Need-to-know-Prinzip):
// - OWNER: alles, inkl. Vertrag (AVV), Rechtliches, Integrationen, Team
// - MANAGER: Tagesgeschäft für alle Mitarbeiter, Kundendaten, Leistungen
// - STAFF: nur eigene Termine und die zugehörigen Kundendaten
const PERMISSIONS = {
  'bookings.all': ['OWNER', 'MANAGER'],
  'customers.manage': ['OWNER', 'MANAGER'],
  'customers.privacy': ['OWNER', 'MANAGER'],
  'services.manage': ['OWNER', 'MANAGER'],
  'hours.manage': ['OWNER', 'MANAGER'],
  'team.manage': ['OWNER'],
  'settings.manage': ['OWNER'],
  'audit.view': ['OWNER'],
} as const satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'Plattform-Admin',
  OWNER: 'Inhaber:in',
  MANAGER: 'Leitung',
  STAFF: 'Mitarbeiter:in',
}

export type StaffContext = {
  tenant: Tenant
  user: User
  staff: Staff | null
  role: UserRole
}

type StaffGuardOptions = {
  permission?: Permission
  /** Seiten, die ohne eingerichtete 2FA erreichbar bleiben müssen (Profil). */
  allowMissing2fa?: boolean
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const tenant = await requireTenant()
  const session = await readStaffSession()
  if (!session || session.tenantId !== tenant.id || session.user.tenantId !== tenant.id) return null
  if (session.user.totpEnabledAt && !session.mfaVerified) return null
  const staff = await db.staff.findUnique({ where: { userId: session.user.id } })
  return { tenant, user: session.user, staff, role: session.user.role }
}

export async function requireStaff(options: StaffGuardOptions = {}): Promise<StaffContext> {
  const tenant = await requireTenant()
  const session = await readStaffSession()
  if (!session || session.tenantId !== tenant.id || session.user.tenantId !== tenant.id) redirect('/admin/login')
  if (session.user.totpEnabledAt && !session.mfaVerified) redirect('/admin/login/2fa')
  if (tenant.status !== 'ACTIVE') redirect('/admin/gesperrt')
  if (tenant.require2faForStaff && !session.user.totpEnabledAt && !options.allowMissing2fa) {
    redirect('/admin/profil?2fa=pflicht')
  }
  if (options.permission && !can(session.user.role, options.permission)) redirect('/admin?hinweis=kein-zugriff')
  const staff = await db.staff.findUnique({ where: { userId: session.user.id } })
  return { tenant, user: session.user, staff, role: session.user.role }
}

export type CustomerContext = { tenant: Tenant; customer: Customer }

export async function getCustomerContext(): Promise<CustomerContext | null> {
  const tenant = await requireTenant()
  const session = await readCustomerSession()
  if (!session || session.tenantId !== tenant.id || session.customer.tenantId !== tenant.id) return null
  if (session.customer.totpEnabledAt && !session.mfaVerified) return null
  return { tenant, customer: session.customer }
}

export async function requireCustomer(): Promise<CustomerContext> {
  const tenant = await requireTenant()
  const session = await readCustomerSession()
  if (!session || session.tenantId !== tenant.id || session.customer.tenantId !== tenant.id) redirect('/konto/anmelden')
  if (session.customer.totpEnabledAt && !session.mfaVerified) redirect('/konto/anmelden/2fa')
  return { tenant, customer: session.customer }
}

/** Plattform-Admins müssen 2FA verwenden (Zugriff auf alle Mandanten-Metadaten). */
export async function requirePlatformAdmin(options: { allowMissing2fa?: boolean } = {}): Promise<User> {
  const session = await readPlatformSession()
  if (!session || session.tenantId !== null || session.user.role !== 'PLATFORM_ADMIN' || session.user.tenantId !== null) {
    redirect(platformPath('/login'))
  }
  if (session.user.totpEnabledAt && !session.mfaVerified) redirect(platformPath('/login/2fa'))
  if (!session.user.totpEnabledAt && !options.allowMissing2fa) redirect(platformPath('/konto?2fa=pflicht'))
  return session.user
}
