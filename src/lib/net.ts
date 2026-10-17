import { BlockList, isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

// Schutz vor SSRF: Von Betrieben eingetragene Server (eigenes SMTP) dürfen nicht
// auf interne Netze zeigen (Datenbank, Docker-Netz, Metadaten-Dienste der Cloud).

const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96], // NAT64
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16], // 6to4
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6')
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return false
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

export class PrivateAddressError extends Error {}

/**
 * Löst einen Hostnamen auf und gibt eine öffentliche Adresse zurück. Wird auf diese
 * Adresse verbunden (nicht erneut auf den Namen), kann DNS-Rebinding die Prüfung
 * nicht umgehen.
 */
export async function resolvePublicAddress(hostname: string): Promise<string> {
  const results = await lookup(hostname, { all: true, verbatim: true })
  if (results.length === 0) throw new PrivateAddressError(`${hostname} ist nicht auflösbar.`)
  if (results.some((r) => !isPublicAddress(r.address))) {
    throw new PrivateAddressError(`${hostname} zeigt auf eine interne Adresse.`)
  }
  return results[0].address
}
