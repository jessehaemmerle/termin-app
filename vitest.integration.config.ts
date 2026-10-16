import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

// Integrationstests gegen eine echte PostgreSQL-Testdatenbank:
//   TEST_DATABASE_URL=postgresql://…/termin_test npm run test:integration
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://termin:termin@localhost:5432/termin_test',
      APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      PLATFORM_BASE_URL: 'http://localhost:3000',
    },
  },
})
