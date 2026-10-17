import type { z } from 'zod'

export type ActionState =
  | {
      ok?: boolean
      message?: string
      error?: string
      fieldErrors?: Record<string, string>
      /** Beliebige Zusatzdaten für die Oberfläche (z. B. Einladungslink, Wiederherstellungscodes) */
      data?: Record<string, string | string[]>
    }
  | undefined

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!result[key]) result[key] = issue.message
  }
  return result
}

export function invalid(error: z.ZodError, message = 'Bitte prüfen Sie die markierten Angaben.'): ActionState {
  return { error: message, fieldErrors: zodFieldErrors(error) }
}

/** FormData -> einfaches Objekt; leere Strings werden zu undefined. */
export function formObject(formData: FormData): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION')) continue
    if (typeof value === 'string') result[key] = value.trim() === '' ? undefined : value.trim()
  }
  return result
}

export function checkbox(formData: FormData, name: string): boolean {
  const v = formData.get(name)
  return v === 'on' || v === 'true' || v === '1'
}

/**
 * Mit `action.bind(null, …)` gebundene Argumente kommen ungeprüft vom Client und können auch
 * Objekte sein (z. B. Prisma-Filter wie `{ in: [...] }`). Deshalb vor jeder Verwendung prüfen.
 */
export function boundId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9]{1,40}$/i.test(value)) throw new Error('Ungültige Kennung.')
  return value
}

export function boundOneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) throw new Error('Ungültiger Wert.')
  return value as T
}
