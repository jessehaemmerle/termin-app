import { describe, expect, it } from 'vitest'
import { isPublicAddress, resolvePublicAddress } from '@/lib/net'

describe('SSRF-Schutz für eigene Server der Betriebe', () => {
  it('erkennt öffentliche Adressen', () => {
    for (const a of ['8.8.8.8', '193.170.0.1', '2a00:1450:4001::1', '2001:4860:4860::8888']) expect(isPublicAddress(a), a).toBe(true)
  })

  it('sperrt interne, reservierte und umgeleitete Adressen', () => {
    for (const a of [
      '127.0.0.1', '10.1.2.3', '172.18.0.2', '192.168.1.1', '169.254.169.254', '100.64.1.1', '0.0.0.0', '255.255.255.255',
      '::1', '::', '::ffff:10.0.0.1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1', '64:ff9b::a00:1', '2002:a00:1::1',
      'localhost', 'db',
    ]) expect(isPublicAddress(a), a).toBe(false)
  })

  it('lehnt Namen ab, die auf interne Adressen zeigen', async () => {
    await expect(resolvePublicAddress('localhost')).rejects.toThrow(/interne Adresse/)
  })
})
