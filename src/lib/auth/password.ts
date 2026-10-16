import { hash, verify } from '@node-rs/argon2'
import { z } from 'zod'

// Argon2id mit den Mindestparametern laut OWASP Password Storage Cheat Sheet.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const

export const passwordSchema = z
  .string()
  .min(10, 'Das Passwort muss mindestens 10 Zeichen lang sein.')
  .max(200, 'Das Passwort darf höchstens 200 Zeichen lang sein.')

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | undefined

/** Gleicht die Laufzeit an, wenn kein Konto existiert (gegen Konto-Ermittlung über Timing). */
export async function verifyDummy(password: string): Promise<void> {
  dummyHash ??= hash('dummy-password-for-timing', OPTIONS)
  await verifyPassword(await dummyHash, password)
}

export const MAX_FAILED_LOGINS = 5
export const LOCK_MINUTES = 15
