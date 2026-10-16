import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from './db'
import { env, platformBase } from './env'
import { parseTenantKey, resolveHost, type HostContext } from './hosts'
import { DPA_VERSION } from './legal/consent'
import type { Tenant } from '@/generated/prisma/client'

export const currentHostContext = cache(async (): Promise<HostContext | null> => {
  const h = await headers()
  return resolveHost(h.get('host'), {
    platformHost: platformBase().hostname,
    singleTenantSlug: env().SINGLE_TENANT_SLUG,
  })
})

export const getTenantByKey = cache(async (key: string): Promise<Tenant | null> => {
  const parsed = parseTenantKey(key)
  if (!parsed) return null
  if (parsed.kind === 'slug') return db.tenant.findUnique({ where: { slug: parsed.value } })
  return db.tenant.findFirst({ where: { customDomain: parsed.value, customDomainVerifiedAt: { not: null } } })
})

/** Betrieb der aktuellen Anfrage – immer aus dem Host-Header abgeleitet, nie aus Formulardaten. */
export const currentTenant = cache(async (): Promise<Tenant | null> => {
  const context = await currentHostContext()
  if (context?.kind !== 'tenant') return null
  return getTenantByKey(context.key)
})

export async function requireTenant(): Promise<Tenant> {
  const tenant = await currentTenant()
  if (!tenant) notFound()
  return tenant
}

export async function requireActiveTenant(): Promise<Tenant> {
  const tenant = await requireTenant()
  if (tenant.status !== 'ACTIVE') notFound()
  return tenant
}

export { tenantBaseUrl, tenantUrl, platformPath, platformUrl } from './urls'

/** Pflichtangaben, ohne die die Buchungsseite nicht live gehen darf (§ 5 ECG). */
export function missingImprintFields(t: Tenant): string[] {
  const missing: string[] = []
  if (!t.legalName) missing.push('Name bzw. Firmenwortlaut')
  if (!t.street || !t.postalCode || !t.city) missing.push('Geschäftsanschrift')
  if (!t.email) missing.push('E-Mail-Adresse')
  if (!t.businessPurpose) missing.push('Unternehmensgegenstand')
  return missing
}

export type ReadinessCheck = { key: string; label: string; done: boolean; href: string }

export async function readiness(tenant: Tenant): Promise<ReadinessCheck[]> {
  const [services, staff] = await Promise.all([
    db.service.count({ where: { tenantId: tenant.id, active: true, staff: { some: {} } } }),
    db.staff.count({ where: { tenantId: tenant.id, active: true } }),
  ])
  return [
    { key: 'dpa', label: 'Auftragsverarbeitungsvertrag abschließen', done: !!tenant.dpaAcceptedAt && tenant.dpaVersion === DPA_VERSION, href: '/admin/einstellungen/vertrag' },
    { key: 'imprint', label: 'Impressum vervollständigen', done: missingImprintFields(tenant).length === 0, href: '/admin/einstellungen/rechtliches' },
    { key: 'staff', label: 'Mindestens eine buchbare Person anlegen', done: staff > 0, href: '/admin/team' },
    { key: 'services', label: 'Leistung anlegen und einer Person zuordnen', done: services > 0, href: '/admin/leistungen' },
  ]
}

export async function isBookable(tenant: Tenant): Promise<boolean> {
  if (tenant.status !== 'ACTIVE') return false
  const checks = await readiness(tenant)
  return checks.every((c) => c.done)
}
