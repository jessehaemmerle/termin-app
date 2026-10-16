import { expect, type Page } from '@playwright/test'

export const PORT = Number(process.env.E2E_PORT ?? 3200)
export const tenant = (slug: string, path = '/') => `http://${slug}.localhost:${PORT}${path}`
export const DEMO_PASSWORD = 'demo-passwort-123'

export async function staffLogin(page: Page, slug: string, email: string) {
  await page.goto(tenant(slug, '/admin/login'))
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(/\/admin$|\/admin\?/)
}

/** Wählt im Buchungsablauf den ersten freien Termin und füllt die Angaben aus. */
export async function bookFirstSlot(page: Page, slug: string, service: RegExp, contact: { name: string; email: string; phone?: string }) {
  await page.goto(tenant(slug, '/buchen'))
  await page.getByRole('link', { name: service }).click()
  await expect(page.getByText(/Schritt [23] von 4/)).toBeVisible()
  if (await page.getByText('Schritt 2 von 4').isVisible()) {
    await page.getByRole('link', { name: /Keine Präferenz/ }).click()
    await expect(page.getByText('Schritt 3 von 4')).toBeVisible()
  }
  // Der erste Tag mit freien Zeiten ist vorausgewählt
  await page.getByRole('link', { name: /Uhr wählen/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Ihre Angaben' })).toBeVisible()
  await page.getByLabel('Name').fill(contact.name)
  await page.getByLabel('E-Mail-Adresse').fill(contact.email)
  if (contact.phone) await page.getByLabel(/Mobilnummer/).fill(contact.phone)
  // Bot-Schutz: Formular muss mindestens 2 Sekunden offen sein
  await page.waitForTimeout(2100)
}

/** Request an einen Betrieb ohne DNS-Auflösung von *.localhost (Node kennt diese nicht). */
export function tenantHeaders(slug: string) {
  return { host: `${slug}.localhost:${PORT}` }
}
export const local = (path = '/') => `http://127.0.0.1:${PORT}${path}`
