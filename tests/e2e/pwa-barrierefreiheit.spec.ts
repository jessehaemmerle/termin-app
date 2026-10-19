import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { local, tenant, tenantHeaders, staffLogin } from './helpers'

test.describe('PWA', () => {
  test('liefert ein Manifest pro Betrieb und registriert den Service Worker', async ({ page, request }) => {
    await page.goto(tenant('mayer', '/'))
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBe('/manifest.webmanifest')
    const manifest = await (await request.get(local(href!), { headers: tenantHeaders('mayer') })).json()
    expect(manifest).toMatchObject({ name: 'Friseur Mayer', display: 'standalone', start_url: '/', lang: 'de-AT' })
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
    const icon = await request.get(local(manifest.icons[0].src), { headers: tenantHeaders('mayer') })
    expect(icon.headers()['content-type']).toBe('image/png')
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      return reg.active?.scriptURL ?? null
    })
    expect(registered).toContain('/sw.js')

    await page.goto(tenant('mayer', '/admin/login'))
    expect(await page.locator('link[rel="manifest"]').getAttribute('href')).toBe('/admin/manifest.webmanifest')
  })
})

const pages = [
  ['Startseite', '/'],
  ['Leistung wählen', '/buchen'],
  ['Kurse', '/kurse'],
  ['Datenschutz', '/datenschutz'],
  ['Impressum', '/impressum'],
  ['Kundenkonto anmelden', '/konto/anmelden'],
  ['Kundenkonto anlegen', '/konto/registrieren'],
  ['Team-Anmeldung', '/admin/login'],
] as const

test.describe('Barrierefreiheit (WCAG 2.1 AA, axe)', () => {
  for (const [name, path] of pages) {
    test(name, async ({ page }) => {
      await page.goto(tenant('mayer', path))
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
    })
  }

  test('Terminauswahl und Formular', async ({ page }) => {
    await page.goto(tenant('mayer', '/buchen'))
    await page.getByRole('link', { name: /Herrenhaarschnitt/ }).click()
    await page.getByRole('link', { name: /Keine Präferenz/ }).click()
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
    await page.getByRole('link', { name: /Uhr wählen/ }).first().click()
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
  })

  test('Verwaltung: Heute und Kalender', async ({ page }) => {
    await staffLogin(page, 'huber', 'chef@huber.example')
    for (const path of ['/admin', '/admin/kalender', '/admin/einstellungen/darstellung']) {
      await page.goto(tenant('huber', path))
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${path} ${v.id}`)).toEqual([])
    }
  })
})
