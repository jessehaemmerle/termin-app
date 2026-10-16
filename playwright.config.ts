import { defineConfig, devices } from '@playwright/test'

// E2E-Tests gegen einen Produktions-Build:
//   npm run build && npm run test:e2e
// Die Demo-Daten werden vor dem Lauf neu angelegt (prisma/seed.ts).
const PORT = Number(process.env.E2E_PORT ?? 3200)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-AT',
    timezoneId: 'Europe/Vienna',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/internal/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PLATFORM_BASE_URL: `http://localhost:${PORT}`, WHATSAPP_DRY_RUN: 'true', COOKIE_SECURE: 'false' },
  },
})
