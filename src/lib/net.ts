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
  if (family === 6) {
    const embedded = embeddedIpv4(address)
    if (embedded) return isPublicAddress(embedded)
  }
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

/** IPv4 in IPv4-kompatiblen (::a.b.c.d), gemappten (::ffff:…) und SIIT-Adressen (::ffff:0:…). */
function embeddedIpv4(address: string): string | null {
  const groups = expandIpv6(address)
  if (!groups || groups.slice(0, 4).some((g) => g !== 0)) return null
  const [, , , , g4, g5, g6, g7] = groups
  const v4Tail = (g4 === 0 && (g5 === 0 || g5 === 0xffff)) || (g4 === 0xffff && g5 === 0)
  if (!v4Tail || (g4 === 0 && g5 === 0 && g6 === 0)) return null // ::, ::1 usw. regelt die Sperrliste
  return [g6 >> 8, g6 & 255, g7 >> 8, g7 & 255].join('.')
}

function expandIpv6(address: string): number[] | null {
  let text = address.toLowerCase().split('%')[0]
  const v4 = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number)
    text = text.slice(0, v4.index) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [head, tail] = text.split('::')
  const parse = (part?: string) => (part ? part.split(':').map((g) => parseInt(g, 16)) : [])
  const left = parse(head)
  const right = parse(tail)
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill(0), ...right]
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null
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
