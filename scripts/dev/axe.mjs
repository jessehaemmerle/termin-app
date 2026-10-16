import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const base = process.env.BASE ?? 'http://mayer.localhost:3200'
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 412, height: 915 } })
const page = await context.newPage()
for (const path of process.argv.slice(2)) {
  await page.goto(base + path, { waitUntil: 'load' })
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  for (const v of r.violations.filter((v) => ['serious', 'critical'].includes(v.impact))) {
    console.log(`${path} [${v.impact}] ${v.id}: ${v.help}`)
    for (const n of v.nodes.slice(0, 3)) console.log('   ', n.target.join(' '), '|', (n.failureSummary ?? '').split('\n').slice(1, 2).join(' ').slice(0, 160))
  }
}
await browser.close()
