import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PORT } from './helpers'

const platform = (path = '/') => `http://localhost:${PORT}${path}`

test.describe('Plattform-Website', () => {
  test('ist barrierefrei und ohne Drittanbieter', async ({ page }) => {
    const external: string[] = []
    page.on('request', (r) => {
      if (!r.url().startsWith(platform(''))) external.push(r.url())
    })
    await page.goto(platform('/'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ihre eigene Buchungsseite')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
    expect(external).toEqual([])
  })

  test('nimmt eine Zugangsanfrage entgegen', async ({ page }) => {
    await page.goto(platform('/#anfrage'))
    await page.getByLabel('Name des Betriebs').fill('Testsalon E2E')
    await page.getByLabel('Ihr Name').fill('Erika Test')
    await page.getByLabel('E-Mail-Adresse').fill('erika@example.com')
    await page.getByLabel(/Teamgröße/).selectOption('2-5')
    await page.waitForTimeout(3100) // Bot-Schutz: Mindestbearbeitungszeit
    await page.getByRole('button', { name: 'Anfrage senden' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Danke für Ihre Anfrage' })).toBeVisible()
  })

  test('führt Teams zur Anmeldung ihres Betriebs', async ({ page }) => {
    await page.goto(platform('/anmelden'))
    await page.getByLabel('Adresse Ihres Betriebs').fill('gibt-es-nicht')
    await page.getByRole('button', { name: 'Weiter zur Anmeldung' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'keinen aktiven Betrieb' })).toBeVisible()
    await page.getByLabel('Adresse Ihres Betriebs').fill('mayer')
    await page.getByRole('button', { name: 'Weiter zur Anmeldung' }).click()
    await expect(page).toHaveURL(new RegExp(`mayer\\.localhost:${PORT}/admin/login`))
  })
})
