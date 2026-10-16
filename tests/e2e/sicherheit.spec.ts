import { expect, test } from '@playwright/test'
import { DEMO_PASSWORD, PORT, local, staffLogin, tenant, tenantHeaders } from './helpers'

test.describe('Sicherheit', () => {
  test('setzt CSP mit Nonce und Sicherheits-Header', async ({ request }) => {
    const response = await request.get(local('/'), { headers: tenantHeaders('mayer') })
    const csp = response.headers()['content-security-policy']
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('eine Sitzung gilt nur für den eigenen Betrieb', async ({ page }) => {
    await staffLogin(page, 'mayer', 'anna@friseur-mayer.example')
    await page.goto(tenant('huber', '/admin'))
    await expect(page).toHaveURL(/huber\.localhost.*\/admin\/login/)
  })

  test('falsches Passwort verrät nicht, ob ein Konto existiert', async ({ page }) => {
    await page.goto(tenant('mayer', '/admin/login'))
    await page.getByLabel('E-Mail-Adresse').fill('gibtsnicht@example.com')
    await page.getByLabel('Passwort').fill('falsch-falsch-falsch')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    const alert = page.locator('form [role="alert"]')
    const unknown = await alert.textContent()
    await page.getByLabel('E-Mail-Adresse').fill('anna@friseur-mayer.example')
    await page.getByLabel('Passwort').fill('falsch-falsch-falsch')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(alert).toHaveText(unknown ?? '')
  })

  test('Mitarbeiter:innen sehen keine Kundenliste', async ({ page }) => {
    await staffLogin(page, 'mayer', 'ben@friseur-mayer.example')
    await page.goto(tenant('mayer', '/admin/kunden'))
    await expect(page).toHaveURL(/hinweis=kein-zugriff/)
  })

  test('Plattform-Admins müssen die Zwei-Faktor-Anmeldung einrichten', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/login`)
    await page.getByLabel('E-Mail-Adresse').fill('admin@example.at')
    await page.getByLabel('Passwort').fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/konto\?2fa=pflicht/)
    await page.goto(`http://localhost:${PORT}/betriebe`)
    await expect(page).toHaveURL(/\/konto\?2fa=pflicht/)
  })

  test('unbekannte Domains werden abgewiesen', async ({ request }) => {
    const response = await request.get(`http://127.0.0.1:${PORT}/`, { headers: { host: 'fremd.example.com' } })
    expect(response.status()).toBe(404)
  })
})
