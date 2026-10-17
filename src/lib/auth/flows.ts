import { db } from '../db'
import { decryptOrNull } from '../crypto'
import { LOCK_MINUTES, MAX_FAILED_LOGINS, verifyDummy, verifyPassword } from './password'
import { matchRecoveryCode, verifyTotp } from './totp'
import { rateLimit } from '../rate-limit'
import { clientIp } from '../request'

// Gemeinsame Login-Logik für Teamkonten (User) und Kundenkonten (Customer).

type Account = {
  id: string
  passwordHash: string | null
  failedLogins: number
  lockedUntil: Date | null
  totpEnabledAt: Date | null
  totpSecretEnc: string | null
  totpRecoveryHashes: string[]
}

export type AccountKind = 'user' | 'customer'

async function update(kind: AccountKind, id: string, data: Record<string, unknown>) {
  if (kind === 'user') await db.user.update({ where: { id }, data })
  else await db.customer.update({ where: { id }, data })
}

export type LoginCheck = 'ok' | 'invalid' | 'locked' | 'rate_limited'

/** Prüft Passwort mit Rate-Limit, Kontosperre und Schutz gegen Konto-Ermittlung über Laufzeit. */
export async function checkLogin(kind: AccountKind, scope: string, email: string, account: Account | null, password: string): Promise<LoginCheck> {
  const ip = await clientIp()
  const byIp = rateLimit(`login:${kind}:${ip}`, 30, 15 * 60 * 1000)
  const byAccount = rateLimit(`login:${kind}:${scope}:${email}`, 10, 15 * 60 * 1000)
  if (!byIp.ok || !byAccount.ok) return 'rate_limited'

  if (!account?.passwordHash) {
    await verifyDummy(password)
    return 'invalid'
  }
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    await verifyDummy(password)
    return 'locked'
  }
  const ok = await verifyPassword(account.passwordHash, password)
  if (!ok) {
    const failed = account.failedLogins + 1
    await update(kind, account.id, failed >= MAX_FAILED_LOGINS
      ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
      : { failedLogins: failed })
    return 'invalid'
  }
  if (account.failedLogins > 0 || account.lockedUntil) await update(kind, account.id, { failedLogins: 0, lockedUntil: null })
  return 'ok'
}

/** Prüft einen TOTP-Code oder verbraucht einen Wiederherstellungscode. */
export async function checkSecondFactor(kind: AccountKind, account: Account, code: string): Promise<boolean> {
  const limit = rateLimit(`2fa:${kind}:${account.id}`, 10, 15 * 60 * 1000)
  if (!limit.ok) return false
  const secret = decryptOrNull(account.totpSecretEnc)
  if (secret && verifyTotp(secret, code)) return true
  const recovery = matchRecoveryCode(account.totpRecoveryHashes, code)
  if (recovery) {
    await update(kind, account.id, { totpRecoveryHashes: account.totpRecoveryHashes.filter((h) => h !== recovery) })
    return true
  }
  return false
}

export function loginErrorMessage(result: LoginCheck, formal: boolean): string {
  switch (result) {
    case 'rate_limited':
      return formal
        ? 'Zu viele Anmeldeversuche. Bitte warten Sie kurz und versuchen Sie es erneut.'
        : 'Zu viele Anmeldeversuche. Bitte warte kurz und versuche es erneut.'
    default:
      // Gleiche Meldung bei gesperrtem Konto, sonst ließe sich so feststellen, ob ein Konto existiert
      return `E-Mail-Adresse oder Passwort ist nicht korrekt. Nach mehreren Fehlversuchen ist die Anmeldung für ${LOCK_MINUTES} Minuten gesperrt.`
  }
}
