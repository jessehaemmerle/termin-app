// Zuordnung eingehender Hostnamen zu Plattform oder Betrieb.
// Ohne Datenbankzugriff, damit der Proxy schnell bleibt; benutzerdefinierte
// Domains werden erst beim Rendern gegen die Datenbank geprüft.

export type HostContext = { kind: 'platform' } | { kind: 'tenant'; key: string }

export type HostConfig = {
  platformHost: string
  singleTenantSlug?: string
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'admin',
  'api',
  'mail',
  'smtp',
  'plattform',
  'platform',
  'static',
  'assets',
  'status',
  'hilfe',
  'support',
])

export function isValidSlug(slug: string) {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug)
}

export function isValidHostname(hostname: string) {
  return HOSTNAME_RE.test(hostname)
}

export function normalizeHostname(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null
  let host = hostHeader.trim().toLowerCase()
  if (host.startsWith('[')) return null // IPv6-Literale werden nicht bedient
  host = host.replace(/:\d+$/, '').replace(/\.$/, '')
  return host || null
}

export function tenantKeyForSlug(slug: string) {
  return `s-${slug}`
}

export function tenantKeyForDomain(domain: string) {
  return `d-${domain}`
}

export function parseTenantKey(key: string): { kind: 'slug' | 'domain'; value: string } | null {
  const decoded = decodeURIComponent(key)
  if (decoded.startsWith('s-')) {
    const value = decoded.slice(2)
    return SLUG_RE.test(value) ? { kind: 'slug', value } : null
  }
  if (decoded.startsWith('d-')) {
    const value = decoded.slice(2)
    return isValidHostname(value) ? { kind: 'domain', value } : null
  }
  return null
}

export function resolveHost(hostHeader: string | null | undefined, config: HostConfig): HostContext | null {
  if (config.singleTenantSlug) {
    return { kind: 'tenant', key: tenantKeyForSlug(config.singleTenantSlug) }
  }
  const hostname = normalizeHostname(hostHeader)
  if (!hostname) return null
  const platformHost = config.platformHost.toLowerCase()

  if (hostname === platformHost || hostname === `www.${platformHost}`) {
    return { kind: 'platform' }
  }
  if (hostname.endsWith(`.${platformHost}`)) {
    const sub = hostname.slice(0, -(platformHost.length + 1))
    if (!sub.includes('.') && isValidSlug(sub)) {
      return { kind: 'tenant', key: tenantKeyForSlug(sub) }
    }
    return null
  }
  if (isValidHostname(hostname)) {
    return { kind: 'tenant', key: tenantKeyForDomain(hostname) }
  }
  return null
}
