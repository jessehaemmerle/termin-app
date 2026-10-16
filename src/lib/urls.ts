import { env, platformBase } from './env'
import type { Tenant } from '@/generated/prisma/client'

// URL-Helfer ohne Next.js-Abhängigkeiten (auch im Worker nutzbar).

type TenantUrlFields = Pick<Tenant, 'slug' | 'customDomain' | 'customDomainVerifiedAt'>

export function tenantBaseUrl(tenant: TenantUrlFields): string {
  const base = platformBase()
  if (env().SINGLE_TENANT_SLUG) return base.origin
  if (tenant.customDomain && tenant.customDomainVerifiedAt) return `https://${tenant.customDomain}`
  return `${base.protocol}//${tenant.slug}.${base.hostname}${base.port ? `:${base.port}` : ''}`
}

export function tenantUrl(tenant: TenantUrlFields, path = '/'): string {
  return `${tenantBaseUrl(tenant)}${path}`
}

/** Pfad innerhalb des Plattformbereichs (bei Einzelinstanz unter /plattform). */
export function platformPath(path = '/'): string {
  if (!env().SINGLE_TENANT_SLUG) return path
  return path === '/' ? '/plattform' : `/plattform${path}`
}

export function platformUrl(path = '/'): string {
  return `${platformBase().origin}${platformPath(path)}`
}
