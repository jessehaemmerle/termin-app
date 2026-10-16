import { db } from '@/lib/db'
import { platformBase } from '@/lib/env'
import { isValidSlug, normalizeHostname } from '@/lib/hosts'

// Freigabe für Caddys On-Demand-TLS: Zertifikate werden nur für die Plattform-
// Domain, existierende Betriebs-Subdomains und bestätigte eigene Domains
// ausgestellt. Verhindert, dass beliebige Domains Zertifikate auslösen.
export async function GET(request: Request) {
  const domain = normalizeHostname(new URL(request.url).searchParams.get('domain'))
  if (!domain) return new Response(null, { status: 400 })
  const platformHost = platformBase().hostname
  if (domain === platformHost || domain === `www.${platformHost}`) return new Response(null, { status: 200 })
  if (domain.endsWith(`.${platformHost}`)) {
    const slug = domain.slice(0, -(platformHost.length + 1))
    if (isValidSlug(slug) && (await db.tenant.count({ where: { slug } }))) return new Response(null, { status: 200 })
    return new Response(null, { status: 404 })
  }
  const tenant = await db.tenant.count({ where: { customDomain: domain, customDomainVerifiedAt: { not: null } } })
  return new Response(null, { status: tenant ? 200 : 404 })
}
