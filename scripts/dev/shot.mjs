// Screenshot-Helfer für die Entwicklung: node scripts/dev/shot.mjs <url> <datei> [breite]
import { chromium } from '@playwright/test'
const [url, file, width = '390'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(url, { waitUntil: 'networkidle' })
await page.screenshot({ path: file, fullPage: true })
if (errors.length) console.log('Konsolenfehler:\n' + errors.join('\n'))
await browser.close()
