// node scripts/dev/admin-shot.mjs <host> <email> <pfad> <datei> [breite]
import { chromium } from '@playwright/test'
const [host, email, path, file, width = '390'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`http://${host}/admin/login`)
await page.getByLabel('E-Mail-Adresse').fill(email)
await page.getByLabel('Passwort').fill('demo-passwort-123')
await page.getByRole('button', { name: 'Anmelden' }).click()
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 })
await page.goto(`http://${host}${path}`, { waitUntil: 'networkidle' })
await page.screenshot({ path: file, fullPage: true })
console.log('URL', page.url())
if (errors.length) console.log('Fehler:\n' + errors.join('\n'))
await browser.close()
