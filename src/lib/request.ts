import { headers } from 'next/headers'
import { env } from './env'

/**
 * IP-Adresse des Clients – ausschließlich für Rate-Limits im Arbeitsspeicher,
 * wird nie gespeichert. Hinter Caddy steht die Client-IP als letzter
 * Eintrag in X-Forwarded-For.
 */
export async function clientIp(): Promise<string> {
  const h = await headers()
  if (env().TRUST_PROXY) {
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) {
      const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean)
      if (parts.length) return parts[parts.length - 1]
    }
  }
  return h.get('x-real-ip') ?? 'unknown'
}

export async function currentNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined
}

export async function currentPathname(): Promise<string> {
  return (await headers()).get('x-pathname') ?? '/'
}
