// Protokollierung ohne personenbezogene Daten (Logs enthalten keine Adressen oder Telefonnummern).

/** Entfernt E-Mail-Adressen und Telefonnummern, z. B. aus Fehlermeldungen von Anbietern. */
export function scrubPersonalData(text: string): string {
  return text
    .replace(/[^\s<>"'@]+@[^\s<>"'@]+\.[a-z]{2,}/gi, '[E-Mail]')
    .replace(/\+?\d[\d\s/-]{7,}\d/g, '[Telefon]')
}

/** Fehler protokollieren: Meldung und Code, bereinigt; Stacktrace nur außerhalb der Produktion. */
export function logError(context: string, error: unknown) {
  const err = error as { message?: string; code?: string; stack?: string }
  const message = scrubPersonalData(err?.message ?? String(error))
  const code = err?.code ? ` [${err.code}]` : ''
  console.error(`${context}: ${message}${code}`)
  if (process.env.NODE_ENV !== 'production' && err?.stack) console.error(scrubPersonalData(err.stack))
}
