import { expect, test } from '@playwright/test'
import { tenant } from './helpers'

test.describe('Datenschutz und Rechtliches', () => {
  test('öffentliche Seiten setzen keine Cookies und laden nichts von Dritten', async ({ page, context }) => {
    const foreign: string[] = []
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname
      if (!host.endsWith('localhost')) foreign.push(r.url())
    })
    for (const path of ['/', '/buchen', '/kurse', '/datenschutz', '/impressum']) {
      await page.goto(tenant('mayer', path))
      await page.waitForLoadState('networkidle')
    }
    expect(foreign).toEqual([])
    expect(await context.cookies()).toEqual([])
  })

  test('Impressum, Datenschutz, Buchungsbedingungen und Barrierefreiheit sind von jeder Seite erreichbar', async ({ page }) => {
    await page.goto(tenant('mayer', '/buchen'))
    const footer = page.getByRole('navigation', { name: 'Rechtliches' })
    await footer.getByRole('link', { name: 'Impressum' }).click()
    await expect(page.getByRole('heading', { name: 'Impressum', level: 1 })).toBeVisible()
    await expect(page.getByText('Anna Mayer').first()).toBeVisible()
    await expect(page.getByText('§ 25 MedienG').first()).toBeVisible()

    await page.getByRole('navigation', { name: 'Rechtliches' }).getByRole('link', { name: 'Datenschutz' }).click()
    await expect(page.getByRole('heading', { name: 'Datenschutzerklärung' })).toBeVisible()
    await expect(page.getByText('Österreichische Datenschutzbehörde')).toBeVisible()
    await expect(page.getByText('§ 165 Abs. 3 Telekommunikationsgesetz 2021')).toBeVisible()

    await page.getByRole('navigation', { name: 'Rechtliches' }).getByRole('link', { name: 'Buchungsbedingungen' }).click()
    await expect(page.getByRole('heading', { name: /Buchungs- und Stornobedingungen/ })).toBeVisible()

    await page.getByRole('navigation', { name: 'Rechtliches' }).getByRole('link', { name: 'Barrierefreiheit' }).click()
    await expect(page.getByRole('heading', { name: 'Erklärung zur Barrierefreiheit' })).toBeVisible()
  })

  test('WhatsApp-Einwilligung ist freiwillig und nicht vorangekreuzt (falls aktiv)', async ({ page }) => {
    await page.goto(tenant('mayer', '/buchen'))
    await page.getByRole('link', { name: /Herrenhaarschnitt/ }).click()
    await page.getByRole('link', { name: /Keine Präferenz/ }).click()
    await page.getByRole('link', { name: /Uhr wählen/ }).first().click()
    const checkbox = page.getByLabel(/per WhatsApp erhalten/)
    if (await checkbox.count()) await expect(checkbox).not.toBeChecked()
  })
})
