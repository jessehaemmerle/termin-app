import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const [host, email, ...paths] = process.argv.slice(2)
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
await page.goto(`http://${host}/admin/login`)
await page.getByLabel('E-Mail-Adresse').fill(email)
await page.getByLabel('Passwort').fill('demo-passwort-123')
await page.getByRole('button', { name: 'Anmelden' }).click()
await page.waitForURL((u) => !u.pathname.endsWith('/login'))
for (const path of paths) {
  await page.goto(`http://${host}${path}`, { waitUntil: 'load' })
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  for (const v of r.violations) {
    console.log(`${path} [${v.impact}] ${v.id}`)
    for (const n of v.nodes.slice(0, 4)) console.log('   ', n.target.join(' '), '|', (n.failureSummary ?? '').split('\n').slice(1, 2).join(' ').slice(0, 180))
  }
}
await browser.close()
