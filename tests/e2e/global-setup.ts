import { spawnSync } from 'node:child_process'

export default function globalSetup() {
  const result = spawnSync('npx', ['tsx', '--env-file-if-exists=.env', 'prisma/seed.ts'], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('Demo-Daten konnten nicht angelegt werden.')
}
