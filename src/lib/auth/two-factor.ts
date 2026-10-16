import { db } from '../db'
import { decryptOrNull, encrypt } from '../crypto'
import { generateRecoveryCodes, generateTotpSecret, totpQrDataUrl, totpUri, verifyTotp } from './totp'

// Einrichtung der Zwei-Faktor-Anmeldung (TOTP) für Team-, Kunden- und Plattformkonten.

type Kind = 'user' | 'customer'

async function save(kind: Kind, id: string, data: Record<string, unknown>) {
  if (kind === 'user') await db.user.update({ where: { id }, data })
  else await db.customer.update({ where: { id }, data })
}

/** Erzeugt ein neues (noch inaktives) Geheimnis. */
export async function beginTotp(kind: Kind, id: string) {
  await save(kind, id, { totpSecretEnc: encrypt(generateTotpSecret()), totpEnabledAt: null })
}

/** QR-Code für ein begonnenes, noch nicht bestätigtes Geheimnis. */
export async function pendingTotpQr(secretEnc: string | null, issuer: string, label: string) {
  const secret = decryptOrNull(secretEnc)
  if (!secret) return null
  const uri = totpUri(secret, issuer, label)
  return { qr: await totpQrDataUrl(uri), secret }
}

/** Bestätigt den ersten Code und liefert einmalig die Wiederherstellungscodes. */
export async function confirmTotp(kind: Kind, id: string, secretEnc: string | null, code: string): Promise<string[] | null> {
  const secret = decryptOrNull(secretEnc)
  if (!secret || !verifyTotp(secret, code)) return null
  const { codes, hashes } = generateRecoveryCodes()
  await save(kind, id, { totpEnabledAt: new Date(), totpRecoveryHashes: hashes })
  return codes
}

export async function disableTotp(kind: Kind, id: string) {
  await save(kind, id, { totpSecretEnc: null, totpEnabledAt: null, totpRecoveryHashes: [] })
}
